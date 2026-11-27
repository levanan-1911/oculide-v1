import os
import asyncio
import inspect
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
try:
    import redis.asyncio as redis_async
except ImportError:
    redis_async = None

from core.config import settings, get_cors_origins, get_trusted_hosts
from core.rate_limit import rate_limit_middleware
from core.request_context import extract_request_ip, set_request_context, reset_request_context

logger = logging.getLogger("oculide.api")
from core.security import decode_access_token
from api import (
    auth, admin, rooms, questions, submissions, sessions, violations, chat, livekit,
    drafts, device_checks, support, classes, snapshots, test_cases, enrollments,
    grading_results, system_logs, users, templates, notifications
)
from websocket.connection_manager import manager
from database.chat_db import create_message
from database.room_db import get_room_by_id, is_student_in_class
from database.enrollment_db import is_student_enrolled


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Lắng nghe kênh Redis PubSub nhận sự kiện vi phạm, chấm bài, và stream từ Celery Workers
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} đang khởi động...")
    print(f"🔧 Debug Mode: {settings.DEBUG}")
    
    redis_client = None
    listener_task = None
    if redis_async is not None:
        try:
            redis_client = redis_async.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                db=settings.REDIS_DB,
                socket_timeout=None,
                health_check_interval=30
            )
            
            async def redis_listener():
                retry_interval = 15
                while True:
                    try:
                        pubsub = redis_client.pubsub()
                        await pubsub.subscribe("ws_updates")
                        retry_interval = 15
                        async for message in pubsub.listen():
                            if message["type"] == "message":
                                try:
                                    data = json.loads(message["data"])
                                    room_id = data.get("room_id")
                                    if room_id:
                                        await manager.broadcast_json(int(room_id), data)
                                    elif data.get("type") == "livekit_stream_event":
                                        for r_id in list(manager.active_connections.keys()):
                                            await manager.broadcast_json(r_id, data)
                                except (json.JSONDecodeError, Exception):
                                    pass
                    except asyncio.CancelledError:
                        break
                    except (asyncio.TimeoutError, TimeoutError):
                        # Timeout khi không có message mới trên kênh pubsub là bình thường
                        continue
                    except Exception as e:
                        print(f"Lưu ý: Redis chưa kết nối được ({e}). Hệ thống đang chạy chế độ bộ nhớ cục bộ (sẽ thử lại sau {retry_interval}s)...")
                        await asyncio.sleep(retry_interval)
                        retry_interval = min(retry_interval * 2, 60)
                    
            listener_task = asyncio.create_task(redis_listener())
            app.state.redis_client = redis_client
        except Exception as e:
            print(f"Lưu ý: Redis chưa sẵn sàng ({e}). Chạy chế độ độc lập.")
            app.state.redis_client = None
    else:
        print("Lưu ý: Thư viện redis chưa cài đặt. Chạy chế độ độc lập.")
        app.state.redis_client = None

    # Background Scheduler: Tự động bật bảo trì & sao lưu CSDL theo khung giờ cấu hình + tự động kết thúc bảo trì khi hết hạn
    async def scheduled_maintenance_and_backup_loop():
        from datetime import datetime, timedelta
        from services.system_settings_manager import SystemSettingsManager
        from services.backup_service import BackupService
        from database.system_log_db import create_system_log, cleanup_old_audit_logs

        last_backup_slot = None
        last_maint_slot = None
        last_retention_day = None
        while True:
            try:
                sys_settings = SystemSettingsManager.get_settings()
                now = datetime.now()
                current_hhmm = now.strftime("%H:%M")
                current_slot = now.strftime("%Y-%m-%d %H:%M")

                # 1. Tự động bật bảo trì theo khung giờ linh hoạt
                maint_hhmm = (sys_settings.maintenance_schedule_time or sys_settings.backup_time or "02:00").strip()
                if (
                    sys_settings.maintenance_on_backup_schedule
                    and not sys_settings.maintenance_mode
                    and current_hhmm == maint_hhmm
                    and last_maint_slot != current_slot
                ):
                    last_maint_slot = current_slot
                    duration = int(sys_settings.maintenance_duration_minutes or 0)
                    ends_at = (now + timedelta(minutes=duration)).isoformat() if duration > 0 else None
                    SystemSettingsManager.update_settings(
                        {"maintenance_mode": True, "maintenance_ends_at": ends_at},
                        updated_by="system_scheduler",
                    )
                    try:
                        create_system_log(
                            log_level="warning",
                            module="Bảo trì tự động",
                            message=f"Hệ thống tự động bật chế độ bảo trì theo lịch ({current_hhmm}, thời lượng={duration} phút).",
                            extra_data={"ends_at": ends_at},
                        )
                    except Exception:
                        pass

                    if sys_settings.backup_on_maintenance:
                        try:
                            await asyncio.to_thread(
                                BackupService.create_database_backup,
                                backup_type="maintenance",
                                actor_id=None,
                                ip_address="127.0.0.1",
                            )
                        except Exception as bk_err:
                            print(f"⚠️ Lỗi sao lưu khi tự động bật bảo trì: {bk_err}")

                # 2. Tự động sao lưu CSDL theo khung giờ backup_time
                if sys_settings.backup_schedule_enabled and current_hhmm == (sys_settings.backup_time or "02:00").strip():
                    is_weekly_ok = sys_settings.backup_frequency != "weekly" or now.weekday() == 6
                    if is_weekly_ok and last_backup_slot != current_slot:
                        last_backup_slot = current_slot
                        try:
                            await asyncio.to_thread(
                                BackupService.create_database_backup,
                                backup_type="auto",
                                actor_id=None,
                                ip_address="127.0.0.1",
                            )
                        except Exception as bk_err:
                            print(f"⚠️ Lỗi sao lưu tự động theo lịch: {bk_err}")
                # 3. Dọn dẹp log định kỳ mỗi ngày (xóa INFO > 90 ngày, giữ WARN/CRITICAL >= 1 năm)
                today_str = now.strftime("%Y-%m-%d")
                if last_retention_day != today_str:
                    last_retention_day = today_str
                    try:
                        await asyncio.to_thread(cleanup_old_audit_logs, 90, 365)
                    except Exception:
                        pass
            except asyncio.CancelledError:
                break
            except Exception as sched_err:
                print(f"⚠️ Lỗi scheduler bảo trì/backup: {sched_err}")

            await asyncio.sleep(30)

    scheduler_task = asyncio.create_task(scheduled_maintenance_and_backup_loop())
        
    yield
    
    # Shutdown
    print("🛑 Đang đóng ứng dụng...")
    if scheduler_task:
        scheduler_task.cancel()
    if listener_task:
        listener_task.cancel()
    if redis_client:
        try:
            if hasattr(redis_client, "aclose"):
                await redis_client.aclose()
            elif hasattr(redis_client, "close"):
                res = redis_client.close()
                if inspect.isawaitable(res):
                    await res
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

# Trusted Host Middleware (chống Host Header Injection)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=get_trusted_hosts())

# GZip Compression (giảm 70-85% dung lượng JSON qua mạng ngoài / DevTunnel)
app.add_middleware(GZipMiddleware, minimum_size=500)

# Rate Limiting Middleware (Redis + In-Memory Fallback)
app.middleware("http")(rate_limit_middleware)


# Request Context Middleware (tự động trích xuất IP & User-Agent cho toàn bộ Audit Log)
@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    tokens = set_request_context(
        extract_request_ip(request),
        request.headers.get("user-agent"),
    )
    try:
        return await call_next(request)
    finally:
        reset_request_context(tokens)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_origin_regex=r"^https://.*\.devtunnels\.ms$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "X-Session-Id"],
)


# Global Exception Handlers (Error Envelope thống nhất, không rò rỉ stack trace / lỗi SQL)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    safe_errors = []
    for err in exc.errors():
        safe_errors.append({
            "loc": err.get("loc"),
            "msg": err.get("msg"),
            "type": err.get("type"),
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "errorCode": "VALIDATION_ERROR",
            "message": "Dữ liệu đầu vào không hợp lệ",
            "detail": safe_errors,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    error_code = f"HTTP_{exc.status_code}"
    message = "Yêu cầu không hợp lệ"
    if isinstance(detail, dict):
        error_code = str(detail.get("code") or detail.get("errorCode") or error_code)
        message = str(detail.get("message") or message)
    elif isinstance(detail, str) and detail.strip():
        message = detail
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "errorCode": error_code,
            "message": message,
            "detail": detail,
        },
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error at %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "errorCode": "INTERNAL_SERVER_ERROR",
            "message": "Lỗi hệ thống nội bộ, vui lòng thử lại sau",
            "detail": None,
        },
    )

# Health Checks (Deep Component Probes & Docker/K8s Self-Healing)
@app.get("/health", tags=["Health"])
async def health_check():
    from core.database import ping_database
    db_status = ping_database()
    
    redis_status = {"status": "unknown"}
    try:
        r = redis_async.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
            db=settings.REDIS_DB,
            socket_timeout=1
        )
        pong = await r.ping()
        if hasattr(r, "aclose"):
            await r.aclose()
        elif hasattr(r, "close"):
            res = r.close()
            if inspect.isawaitable(res):
                await res
        redis_status = {"status": "up" if pong else "down"}
    except Exception as e:
        logger.warning("Health check Redis ping failed: %s", e)
        redis_status = {"status": "down"}

    is_db_up = db_status.get("status") == "up"
    is_redis_up = redis_status.get("status") == "up"
    
    overall_status = "healthy" if (is_db_up and is_redis_up) else ("degraded" if is_db_up else "unhealthy")
    
    content = {
        "status": overall_status,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "components": {
            "database": {"status": db_status.get("status", "down")},
            "redis": redis_status
        }
    }
    status_code = status.HTTP_200_OK if is_db_up else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=content)

@app.get("/health/liveness", tags=["Health"])
async def health_liveness():
    """Liveness probe: Xác nhận tiến trình Web Server không bị treo/deadlock"""
    return {"status": "alive"}

@app.get("/health/readiness", tags=["Health"])
async def health_readiness():
    """Readiness probe: Kiểm tra kết nối CSDL để sẵn sàng nhận request từ Reverse Proxy/Load Balancer"""
    from core.database import ping_database
    db_status = ping_database()
    if db_status.get("status") != "up":
        logger.error("Readiness probe failed: %s", db_status.get("error"))
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy"}
        )
    return {"status": "ready"}

@app.get(f"{settings.API_V1_PREFIX}/system/public-config", tags=["System Public"])
@app.get("/api/system/public-config", tags=["System Public (Legacy)"], include_in_schema=False)
async def get_system_public_config():
    """Endpoint công khai cho trang Login đọc cờ bảo trì hệ thống và domain email cho phép"""
    from services.system_settings_manager import SystemSettingsManager
    return SystemSettingsManager.get_public_config().model_dump()



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
app.include_router(drafts.router, prefix=f"{settings.API_V1_PREFIX}/drafts", tags=["Code Drafts"])
app.include_router(device_checks.router, prefix=f"{settings.API_V1_PREFIX}/device-checks", tags=["Device Checks"])
app.include_router(support.router, prefix=f"{settings.API_V1_PREFIX}/support", tags=["Support Requests"])
app.include_router(classes.router, prefix=f"{settings.API_V1_PREFIX}/classes", tags=["Classes"])
app.include_router(snapshots.router, prefix=f"{settings.API_V1_PREFIX}/snapshots", tags=["Snapshots"])
app.include_router(test_cases.router, prefix=f"{settings.API_V1_PREFIX}/test-cases", tags=["Test Cases"])
app.include_router(enrollments.router, prefix=f"{settings.API_V1_PREFIX}/enrollments", tags=["Enrollments"])
app.include_router(grading_results.router, prefix=f"{settings.API_V1_PREFIX}/grading-results", tags=["Grading Results"])
app.include_router(system_logs.router, prefix=f"{settings.API_V1_PREFIX}/system-logs", tags=["System Logs"])
app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["Users"])
app.include_router(templates.router, prefix=f"{settings.API_V1_PREFIX}/templates", tags=["Question Templates"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_PREFIX}/notifications", tags=["Notifications"])

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
app.include_router(drafts.router, prefix="/api/drafts", tags=["Code Drafts (Legacy)"], include_in_schema=False)
app.include_router(device_checks.router, prefix="/api/device-checks", tags=["Device Checks (Legacy)"], include_in_schema=False)
app.include_router(support.router, prefix="/api/support", tags=["Support Requests (Legacy)"], include_in_schema=False)
app.include_router(classes.router, prefix="/api/classes", tags=["Classes (Legacy)"], include_in_schema=False)
app.include_router(snapshots.router, prefix="/api/snapshots", tags=["Snapshots (Legacy)"], include_in_schema=False)
app.include_router(test_cases.router, prefix="/api/test-cases", tags=["Test Cases (Legacy)"], include_in_schema=False)
app.include_router(enrollments.router, prefix="/api/enrollments", tags=["Enrollments (Legacy)"], include_in_schema=False)
app.include_router(grading_results.router, prefix="/api/grading-results", tags=["Grading Results (Legacy)"], include_in_schema=False)
app.include_router(system_logs.router, prefix="/api/system-logs", tags=["System Logs (Legacy)"], include_in_schema=False)
app.include_router(users.router, prefix="/api/users", tags=["Users (Legacy)"], include_in_schema=False)
app.include_router(templates.router, prefix="/api/templates", tags=["Question Templates (Legacy)"], include_in_schema=False)
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications (Legacy)"], include_in_schema=False)

# Cấu hình Mount phục vụ ảnh tĩnh Webcam Snapshots (ưu tiên UPLOADS_DIR bên ngoài source code)
uploads_dir = os.getenv("UPLOADS_DIR") or os.path.join(os.path.dirname(__file__), "uploads")
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
        # Kiểm tra ghi danh trong phòng hoặc thuộc lớp của phòng
        if not is_student_enrolled(room_id, int(token_user_id)) and not is_student_in_class(room_id, int(token_user_id)):
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

                elif msg_type == "unlock_student":
                    if token_role not in ("instructor", "admin"):
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Chỉ giám thị mới có quyền mở khóa bài thi"
                        }))
                        continue
                    target_student_id = message.get("student_id")
                    if target_student_id:
                        await manager.send_personal_message(
                            json.dumps({
                                "type": "student_unlocked",
                                "student_id": int(target_student_id),
                                "unlocked_by": token_user_id,
                            }),
                            room_id,
                            str(target_student_id),
                        )
                    
                elif msg_type in ("announcement", "notice"):
                    if token_role not in ("instructor", "admin"):
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Chỉ giám thị mới có quyền gửi thông báo trong phòng thi"
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

