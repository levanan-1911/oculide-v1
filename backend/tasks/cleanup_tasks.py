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
