import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Request
import redis

from schemas.livekit import LiveKitTokenRequest, LiveKitTokenResponse, LiveKitRoomResponse
from core.permissions import get_current_user, instructor_or_admin_required
from core.config import settings
from database.room_db import get_room_by_id
from database.livekit_token_db import (
    save_livekit_token, revoke_token, revoke_user_tokens_in_room
)
from services.livekit_service import livekit_service

router = APIRouter()

def _get_redis_client():
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

@router.post("/tokens", response_model=LiveKitTokenResponse)
async def generate_livekit_token(
    token_req: LiveKitTokenRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cấp phát Token kết nối máy chủ LiveKit SFU để truyền/nhận video stream và ghi nhận kiểm toán CSDL"""
    room = get_room_by_id(token_req.room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
        
    room_name = room.get("livekit_room_name") or f"room_{room['room_code']}"
    participant_identity = f"user_{current_user['user_id']}"
    
    # Sinh viên publish webcam của mình và subscribe; Giảng viên subscribe toàn bộ grid
    token = livekit_service.generate_token(
        room_name=room_name,
        participant_identity=participant_identity,
        participant_name=current_user["full_name"],
        can_publish=True,
        can_subscribe=True
    )
    
    # Ghi nhận token vào bảng LiveKitTokens để quản lý thu hồi khi cần thiết
    expires_at = datetime.utcnow() + timedelta(hours=6)
    try:
        save_livekit_token(
            room_id=token_req.room_id,
            user_id=current_user["user_id"],
            token=token,
            participant_identity=participant_identity,
            expires_at=expires_at
        )
    except Exception as e:
        print(f"Lưu ý: Không thể lưu token LiveKit vào CSDL ({e})")
    
    return {
        "token": token,
        "server_url": settings.LIVEKIT_URL,
        "participant_identity": participant_identity,
        "room_name": room_name
    }

@router.post("/tokens/revoke", status_code=status.HTTP_200_OK)
async def revoke_tokens_endpoint(
    data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Thu hồi quyền truyền phát video của sinh viên khi bị giám thị đình chỉ/trục xuất"""
    room_id = data.get("room_id")
    student_id = data.get("student_id")
    if not room_id or not student_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Yêu cầu cung cấp room_id và student_id")
        
    revoked_count = revoke_user_tokens_in_room(int(room_id), int(student_id))
    
    # Phát tín hiệu cắt stream qua Redis Pub/Sub
    try:
        r = _get_redis_client()
        r.publish("ws_updates", json.dumps({
            "type": "token_revoked",
            "room_id": int(room_id),
            "student_id": int(student_id)
        }))
        r.close()
    except Exception:
        pass
        
    return {"status": "success", "revoked_tokens_count": revoked_count}

@router.post("/webhook")
async def livekit_webhook(request: Request):
    """Tiếp nhận sự kiện thời gian thực từ LiveKit SFU (participant_joined, participant_left, track_published)"""
    try:
        body = await request.body()
        data = json.loads(body.decode("utf-8"))
        
        event = data.get("event")
        room = data.get("room", {})
        participant = data.get("participant", {})
        room_name = room.get("name")
        identity = participant.get("identity")

        if event and room_name:
            try:
                r = _get_redis_client()
                event_payload = {
                    "type": "livekit_stream_event",
                    "event": event,
                    "room_name": room_name,
                    "identity": identity,
                    "timestamp": datetime.now().isoformat()
                }
                r.publish("ws_updates", json.dumps(event_payload))
                r.close()
            except Exception:
                pass

        return {"status": "received"}
    except Exception as e:
        return {"status": "ignored", "error": str(e)}

@router.post("/rooms", status_code=status.HTTP_201_CREATED)
async def create_livekit_room(
    data: Dict[str, str],
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Khởi tạo phòng LiveKit SFU"""
    room_name = data.get("room_name")
    if not room_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thiếu trường room_name")
    return livekit_service.create_room(room_name)

@router.delete("/rooms/{room_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_livekit_room(
    room_name: str,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Đóng phòng LiveKit SFU"""
    livekit_service.delete_room(room_name)
    return None
