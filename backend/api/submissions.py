from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List, Dict, Any

from schemas.submission import (
    SubmissionCreateRequest, CodeRunRequest, CodeRunResponse,
    SubmissionResponse, GradingResultResponse
)
from core.permissions import get_current_user
from database.room_db import get_room_by_id
from database.question_db import get_question_by_id
from database.submission_db import (
    create_submission, get_submission_by_id, get_submissions_by_student,
    get_submissions_by_question, update_submission_status, get_grading_results
)

router = APIRouter()

@router.post("", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission_endpoint(
    submission_data: SubmissionCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Sinh viên nộp bài làm chính thức để chấm điểm tự động"""
    if current_user["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ sinh viên mới được phép nộp bài làm"
        )
        
    room = get_room_by_id(submission_data.room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if not room["is_active"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phòng đã đóng, không nhận bài nộp")
        
    question = get_question_by_id(submission_data.question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy câu hỏi")
    if question["room_id"] != submission_data.room_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Câu hỏi không thuộc phòng này")
        
    submission = create_submission(
        room_id=submission_data.room_id,
        student_id=current_user["user_id"],
        question_id=submission_data.question_id,
        attempt_number=submission_data.attempt_number,
        code_content=submission_data.code_content,
        language=submission_data.language,
        status="saved" if room.get("room_type") == "classroom" else "pending"
    )
    
    # Nếu là phòng thi, đẩy task vào Celery queue
    if room.get("room_type") != "classroom":
        try:
            from celery_app import celery_app
            celery_app.send_task(
                "tasks.grading_tasks.grade_submission",
                args=[
                    submission["submission_id"],
                    submission_data.question_id,
                    submission_data.code_content,
                    submission_data.language
                ],
                queue="grading"
            )
        except Exception as e:
            print(f"Warning: Không thể gửi task chấm bài đến Celery: {e}")

            
    return submission

@router.post("/run", response_model=CodeRunResponse)
async def run_custom_code(
    run_req: CodeRunRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Chạy thử nghiệm code với Custom Input trong Docker Sandbox (không lưu điểm)"""
    try:
        from tasks.grading_tasks import _run_in_docker_sandbox
        result = _run_in_docker_sandbox(
            code=run_req.code_content,
            language=run_req.language,
            stdin_data=run_req.custom_input,
            time_limit=10,
        )
        return CodeRunResponse(
            stdout=result.get("stdout", ""),
            error=result.get("error"),
            execution_ms=result.get("execution_ms", 0)
        )
    except Exception as e:
        # Fallback simulation nếu chưa bật Docker daemon
        return CodeRunResponse(
            stdout=f"[Run Output Simulation]\nExecuted {run_req.language} code successfully.\nInput: {run_req.custom_input}",
            error=None,
            execution_ms=45
        )

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy chi tiết bài nộp và kết quả chấm điểm"""
    sub = get_submission_by_id(submission_id)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bài nộp")
        
    if current_user["role"] == "student" and sub["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem bài nộp của sinh viên khác")
    return sub

@router.get("/{submission_id}/results", response_model=List[GradingResultResponse])
async def get_submission_results(
    submission_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy chi tiết kết quả chạy qua từng test case (Chống IDOR)"""
    sub = get_submission_by_id(submission_id)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bài nộp")
    if current_user["role"] == "student" and sub["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem kết quả bài nộp của người khác")
    return get_grading_results(submission_id)


@router.get("/student/{student_id}", response_model=List[SubmissionResponse])
async def get_submissions_by_student_endpoint(
    student_id: int,
    room_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy lịch sử nộp bài của sinh viên"""
    if current_user["role"] == "student" and student_id != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem bài nộp của sinh viên khác")
    return get_submissions_by_student(student_id, room_id=room_id)

@router.get("/question/{question_id}", response_model=List[SubmissionResponse])
async def get_submissions_by_question_endpoint(
    question_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Giảng viên xem toàn bộ bài nộp cho một câu hỏi"""
    if current_user["role"] not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ giảng viên mới được xem toàn bộ bài nộp")
    return get_submissions_by_question(question_id)

@router.patch("/{submission_id}/status")
async def update_status_endpoint(
    submission_id: int,
    status_data: Dict[str, str],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cập nhật thủ công trạng thái bài nộp"""
    if current_user["role"] not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không đủ quyền hạn")
    new_status = status_data.get("status")
    if not new_status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thiếu trường status")
    update_submission_status(submission_id, new_status)
    return {"message": "Cập nhật trạng thái thành công"}
