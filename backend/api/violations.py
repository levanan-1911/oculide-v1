from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional, List, Dict, Any

from schemas.violation import (
    ViolationCreateRequest, SnapshotAnalyzeRequest, ViolationResponse, ViolationStatsItem
)
from core.permissions import get_current_user, instructor_or_admin_required
from database.violation_db import (
    create_violation, get_violations_by_session, get_violations_by_student,
    update_violation_review, get_student_violation_stats
)
from database.session_db import get_session_by_id
from database.room_db import get_room_by_id

router = APIRouter()

@router.post("", response_model=ViolationResponse, status_code=status.HTTP_201_CREATED)
async def log_violation(
    violation_data: ViolationCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Ghi nhận sự kiện vi phạm (từ browser hoặc AI Worker)"""
    session = get_session_by_id(violation_data.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")
        
    # Bỏ qua vi phạm nếu phòng là chế độ thực hành thông thường (classroom)
    room = get_room_by_id(session["room_id"])
    if room and room.get("room_type") == "classroom":
        return {
            "violation_id": 0,
            "session_id": violation_data.session_id,
            "student_id": session["student_id"],
            "violation_type": violation_data.violation_type,
            "severity": "low",
            "description": "Bỏ qua ghi nhận vi phạm trong chế độ lớp học (classroom)",
            "snapshot_url": None,
            "detected_at": session["started_at"],
            "is_reviewed": True,
            "reviewed_by": None,
            "reviewed_at": None
        }

    return create_violation(
        session_id=violation_data.session_id,
        student_id=session["student_id"],
        violation_type=violation_data.violation_type,
        severity=violation_data.severity,
        description=violation_data.description,
        snapshot_url=violation_data.snapshot_url
    )

@router.post("/analyze", status_code=status.HTTP_202_ACCEPTED)
async def analyze_webcam_snapshot(
    data: SnapshotAnalyzeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Tiếp nhận snapshot webcam và đẩy vào hàng đợi Celery AI Proctoring"""
    session = get_session_by_id(data.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")
        
    room = get_room_by_id(session["room_id"])
    if room and room.get("room_type") == "classroom":
        return {"status": "skipped", "message": "Classroom mode: AI proctoring disabled"}
        
    try:
        from celery_app import celery_app
        celery_app.send_task(
            "tasks.ai_proctoring_tasks.analyze_frame",
            args=[
                session["room_id"], session["student_id"], data.session_id,
                data.snapshot_data, data.is_typing, data.client_event
            ],
            queue="proctoring"
        )
        return {"status": "queued", "message": "Ảnh đã được đưa vào hàng đợi phân tích"}

    except Exception as e:
        return {"status": "accepted", "message": f"Snapshot accepted (local mode: {e})"}

@router.get("/session/{session_id}", response_model=List[ViolationResponse])
async def get_session_violations(
    session_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách các vi phạm trong một phiên thi (Chống IDOR)"""
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")
    if current_user["role"] == "student" and session["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem vi phạm của phiên thi khác")
    return get_violations_by_session(session_id)

@router.get("/student/{student_id}", response_model=List[ViolationResponse])
async def get_student_violations(
    student_id: int,
    room_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy các vi phạm của một sinh viên (Chống IDOR)"""
    if current_user["role"] == "student" and student_id != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem vi phạm của sinh viên khác")
    return get_violations_by_student(student_id, room_id=room_id)


@router.patch("/{violation_id}/review", response_model=ViolationResponse)
async def review_violation(
    violation_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giảng viên duyệt hoặc xác nhận sự kiện vi phạm"""
    updated = update_violation_review(violation_id, reviewed_by=current_user["user_id"])
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bản ghi vi phạm")
    return updated

@router.get("/room/{room_id}/stats", response_model=List[ViolationStatsItem])
async def get_room_violation_statistics(
    room_id: int,
    student_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Thống kê chi tiết các vi phạm theo loại và mức độ cảnh báo qua Stored Procedure"""
    return get_student_violation_stats(room_id, student_id)
