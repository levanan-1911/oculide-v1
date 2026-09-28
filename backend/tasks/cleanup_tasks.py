import json
from celery_app import celery_app
from core.database import get_db_cursor
from database.system_log_db import create_system_log
from database.snapshot_db import cleanup_old_snapshots

@celery_app.task(name="tasks.cleanup_tasks.auto_close_expired_rooms")
def auto_close_expired_rooms() -> int:
    """Tự động đóng các phòng thi đã vượt quá thời gian end_time"""
    sql = """
        UPDATE Rooms
        SET is_active = 0, updated_at = GETDATE()
        WHERE is_active = 1 AND end_time < GETDATE()
    """
    closed_count = 0
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(sql)
            closed_count = cursor.rowcount
            
        if closed_count > 0:
            create_system_log(
                log_level="info",
                module="Maintenance",
                message=f"Đã tự động đóng {closed_count} phòng thi/học quá hạn",
                extra_data={"closed_rooms_count": closed_count}
            )
    except Exception as e:
        create_system_log(
            log_level="error",
            module="Maintenance",
            message=f"Lỗi khi tự động đóng phòng thi: {str(e)}"
        )
    return closed_count

@celery_app.task(name="tasks.cleanup_tasks.terminate_abandoned_sessions")
def terminate_abandoned_sessions() -> int:
    """Đóng các phiên thi mồ côi (sinh viên không nộp bài khi phòng đã kết thúc)"""
    sql = """
        UPDATE s
        SET s.status = 'abandoned', s.ended_at = GETDATE()
        FROM Sessions s
        JOIN Rooms r ON s.room_id = r.room_id
        WHERE s.status = 'active' AND (r.is_active = 0 OR r.end_time < GETDATE())
    """
    abandoned_count = 0
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(sql)
            abandoned_count = cursor.rowcount
            
        if abandoned_count > 0:
            create_system_log(
                log_level="info",
                module="Maintenance",
                message=f"Đã cập nhật trạng thái abandoned cho {abandoned_count} phiên thi quá hạn",
                extra_data={"abandoned_sessions_count": abandoned_count}
            )
    except Exception as e:
        create_system_log(
            log_level="error",
            module="Maintenance",
            message=f"Lỗi khi xử lý phiên thi mồ côi: {str(e)}"
        )
    return abandoned_count

@celery_app.task(name="tasks.cleanup_tasks.prune_old_snapshots")
def prune_old_snapshots(retention_days: int = 30) -> int:
    """Dọn dẹp các snapshot ảnh webcam cũ hơn 30 ngày để giải phóng dung lượng đĩa"""
    try:
        deleted = cleanup_old_snapshots(days=retention_days)
        if deleted > 0:
            create_system_log(
                log_level="info",
                module="Maintenance",
                message=f"Đã xóa {deleted} ảnh snapshot cũ hơn {retention_days} ngày",
                extra_data={"deleted_snapshots_count": deleted}
            )
        return deleted
    except Exception as e:
        create_system_log(
            log_level="error",
            module="Maintenance",
            message=f"Lỗi khi dọn dẹp snapshot cũ: {str(e)}"
        )
        return 0

@celery_app.task(name="tasks.cleanup_tasks.reap_stuck_submissions")
def reap_stuck_submissions(timeout_seconds: int = 120, max_retries: int = 2) -> int:
    """
    Worker Watchdog: Tự động phát hiện và giải cứu các bài nộp bị kẹt ở trạng thái 'grading'
    khi worker bị crash đột tử (OOMKilled, Network Partition, Host Reboot).
    """
    import redis
    from core.config import settings
    from database.submission_db import get_stuck_submissions, mark_submission_failed, update_submission_status
    from tasks.grading_tasks import grade_submission

    stuck_list = []
    try:
        stuck_list = get_stuck_submissions(older_than_seconds=timeout_seconds)
    except Exception as e:
        create_system_log(
            log_level="error",
            module="WorkerWatchdog",
            message=f"Lỗi khi truy vấn bài nộp kẹt: {str(e)}"
        )
        return 0

    if not stuck_list:
        return 0

    # Kết nối Redis để theo dõi số lần retry của Watchdog và phát WebSocket event
    r = None
    try:
        if settings.REDIS_PASSWORD:
            r = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                socket_timeout=2
            )
        else:
            r = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                socket_timeout=2
            )
    except Exception:
        r = None

    reaped_count = 0
    for sub in stuck_list:
        sub_id = sub["submission_id"]
        room_id = sub.get("room_id")
        student_id = sub.get("student_id")

        retry_count = 1
        if r:
            try:
                retry_key = f"watchdog:retry:{sub_id}"
                retry_count = r.incr(retry_key)
                r.expire(retry_key, 3600)
            except Exception:
                retry_count = 1

        if retry_count <= max_retries:
            # Re-dispatch tác vụ chấm bài
            try:
                update_submission_status(sub_id, "pending")
                grade_submission.delay(
                    submission_id=sub_id,
                    question_id=sub["question_id"],
                    code_content=sub["code_content"],
                    language=sub["language"]
                )
                create_system_log(
                    log_level="warning",
                    module="WorkerWatchdog",
                    message=f"Phát hiện bài nộp ID {sub_id} bị kẹt >{timeout_seconds}s. Đã tự động re-dispatch (Lần {retry_count}/{max_retries})",
                    extra_data={"submission_id": sub_id, "retry_count": retry_count}
                )
                reaped_count += 1
            except Exception as re_err:
                create_system_log(
                    log_level="error",
                    module="WorkerWatchdog",
                    message=f"Lỗi khi re-dispatch bài nộp ID {sub_id}: {str(re_err)}"
                )
        else:
            # Đã vượt quá số lần retry cho phép -> Đánh dấu failed để không làm treo sinh viên
            err_msg = (
                f"Hệ thống tự phục hồi: Bài nộp bị gián đoạn quá trình chấm sau {max_retries} lần thử lại. "
                "Có thể do mã nguồn gây tràn bộ nhớ worker hoặc sự cố hệ thống đột ngột."
            )
            mark_submission_failed(sub_id, err_msg)
            create_system_log(
                log_level="error",
                module="WorkerWatchdog",
                message=f"Bài nộp ID {sub_id} kẹt quá {max_retries} lần. Đã tự động đánh dấu failed để bảo vệ hệ thống.",
                extra_data={"submission_id": sub_id, "retry_count": retry_count}
            )
            if r:
                try:
                    event = {
                        "type": "submission_result",
                        "room_id": room_id,
                        "student_id": student_id,
                        "submission_id": sub_id,
                        "status": "failed",
                        "error_message": err_msg
                    }
                    r.publish("ws_updates", json.dumps(event))
                except Exception:
                    pass
            reaped_count += 1

    if r:
        try:
            r.close()
        except Exception:
            pass

    return reaped_count

@celery_app.task(name="tasks.cleanup_tasks.reap_orphaned_sandbox_containers")
def reap_orphaned_sandbox_containers(max_age_seconds: int = 30) -> int:
    """
    Sandbox Orphan Reaper: Quét và tiêu diệt các container sandbox quá hạn hoặc mồ côi
    để giải phóng tài nguyên CPU, RAM và Inodes của máy chủ Host.
    """
    from services.docker_sandbox_service import sandbox_service
    try:
        killed_count = sandbox_service.cleanup_orphaned_containers(max_age_seconds=max_age_seconds)
        if killed_count > 0:
            create_system_log(
                log_level="info",
                module="SandboxReaper",
                message=f"Đã tiêu diệt và dọn dẹp {killed_count} container sandbox rác/mồ côi (> {max_age_seconds}s)",
                extra_data={"killed_containers": killed_count}
            )
        return killed_count
    except Exception as e:
        create_system_log(
            log_level="error",
            module="SandboxReaper",
            message=f"Lỗi khi dọn dẹp container sandbox mồ côi: {str(e)}"
        )
        return 0

