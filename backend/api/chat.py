from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional, List, Dict, Any

from schemas.chat import ChatMessageRequest, ChatMessageResponse
from core.permissions import get_current_user
from database.chat_db import create_message, get_messages_by_room, get_private_conversation
from database.room_db import get_room_by_id

router = APIRouter()

@router.post("", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_chat_message(
    chat_data: ChatMessageRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Gửi tin nhắn trong phòng (lưu CSDL bảng Messages)"""
    room = get_room_by_id(chat_data.room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
        
    return create_message(
        room_id=chat_data.room_id,
        sender_id=current_user["user_id"],
        recipient_id=chat_data.recipient_id,
        message_content=chat_data.message_content,
        message_type=chat_data.message_type
    )

@router.get("/room/{room_id}", response_model=List[ChatMessageResponse])
async def list_room_messages(
    room_id: int,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách tin nhắn thông báo chung trong phòng"""
    return get_messages_by_room(room_id, limit=limit)

@router.get("/conversation/{other_user_id}", response_model=List[ChatMessageResponse])
async def get_direct_messages(
    other_user_id: int,
    room_id: Optional[int] = None,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy lịch sử hội thoại riêng tư giữa 2 người dùng"""
    return get_private_conversation(
        user_id_1=current_user["user_id"],
        user_id_2=other_user_id,
        room_id=room_id,
        limit=limit
    )
