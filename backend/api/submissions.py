from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from schemas.submission import (
    SubmissionCreateRequest, CodeRunRequest, CodeRunResponse,
    SubmissionResponse, GradingResultResponse, SubmissionStatusUpdateRequest
)
from core.permissions import get_current_user, verify_room_access
from database.room_db import get_room_by_id, is_student_already_submitted
from database.template_db import is_question_valid_for_room
from database.question_db import get_question_by_id
from database.session_db import get_session_by_id
from database.violation_db import create_violation
from database.submission_db import (
    create_submission, get_submission_by_id, get_submissions_by_student,
    get_submissions_by_question, get_submissions_by_room,
    update_submission_status, get_grading_results
)
from services.grading_service import grade_submission_sync
from services.ide_behavior_service import analyze_ide_telemetry, find_room_plagiarism_pairs

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
    # Cho phép nộp bài nếu phòng đang hoạt động hoặc ca thi đang ở trạng thái diễn ra
    room_status = (room.get("status") or "").lower()
    if not room.get("is_active") and room_status not in ("dang_dien_ra", "in_progress", "ongoing"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phòng đã đóng, không nhận bài nộp")

    # Quy chế khảo thí: Không cho phép nộp lại sau khi đã hoàn thành nộp bài
    if is_student_already_submitted(submission_data.room_id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn đã hoàn thành và nộp bài thi cho phòng này. Không thể nộp lại bài làm mới."
        )
        
    question = get_question_by_id(submission_data.question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy câu hỏi")
    if not is_question_valid_for_room(submission_data.room_id, room.get("template_id"), submission_data.question_id):
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
            print(f"Warning: Không thể gửi task chấm bài đến Celery ({e}), chuyển sang chấm trực tiếp.")
            grade_submission_sync(
                submission["submission_id"],
                submission_data.question_id,
                submission_data.code_content,
                submission_data.language,
            )
            refreshed = get_submission_by_id(
                submission["submission_id"],
                include_hidden_details=(current_user["role"] != "student"),
            )
            if refreshed:
                submission = refreshed

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
        import logging
        logging.getLogger("oculide.sandbox").error("Docker Sandbox unavailable for custom run: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Hệ thống chấm tự động đang bận hoặc tạm gián đoạn, vui lòng thử lại sau",
        )

@router.get("/my", response_model=List[SubmissionResponse])
async def get_my_submissions(
    room_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy toàn bộ bài nộp của chính sinh viên đang đăng nhập"""
    return get_submissions_by_student(current_user["user_id"], room_id=room_id, skip=skip, limit=limit)

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy chi tiết bài nộp và kết quả chấm điểm"""
    include_hidden = current_user["role"] != "student"
    sub = get_submission_by_id(submission_id, include_hidden_details=include_hidden)
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
    sub = get_submission_by_id(submission_id, include_hidden_details=False)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bài nộp")
    if current_user["role"] == "student" and sub["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem kết quả bài nộp của người khác")
    return get_grading_results(submission_id, include_hidden_details=(current_user["role"] != "student"))

@router.get("/room/{room_id}/plagiarism")
async def check_room_plagiarism_endpoint(
    room_id: int,
    threshold: float = Query(0.78, ge=0.5, le=1.0),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Giảng viên kiểm tra độ tương đồng AST/Token giữa các bài nộp trong phòng thi"""
    if current_user["role"] not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ giảng viên mới được kiểm tra đạo văn")
    verify_room_access(room_id, current_user)
    subs = get_submissions_by_room(room_id)
    pairs = find_room_plagiarism_pairs(subs, threshold=threshold)
    return {
        "room_id": room_id,
        "threshold_pct": round(threshold * 100, 1),
        "total_submissions": len(subs),
        "flagged_pairs": pairs,
    }


class IDETelemetryRequest(BaseModel):
    session_id: int
    prev_len: int = Field(..., ge=0)
    curr_len: int = Field(..., ge=0)
    elapsed_sec: float = Field(..., gt=0)
    keystroke_count: int = Field(..., ge=0)


@router.post("/ide-telemetry")
async def report_ide_telemetry(
    payload: IDETelemetryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Nhận nhịp độ gõ phím (keystroke dynamics) và phát hiện code xuất hiện đột ngột"""
    session = get_session_by_id(payload.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")
    if current_user.get("role") == "student" and session["student_id"] != current_user.get("user_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền gửi telemetry cho phiên khác")

    analysis = analyze_ide_telemetry(
        payload.prev_len, payload.curr_len, payload.elapsed_sec, payload.keystroke_count
    )
    if analysis["is_suspicious_burst"]:
        room = get_room_by_id(session["room_id"])
        if not room or room.get("room_type") != "classroom":
            create_violation(
                session_id=payload.session_id,
                student_id=session["student_id"],
                violation_type="copy_paste",
                severity="high",
                description=analysis["reason"],
            )
    return analysis


@router.get("/room/{room_id}", response_model=List[SubmissionResponse])
async def get_submissions_by_room_endpoint(
    room_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Giảng viên xem toàn bộ bài nộp trong một phòng thi"""
    if current_user["role"] not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ giảng viên mới được xem toàn bộ bài nộp của phòng")
    verify_room_access(room_id, current_user)
    return get_submissions_by_room(room_id, skip=skip, limit=limit)


@router.get("/student/{student_id}", response_model=List[SubmissionResponse])
async def get_submissions_by_student_endpoint(
    student_id: int,
    room_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy lịch sử nộp bài của sinh viên"""
    if current_user["role"] == "student" and student_id != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem bài nộp của sinh viên khác")
    return get_submissions_by_student(student_id, room_id=room_id, skip=skip, limit=limit)

@router.get("/question/{question_id}", response_model=List[SubmissionResponse])
async def get_submissions_by_question_endpoint(
    question_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Giảng viên xem toàn bộ bài nộp cho một câu hỏi"""
    if current_user["role"] not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ giảng viên mới được xem toàn bộ bài nộp")
    return get_submissions_by_question(question_id, skip=skip, limit=limit)

@router.patch("/{submission_id}/status")
async def update_status_endpoint(
    submission_id: int,
    status_data: SubmissionStatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cập nhật thủ công trạng thái bài nộp"""
    if current_user["role"] not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không đủ quyền hạn")
    update_submission_status(submission_id, status_data.status)
    return {"message": "Cập nhật trạng thái thành công"}
