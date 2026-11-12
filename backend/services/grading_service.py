from typing import Dict, Any
from database.submission_db import (
    get_submission_by_id,
    update_submission_status,
    save_grading_results,
)
from database.question_db import get_question_by_id
from database.system_log_db import create_system_log
from core.config import settings
from services.docker_sandbox_service import sandbox_service


def grade_submission_sync(
    submission_id: int,
    question_id: int,
    code_content: str,
    language: str,
) -> Dict[str, Any]:
    """
    Chấm điểm đồng bộ (không phụ thuộc Celery) dùng DockerSandboxService
    (tự fallback sang Subprocess Runner nếu Docker chưa bật).
    """
    update_submission_status(submission_id, "grading")

    submission = get_submission_by_id(submission_id)
    if not submission:
        create_system_log(
            log_level="error",
            module="AutoGrader",
            message=f"Không tìm thấy bài nộp ID {submission_id} khi tiến hành chấm bài",
        )
        return {"status": "failed", "error": "Submission not found"}

    question = get_question_by_id(question_id)
    if not question:
        update_submission_status(submission_id, "failed")
        return {"status": "failed", "error": "Question not found"}

    test_cases = question.get("test_cases", [])
    time_limit_ms = question.get("time_limit_ms") or 2000
    time_limit_per_tc = max(1, min(int(time_limit_ms / 1000) + 1, settings.SANDBOX_TIME_LIMIT_S))
    mem_limit_mb = question.get("memory_limit_mb") or 128

    results_list = []
    total_earned_points = 0.0

    try:
        for tc in test_cases:
            tc_input = tc.get("input_data", "")
            tc_expected = tc.get("expected_output", "")
            tc_points = float(tc.get("points", 0.0))

            exec_result = sandbox_service.execute_code(
                code=code_content,
                language=language,
                stdin_data=tc_input,
                time_limit=time_limit_per_tc,
                memory_limit_mb=mem_limit_mb,
            )

            is_match = (
                exec_result.get("is_passed", False)
                and sandbox_service.compare_output(exec_result.get("stdout", ""), tc_expected)
            )
            earned = tc_points if is_match else 0.0
            total_earned_points += earned

            results_list.append(
                {
                    "test_case_id": tc["test_case_id"],
                    "is_passed": is_match,
                    "actual_output": (exec_result.get("stdout") or "")[:2000],
                    "execution_time_ms": exec_result.get("execution_ms", 0.0),
                    "memory_used_mb": exec_result.get("memory_mb", 0.0),
                    "error_message": exec_result.get("error"),
                    "points_earned": earned,
                }
            )

        save_grading_results(submission_id, results_list, final_status="completed")
        return {
            "status": "completed",
            "submission_id": submission_id,
            "total_points": total_earned_points,
            "passed_tests": len([r for r in results_list if r["is_passed"]]),
            "total_tests": len(results_list),
        }
    except Exception as e:
        update_submission_status(submission_id, "failed")
        create_system_log(
            log_level="error",
            module="AutoGrader",
            message=f"Lỗi khi chấm bài nộp ID {submission_id}: {str(e)}",
            extra_data={"submission_id": submission_id, "error": str(e)},
        )
        return {"status": "failed", "error": str(e)}
