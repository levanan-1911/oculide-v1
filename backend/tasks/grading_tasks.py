import json
import redis
from typing import Dict, Any, Optional

from celery_app import celery_app
from core.config import settings
from database.submission_db import (
    get_submission_by_id, update_submission_status, save_grading_results
)
from database.question_db import get_question_by_id
from database.system_log_db import create_system_log
from services.docker_sandbox_service import sandbox_service

def _get_redis_client():
    """Tạo kết nối đồng bộ đến Redis phục vụ việc publish tin nhắn WebSocket"""
    if settings.REDIS_PASSWORD:
        return redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            db=settings.REDIS_DB,
            socket_timeout=2
        )
    return redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        socket_timeout=2
    )

def _run_in_docker_sandbox(
    code: str,
    language: str,
    stdin_data: str = "",
    time_limit: int = 10
) -> Dict[str, Any]:
    """
    Hàm thực thi mã nguồn tùy biến cho endpoint /run (không lưu điểm vào CSDL).
    Trả về định dạng {"stdout": str, "error": Optional[str], "execution_ms": float}.
    """
    res = sandbox_service.execute_code(
        code=code,
        language=language,
        stdin_data=stdin_data,
        time_limit=time_limit,
        memory_limit_mb=128
    )
    return {
        "stdout": res.get("stdout", ""),
        "error": (res.get("stderr") or "").strip() or res.get("error"),
        "execution_ms": int(res.get("execution_ms", 0))
    }

@celery_app.task(name="tasks.grading_tasks.grade_submission", bind=True, max_retries=2)
def grade_submission(
    self,
    submission_id: int,
    question_id: int,
    code_content: str,
    language: str
) -> Dict[str, Any]:
    """
    Task Celery chấm điểm bài nộp chính thức trong Docker Sandbox:
    1. Cập nhật trạng thái 'grading'.
    2. Chạy qua toàn bộ test cases (ẩn + công khai).
    3. Lưu chi tiết GradingResults nguyên khối.
    4. Bắn sự kiện qua kênh Redis 'ws_updates' để cập nhật giao diện sinh viên & giám thị.
    """
    # 1. Chuyển trạng thái sang 'grading'
    update_submission_status(submission_id, "grading")
    
    submission = get_submission_by_id(submission_id)
    if not submission:
        create_system_log(
            log_level="error",
            module="AutoGrader",
            message=f"Không tìm thấy bài nộp ID {submission_id} khi tiến hành chấm bài"
        )
        return {"status": "failed", "error": "Submission not found"}

    question = get_question_by_id(question_id)
    if not question:
        update_submission_status(submission_id, "failed")
        return {"status": "failed", "error": "Question not found"}

    test_cases = question.get("test_cases", [])
    q_max_points = float(question.get("max_points") or 10.0)
    raw_tc_sum = sum(float(tc.get("points") or 0.0) for tc in test_cases)
    scale_factor = (
        (q_max_points / raw_tc_sum)
        if raw_tc_sum > 0
        else (q_max_points / len(test_cases) if test_cases else 1.0)
    )
    time_limit_ms = question.get("time_limit_minutes") or 2000
    time_limit_per_tc = max(1, min(int(time_limit_ms / 1000) + 1, settings.SANDBOX_TIME_LIMIT_S))
    mem_limit_mb = question.get("memory_limit_mb") or 128

    results_list = []
    total_earned_points = 0.0

    try:
        # 2. Chạy vòng lặp qua từng Test Case
        for tc in test_cases:
            tc_input = tc.get("input_data", "")
            tc_expected = tc.get("expected_output", "")
            raw_tc_pts = float(tc.get("points") or 0.0)
            tc_points = (raw_tc_pts * scale_factor) if raw_tc_sum > 0 else scale_factor

            exec_result = sandbox_service.execute_code(
                code=code_content,
                language=language,
                stdin_data=tc_input,
                time_limit=time_limit_per_tc,
                memory_limit_mb=mem_limit_mb
            )

            # So khớp kết quả
            is_match = (
                exec_result["is_passed"]
                and sandbox_service.compare_output(exec_result["stdout"], tc_expected)
            )

            earned = round(tc_points, 4) if is_match else 0.0
            total_earned_points += earned

            results_list.append({
                "test_case_id": tc["test_case_id"],
                "is_passed": is_match,
                "actual_output": exec_result.get("stdout", "")[:2000], # Giới hạn lưu tối đa 2000 ký tự
                "execution_time_ms": exec_result.get("execution_ms", 0.0),
                "memory_used_mb": exec_result.get("memory_mb", 0.0),
                "error_message": exec_result.get("error"),
                "points_earned": earned,
            })

        # 3. Lưu kết quả nguyên khối vào CSDL
        save_grading_results(submission_id, results_list, final_status="completed")

        # 4. Phát sự kiện thời gian thực qua Redis Pub/Sub
        try:
            r = _get_redis_client()
            room_id = submission.get("room_id")
            student_id = submission.get("student_id")
            max_points = question.get("max_points") or 10.0
            score_pct = round((total_earned_points / max_points) * 100, 2) if max_points > 0 else 0.0

            # Thông báo kết quả cho sinh viên
            event_student = {
                "type": "submission_result",
                "room_id": room_id,
                "student_id": student_id,
                "submission_id": submission_id,
                "status": "completed",
                "total_points": total_earned_points,
                "score_percentage": score_pct,
                "passed_count": len([r for r in results_list if r["is_passed"]]),
                "total_testcases": len(results_list)
            }
            r.publish("ws_updates", json.dumps(event_student))

            # Thông báo cập nhật bảng điểm cho Giám thị
            event_scoreboard = {
                "type": "scoreboard_update",
                "room_id": room_id,
                "student_id": student_id
            }
            r.publish("ws_updates", json.dumps(event_scoreboard))
            r.close()
        except Exception as ws_err:
            print(f"Warning: Không thể bắn WebSocket event sau khi chấm bài: {ws_err}")

        return {
            "status": "completed",
            "submission_id": submission_id,
            "total_points": total_earned_points,
            "passed_tests": len([r for r in results_list if r["is_passed"]]),
            "total_tests": len(results_list)
        }

    except Exception as e:
        # Phòng thủ lỗi: Không bao giờ để bài nộp bị kẹt vô hạn ở trạng thái 'grading'
        update_submission_status(submission_id, "failed")
        create_system_log(
            log_level="error",
            module="AutoGrader",
            message=f"Lỗi ngoại lệ khi chấm bài nộp ID {submission_id}: {str(e)}",
            extra_data={"submission_id": submission_id, "error": str(e)}
        )
        raise self.retry(exc=e, countdown=5)
