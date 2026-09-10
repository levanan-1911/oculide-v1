from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List, Dict, Any
from datetime import datetime

from schemas.room import (
    RoomCreateRequest, RoomUpdateRequest, RoomResponse, PublicRoomResponse,
    RoomDashboardResponse, RoomDashboardStudentItem, RoomEnrollmentRequest
)
from core.permissions import get_current_user, instructor_or_admin_required
from database.room_db import (
    create_room, get_room_by_id, get_room_by_code, get_rooms_by_instructor,
    get_all_rooms, update_room, delete_room, get_room_dashboard_data
)
from database.scoreboard_db import get_room_scoreboard
from database.enrollment_db import enroll_student, get_enrollments_by_room, remove_enrollment
from database.session_db import get_sessions_by_room
from database.violation_db import get_violations_by_session
from services.livekit_service import livekit_service
from core.config import settings

router = APIRouter()

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_new_room(
    room_data: RoomCreateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Tạo phòng thi hoặc phòng thực hành mới"""
    if get_room_by_code(room_data.room_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã phòng (room_code) đã tồn tại")
    
    livekit_room_name = f"room_{room_data.room_code}"
    # Khởi tạo LiveKit Room nếu chế độ thi yêu cầu video
    livekit_service.create_room(livekit_room_name)
    
    return create_room(
        room_code=room_data.room_code,
        room_name=room_data.room_name,
        room_type=room_data.room_type,
        instructor_id=current_user["user_id"],
        description=room_data.description,
        start_time=room_data.start_time,
        end_time=room_data.end_time,
        duration_minutes=room_data.duration_minutes,
        max_attempts=room_data.max_attempts,
        passcode=room_data.passcode,
        livekit_room_name=livekit_room_name
    )

@router.get("", response_model=List[RoomResponse])
async def list_rooms(
    room_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách các phòng khả dụng"""
    if current_user["role"] == "admin":
        return get_all_rooms(skip=skip, limit=limit, room_type=room_type)
    elif current_user["role"] == "instructor":
        return get_rooms_by_instructor(current_user["user_id"], skip=skip, limit=limit, room_type=room_type)
    else:
        # Sinh viên: Lấy danh sách phòng công khai
        return get_all_rooms(skip=skip, limit=limit, room_type=room_type)

@router.get("/public/{room_code}", response_model=PublicRoomResponse)
async def get_public_room_info(room_code: str):
    """Lấy thông tin công khai của phòng thi trước khi đăng nhập hoặc nhập passcode"""
    room = get_room_by_code(room_code)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    return {
        "room_id": room["room_id"],
        "room_code": room["room_code"],
        "room_name": room["room_name"],
        "room_type": room["room_type"],
        "start_time": room["start_time"],
        "end_time": room["end_time"],
        "duration_minutes": room["duration_minutes"],
        "requires_passcode": bool(room.get("passcode"))
    }

@router.get("/{room_id}", response_model=RoomResponse)
async def get_room_details(
    room_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Xem cấu hình chi tiết của phòng"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    return room

@router.put("/{room_id}", response_model=RoomResponse)
async def update_room_details(
    room_id: int,
    room_data: RoomUpdateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Chỉnh sửa cấu hình phòng"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền chỉnh sửa phòng này")
    
    updated = update_room(room_id, **room_data.model_dump(exclude_unset=True))
    return updated

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_room(
    room_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Xóa phòng thi"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa phòng này")
    
    if room.get("livekit_room_name"):
        livekit_service.delete_room(room["livekit_room_name"])
    delete_room(room_id)
    return None

@router.get("/{room_id}/dashboard", response_model=RoomDashboardResponse)
async def get_room_dashboard(
    room_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Dữ liệu Panoptic Grid View tổng hợp giám sát phòng thi thời gian thực (Zero N+1 query)"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
        
    dashboard_data = get_room_dashboard_data(room_id)
    students_list = [
        RoomDashboardStudentItem(
            student_id=st["student_id"],
            student_name=st.get("student_name") or f"Student #{st['student_id']}",
            status=st.get("status", "offline"),
            violation_count=st.get("violation_count", 0),
            duration_minutes=st.get("duration_minutes", 0),
            last_snapshot_url=st.get("last_snapshot_url")
        )
        for st in dashboard_data
    ]
        
    return {
        "room_id": room["room_id"],
        "room_code": room["room_code"],
        "room_name": room["room_name"],
        "room_type": room["room_type"],
        "active_students_count": len([st for st in students_list if st.status == "active"]),
        "students": students_list
    }

@router.get("/{room_id}/scoreboard")
async def get_scoreboard(
    room_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Bảng điểm thời gian thực tổng hợp kết quả của sinh viên trong phòng"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    return get_room_scoreboard(room_id)

@router.get("/{room_id}/config")
async def get_room_config(
    room_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy cấu hình runtime môi trường phòng (danh sách ngôn ngữ, giới hạn sandbox)"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    return {
        "room_id": room["room_id"],
        "room_code": room["room_code"],
        "room_name": room["room_name"],
        "room_type": room["room_type"],
        "duration_minutes": room["duration_minutes"],
        "max_attempts": room["max_attempts"],
        "allowed_languages": ["python", "cpp", "java"],
        "ai_proctoring_enabled": room["room_type"] == "exam",
        "sandbox_limits": {
            "time_limit_seconds": settings.SANDBOX_TIME_LIMIT_S,
            "memory_limit": settings.SANDBOX_MEM_LIMIT
        }
    }


@router.get("/{room_id}/enrollments")
async def list_room_enrollments(
    room_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Lấy danh sách sinh viên ghi danh trong phòng"""
    return get_enrollments_by_room(room_id)

@router.post("/{room_id}/enrollments")
async def add_room_enrollments(
    room_id: int,
    data: RoomEnrollmentRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Ghi danh danh sách sinh viên vào phòng"""
    added = 0
    for sid in data.student_ids:
        try:
            enroll_student(room_id, sid, enrolled_by=current_user["user_id"])
            added += 1
        except Exception:
            pass
    return {"message": f"Đã ghi danh thành công {added} sinh viên"}

@router.delete("/{room_id}/enrollments/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_student_from_room(
    room_id: int,
    student_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Xóa sinh viên khỏi phòng"""
    remove_enrollment(room_id, student_id)
    return None
