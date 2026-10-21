from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List

from schemas.device_check import DeviceCheckCreateRequest, DeviceCheckResponse
from core.permissions import get_current_user, instructor_or_admin_required
from database.device_check_db import (
    save_device_check,
    get_device_check_by_session,
    get_device_checks_by_room
)
from database.session_db import get_session_by_id

router = APIRouter()

@router.post("", response_model=DeviceCheckResponse, status_code=status.HTTP_200_OK)
async def submit_device_check(
    data: DeviceCheckCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Gửi kết quả kiểm tra thiết bị (Webcam, Mic, Mạng) trước khi bắt đầu thi"""
    session = get_session_by_id(data.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên làm bài")
        
    if current_user["role"] == "student" and session["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền cập nhật phiên thi này")
        
    result = save_device_check(
        session_id=data.session_id,
        student_id=session["student_id"],
        camera_status=data.camera_status,
        mic_status=data.mic_status,
        network_latency_ms=data.network_latency_ms,
        os_info=data.os_info,
        browser_info=data.browser_info,
        is_passed=data.is_passed
    )
    return result

@router.get("/session/{session_id}", response_model=DeviceCheckResponse)
async def get_session_device_check(
    session_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy kết quả kiểm tra thiết bị của một phiên thi cụ thể"""
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên làm bài")
        
    if current_user["role"] == "student" and session["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem thông tin phiên thi này")
        
    result = get_device_check_by_session(session_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chưa có kết quả kiểm tra thiết bị cho phiên này")
    return result

@router.get("/room/{room_id}", response_model=List[Dict[str, Any]])
async def get_room_device_checks(
    room_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giám thị theo dõi trạng thái thiết bị của toàn bộ sinh viên trong phòng"""
    return get_device_checks_by_room(room_id)
