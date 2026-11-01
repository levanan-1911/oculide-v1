from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional

from schemas.support import SupportRequestCreate, SupportStatusUpdate, SupportRequestResponse
from core.permissions import get_current_user, instructor_or_admin_required
from database.support_db import (
    create_support_request,
    get_support_request_by_id,
    get_support_requests_by_student,
    get_support_requests_by_room,
    update_support_request_status
)
from database.room_db import get_room_by_id
from websocket.connection_manager import manager

router = APIRouter()

@router.post("", response_model=SupportRequestResponse, status_code=status.HTTP_201_CREATED)
async def submit_support_request(
    data: SupportRequestCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Sinh viên gửi yêu cầu hỗ trợ kỹ thuật khẩn cấp trong phòng thi/thực hành"""
    room = get_room_by_id(data.room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
        
    request_data = create_support_request(
        room_id=data.room_id,
        student_id=current_user["user_id"],
        session_id=data.session_id,
        issue_type=data.issue_type,
        message=data.message
    )
    request_data["student_name"] = current_user.get("full_name")
    request_data["student_code"] = current_user.get("student_id")
    
    # Phát sự kiện Real-time thông báo cho giám thị phụ trách phòng
    try:
        await manager.broadcast_json(data.room_id, {
            "type": "support_request_alert",
            "data": request_data
        })
    except Exception:
        pass

    return request_data

@router.get("/my-requests", response_model=List[SupportRequestResponse])
async def list_my_support_requests(
    room_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Sinh viên xem danh sách các yêu cầu hỗ trợ kỹ thuật của mình"""
    return get_support_requests_by_student(current_user["user_id"], room_id=room_id)

@router.get("/room/{room_id}", response_model=List[SupportRequestResponse])
async def list_room_support_requests(
    room_id: int,
    status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giám thị / Giảng viên xem các yêu cầu cứu hộ trong phòng thi"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem yêu cầu hỗ trợ của phòng này")
    return get_support_requests_by_room(room_id, status_filter=status)

@router.patch("/{request_id}/status", response_model=SupportRequestResponse)
async def change_support_status(
    request_id: int,
    body: SupportStatusUpdate,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giám thị cập nhật trạng thái xử lý yêu cầu (in_progress, resolved, rejected)"""
    req = get_support_request_by_id(request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy yêu cầu hỗ trợ")
        
    room = get_room_by_id(req["room_id"])
    if current_user["role"] != "admin" and room and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xử lý yêu cầu của phòng này")

    updated = update_support_request_status(
        request_id=request_id,
        new_status=body.status,
        resolved_by=current_user["user_id"]
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy yêu cầu hỗ trợ")

    # Phát thông báo Real-time cập nhật trạng thái cho sinh viên trong phòng
    try:
        await manager.broadcast_json(req["room_id"], {
            "type": "support_status_update",
            "data": updated
        })
    except Exception:
        pass

    return updated
