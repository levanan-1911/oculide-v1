from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import Optional, List, Dict, Any

from schemas.session import SessionCreateRequest, SessionStatusUpdate, SessionResponse
from core.permissions import get_current_user, instructor_or_admin_required
from database.session_db import (
    create_session, get_session_by_id, get_sessions_by_room,
    get_sessions_by_student, update_session_status, end_session
)
from database.room_db import get_room_by_id

router = APIRouter()

from datetime import datetime

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    session_data: SessionCreateRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Bắt đầu phiên làm bài thi / học của sinh viên với ràng buộc máy trạng thái an toàn"""
    room = get_room_by_id(session_data.room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if not room["is_active"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phòng thi đã bị đóng")
        
    now = datetime.utcnow()
    # Kiểm tra khung giờ thi hợp lệ nếu là phòng thi (exam)
    if room.get("room_type") == "exam":
        if room.get("start_time") and now < room["start_time"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phòng thi chưa đến giờ bắt đầu")
        if room.get("end_time") and now > room["end_time"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phòng thi đã hết giờ làm bài")

    # 1. Chống spam sinh session rác: Nếu đã có phiên active, tiếp tục phiên hiện có
    active_sessions = get_sessions_by_student(current_user["user_id"], room_id=session_data.room_id, active_only=True)
    if active_sessions:
        return active_sessions[0]

    # 2. Kiểm soát giới hạn số lần làm bài (max_attempts)
    past_sessions = get_sessions_by_student(current_user["user_id"], room_id=session_data.room_id, active_only=False)
    max_attempts = room.get("max_attempts") or 1
    if len(past_sessions) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bạn đã sử dụng hết số lần tham gia thi cho phép ({len(past_sessions)}/{max_attempts})"
        )
        
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    return create_session(
        room_id=session_data.room_id,
        student_id=current_user["user_id"],
        ip_address=client_ip,
        user_agent=user_agent,
        browser_fingerprint=session_data.browser_fingerprint
    )

@router.get("/room/{room_id}", response_model=List[SessionResponse])
async def list_room_sessions(
    room_id: int,
    active_only: bool = False,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Lấy danh sách các phiên thi của toàn bộ sinh viên trong phòng"""
    return get_sessions_by_room(room_id, active_only=active_only)

@router.get("/student/{student_id}", response_model=List[SessionResponse])
async def list_student_sessions(
    student_id: int,
    room_id: Optional[int] = None,
    active_only: bool = False,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy lịch sử các phiên thi của sinh viên (Chống IDOR: sinh viên chỉ xem được của chính mình)"""
    if current_user["role"] == "student" and student_id != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem phiên của sinh viên khác")
    return get_sessions_by_student(student_id, room_id=room_id, active_only=active_only)

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session_details(
    session_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy thông tin chi tiết phiên thi (Chống IDOR)"""
    sess = get_session_by_id(session_id)
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")
    if current_user["role"] == "student" and sess["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập phiên thi của người khác")
    return sess

@router.patch("/{session_id}/status")
async def change_session_status(
    session_id: int,
    status_update: SessionStatusUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cập nhật trạng thái phiên thi (active, completed, terminated, abandoned)"""
    sess = get_session_by_id(session_id)
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")
    if current_user["role"] == "student" and sess["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền can thiệp phiên thi này")
    update_session_status(session_id, status_update.status)
    return {"message": f"Đã cập nhật trạng thái phiên thành '{status_update.status}'"}

@router.post("/{session_id}/end")
async def finish_session(
    session_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Kết thúc phiên làm bài thi (Chống IDOR)"""
    sess = get_session_by_id(session_id)
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")
    if current_user["role"] == "student" and sess["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền kết thúc phiên thi của người khác")
    end_session(session_id)
    return {"message": "Phiên thi đã kết thúc thành công"}

