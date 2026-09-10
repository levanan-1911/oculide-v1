import os
import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import redis.asyncio as redis_async

from core.config import settings, get_cors_origins
from api import auth, admin, rooms, questions, submissions, sessions, violations, chat, livekit
from websocket.connection_manager import manager
from database.chat_db import create_message

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Lắng nghe kênh Redis PubSub nhận sự kiện vi phạm, chấm bài, và stream từ Celery Workers
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} đang khởi động...")
    print(f"🔧 Debug Mode: {settings.DEBUG}")
    
    redis_client = None
    listener_task = None
    try:
        redis_client = redis_async.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
            db=settings.REDIS_DB,
            socket_timeout=5
        )
        
        async def redis_listener():
            while True:
                try:
                    pubsub = redis_client.pubsub()
                    await pubsub.subscribe("ws_updates")
                    async for message in pubsub.listen():
                        if message["type"] == "message":
                            try:
                                data = json.loads(message["data"])
                                room_id = data.get("room_id")
                                if room_id:
                                    await manager.broadcast_json(int(room_id), data)
                                elif data.get("type") == "livekit_stream_event":
                                    # Chuyển tiếp sự kiện stream LiveKit tới tất cả phòng đang mở
                                    for r_id in list(manager.active_connections.keys()):
                                        await manager.broadcast_json(r_id, data)
                            except (json.JSONDecodeError, Exception):
                                pass
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    print(f"Redis listener warning ({e}), thử kết nối lại sau 3 giây...")
                    await asyncio.sleep(3)
                
        listener_task = asyncio.create_task(redis_listener())
    except Exception as e:
        print(f"Lưu ý: Redis chưa sẵn sàng ({e}). Chạy chế độ độc lập.")
        
    yield
    
    # Shutdown
    print("🛑 Đang đóng ứng dụng...")
    if listener_task:
        listener_task.cancel()
    if redis_client:
        try:
            await redis_client.aclose()
        except Exception:
            pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend Core API cho hệ thống Oculide v1 (IEEE 830 Specification)",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

# Include all routers under /api/v1
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Authentication"])
app.include_router(admin.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["Admin Management"])
app.include_router(rooms.router, prefix=f"{settings.API_V1_PREFIX}/rooms", tags=["Rooms"])
app.include_router(questions.router, prefix=f"{settings.API_V1_PREFIX}/questions", tags=["Questions"])
app.include_router(submissions.router, prefix=f"{settings.API_V1_PREFIX}/submissions", tags=["Submissions"])
app.include_router(sessions.router, prefix=f"{settings.API_V1_PREFIX}/sessions", tags=["Sessions"])
app.include_router(violations.router, prefix=f"{settings.API_V1_PREFIX}/violations", tags=["Violations & AI Proctoring"])
app.include_router(chat.router, prefix=f"{settings.API_V1_PREFIX}/chat", tags=["Chat"])
app.include_router(livekit.router, prefix=f"{settings.API_V1_PREFIX}/livekit", tags=["LiveKit Streaming"])

# Tương thích ngược với tiền tố cũ /api/...
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication (Legacy)"], include_in_schema=False)
app.include_router(admin.router, prefix="/api/admin", tags=["Admin (Legacy)"], include_in_schema=False)
app.include_router(rooms.router, prefix="/api/rooms", tags=["Rooms (Legacy)"], include_in_schema=False)
app.include_router(questions.router, prefix="/api/questions", tags=["Questions (Legacy)"], include_in_schema=False)
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions (Legacy)"], include_in_schema=False)
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions (Legacy)"], include_in_schema=False)
app.include_router(violations.router, prefix="/api/violations", tags=["Violations (Legacy)"], include_in_schema=False)
app.include_router(chat.router, prefix="/api/chat", tags=["Chat (Legacy)"], include_in_schema=False)
app.include_router(livekit.router, prefix="/api/livekit", tags=["LiveKit (Legacy)"], include_in_schema=False)

# Cấu hình Mount phục vụ ảnh tĩnh Webcam Snapshots
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(os.path.join(uploads_dir, "snapshots"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


# WebSocket Endpoint Real-time (Được bảo vệ bằng JWT Authentication & RBAC)
@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: int,
    user_id: str,
    token: str = None
):
    # 1. Xác thực JWT Token bắt buộc
    if not token:
        # Hỗ trợ lấy token từ query params nếu chưa parse tự động
        token = websocket.query_params.get("token")
        
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Yêu cầu cung cấp JWT token xác thực")
        return
        
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token không hợp lệ hoặc đã hết hạn")
        return
        
    token_user_id = str(payload.get("user_id") or payload.get("sub"))
    token_role = payload.get("role")
    
    # 2. Ngăn chặn giả mạo Giám thị (Proctor Impersonation)
    if user_id.startswith("proctor_"):
        if token_role not in ("instructor", "admin"):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Chỉ Giảng viên/Admin mới được dùng định danh proctor")
            return
        room = get_room_by_id(room_id)
        if not room:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Phòng thi không tồn tại")
            return
        if token_role != "admin" and room["instructor_id"] != int(token_user_id):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Bạn không phải giám thị phụ trách phòng này")
            return
    else:
        # 3. Ngăn chặn giả mạo sinh viên khác (ID Spoofing)
        if user_id != token_user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="user_id không khớp với token xác thực")
            return
        # Kiểm tra ghi danh trong phòng
        if not is_student_enrolled(room_id, int(token_user_id)):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Sinh viên chưa ghi danh vào phòng thi này")
            return

    await manager.connect(websocket, room_id, user_id)
    
    # Nếu là sinh viên, phát thông báo online đến dashboard giám thị
    if not user_id.startswith("proctor_"):
        try:
            student_id = int(user_id)
            await manager.broadcast_json(room_id, {
                "type": "status_update",
                "student_id": student_id,
                "status": "active"
            })
        except ValueError:
            pass
            
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                message = json.loads(raw_data)
                msg_type = message.get("type")
                
                # Heartbeat Ping-Pong
                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "timestamp": message.get("timestamp")}))
                    continue
                
                # Kiểm soát phân quyền gửi lệnh quản trị qua WebSocket
                if msg_type == "kick_student":
                    if token_role not in ("instructor", "admin"):
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Chỉ giám thị mới có quyền trục xuất sinh viên"
                        }))
                        continue
                    await manager.broadcast_json(room_id, message)
                    
                elif msg_type == "send_hint":
                    if token_role not in ("instructor", "admin"):
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Chỉ giám thị mới có quyền gửi gợi ý riêng"
                        }))
                        continue
                    target_student_id = message.get("student_id")
                    if target_student_id:
                        hint_msg = {
                            "type": "instructor_hint",
                            "message": message.get("message", ""),
                            "from_user_id": user_id,
                        }
                        await manager.send_personal_message(json.dumps(hint_msg), room_id, str(target_student_id))
                        
                elif msg_type == "chat_message":
                    sender_name = payload.get("full_name") or message.get("sender_name", "")
                    msg_text = message.get("message", "")
                    recipient_id = message.get("recipient_id")
                    
                    sender_db_id = int(token_user_id)
                    db_msg = None
                    try:
                        db_msg = create_message(
                            room_id=room_id,
                            sender_id=sender_db_id,
                            recipient_id=recipient_id,
                            message_content=msg_text
                        )
                    except Exception as e:
                        print(f"Error saving chat message: {e}")
                            
                    chat_msg = {
                        "type": "chat_message",
                        "sender_id": sender_db_id,
                        "sender_name": db_msg["sender_name"] if db_msg and db_msg.get("sender_name") else sender_name,
                        "message": msg_text,
                        "recipient_id": recipient_id,
                        "message_id": db_msg["message_id"] if db_msg else None,
                    }
                    if recipient_id:
                        recipient_conn_id = str(recipient_id) if user_id.startswith("proctor_") else f"proctor_{recipient_id}"
                        await manager.send_personal_message(json.dumps(chat_msg), room_id, recipient_conn_id)
                        await manager.send_personal_message(json.dumps(chat_msg), room_id, user_id)
                    else:
                        await manager.broadcast_json(room_id, chat_msg)
                else:
                    await manager.broadcast_json(room_id, message)
            except json.JSONDecodeError:
                await manager.broadcast(room_id, f"User {user_id}: {raw_data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id, user_id)
        if not user_id.startswith("proctor_"):
            try:
                student_id = int(user_id)
                await manager.broadcast_json(room_id, {
                    "type": "status_update",
                    "student_id": student_id,
                    "status": "offline"
                })
            except ValueError:
                pass

