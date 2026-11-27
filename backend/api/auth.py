from fastapi import APIRouter, HTTPException, Depends, status, Header, BackgroundTasks, Request
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging
import secrets

from schemas.auth import (
    UserRegisterRequest, LoginRequest, UserResponse, TokenResponse,
    JoinRoomRequest, UserProfileUpdateRequest, ChangePasswordRequest,
    RefreshTokenRequest, ForgotPasswordRequest, ForgotPasswordResponse,
    ResetPasswordRequest
)
from core.security import (
    create_access_token, create_refresh_token, decode_access_token, 
    verify_password
)
from services.email_service import EmailService
from core.permissions import get_current_user
from database.user_db import (
    get_user_by_username, get_user_by_email, get_user_by_id,
    create_user, update_last_login, update_user_profile, change_user_password,
    create_password_reset_token, verify_password_reset_token, mark_password_reset_token_used
)
from database.system_log_db import create_system_log
from core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

def extract_client_ip(request: Request) -> str:
    """
    Bóc tách địa chỉ IP thực tế của client (IP thật, tránh lưu IP ảo 127.0.0.1 hay card mạng ảo):
    1. Header X-Client-Public-IP do frontend resolver hoặc reverse proxy truyền
    2. Cloudflare header CF-Connecting-IP
    3. True-Client-IP
    4. X-Real-IP
    5. X-Forwarded-For (lấy IP client hợp lệ đầu tiên)
    6. Socket client host (nếu là IP thật, không phải loopback)
    7. Fallback Local Dev: Lấy IP card mạng thật (Wi-Fi/Ethernet) đang hoạt động thay vì loopback 127.0.0.1
    """
    # 1. Header do client hoặc reverse proxy truyền
    client_public_ip = request.headers.get("x-client-public-ip")
    if client_public_ip and client_public_ip.strip():
        ip = client_public_ip.split(",")[0].strip()
        if ip and ip.lower() not in ("127.0.0.1", "::1", "localhost", "0.0.0.0", "null", "undefined"):
            return ip

    # 2. Cloudflare
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip and cf_ip.strip():
        return cf_ip.strip()

    # 3. True-Client-IP
    true_ip = request.headers.get("true-client-ip")
    if true_ip and true_ip.strip():
        return true_ip.strip()

    # 4. Nginx / Reverse Proxy Real IP
    real_ip = request.headers.get("x-real-ip")
    if real_ip and real_ip.strip():
        return real_ip.strip()

    # 5. Standard X-Forwarded-For
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for and forwarded_for.strip():
        ips = [i.strip() for i in forwarded_for.split(",") if i.strip()]
        for cand in ips:
            if cand.lower() not in ("127.0.0.1", "::1", "localhost", "0.0.0.0", "null", "undefined"):
                return cand
        if ips:
            return ips[0]

    # 6. Socket Host
    if request.client and request.client.host:
        host = request.client.host.strip()
        if host.lower() not in ("127.0.0.1", "::1", "localhost"):
            return host

    # 7. Fallback khi truy cập local loopback (tránh lưu IP ảo 127.0.0.1):
    # Lấy IP card mạng vật lý đang kết nối định tuyến ra ngoài (Wi-Fi / LAN)
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        s.connect(('8.8.8.8', 80))
        real_local_ip = s.getsockname()[0]
        s.close()
        if real_local_ip and real_local_ip != "127.0.0.1":
            return real_local_ip
    except Exception:
        pass

    return "127.0.0.1"

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegisterRequest,
    background_tasks: BackgroundTasks,
    request: Request
):
    """Đăng ký tài khoản người dùng mới (Instructor / Student) và tự động gửi email thông báo"""
    clean_email = user_data.email.strip().lower()
    username = (user_data.username or clean_email.split("@")[0]).strip().lower()

    # Kiểm tra ràng buộc tên miền trường theo Cấu hình Hệ thống & Nhật ký
    from services.system_settings_manager import SystemSettingsManager, is_email_domain_allowed
    sys_settings = SystemSettingsManager.get_settings()
    allowed_setting = (sys_settings.allowed_email_domain or "").strip()
    if allowed_setting:
        if not is_email_domain_allowed(clean_email, allowed_setting):
            try:
                from database.system_log_db import create_system_log
                client_ip = extract_client_ip(request)
                create_system_log(
                    log_level="warning",
                    module="AUTH_REGISTER",
                    message=f"Từ chối đăng ký tài khoản với email '{clean_email}': Tên miền không thuộc cấu hình hệ thống cho phép ({allowed_setting})",
                    ip_address=client_ip,
                    extra_data={
                        "attempted_email": clean_email,
                        "username": username,
                        "allowed_domain": allowed_setting
                    }
                )
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Hệ thống chỉ chấp nhận đăng ký tài khoản bằng email thuộc tên miền do Quản trị viên cấu hình '{allowed_setting}'"
            )

    if get_user_by_username(username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tên người dùng (username) '{username}' đã được sử dụng"
        )
    if get_user_by_email(clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã được đăng ký trên hệ thống"
        )
    
    new_user = create_user(
        username=username,
        password=user_data.password,
        email=clean_email,
        full_name=user_data.full_name,
        role=user_data.role,
        student_id=user_data.student_id
    )

    # Tự động gửi email xác nhận tạo tài khoản thành công kèm thông tin đăng nhập
    background_tasks.add_task(
        EmailService.send_account_credentials_email,
        to_email=new_user["email"],
        username=new_user["username"],
        raw_password=user_data.password,
        full_name=new_user["full_name"],
        role=new_user["role"],
        ma_dinh_danh=new_user.get("student_id") or new_user.get("ma_dinh_danh")
    )

    return new_user

@router.get("/my-ip")
async def get_my_ip(request: Request):
    """Lấy địa chỉ IP hiện tại của client kết nối tới hệ thống (đã bóc tách qua proxy/header)"""
    client_ip = extract_client_ip(request)
    return {"ip": client_ip}

# Bộ đếm theo dõi các lần đăng nhập sai để phát hiện bất thường (Brute-force / Dò mật khẩu)
_FAILED_LOGIN_TRACKER: Dict[str, Dict[str, Any]] = {}
FAILED_WINDOW_SECONDS = 900  # 15 phút
FAILED_THRESHOLD = 3         # Ghi log cảnh báo khi sai liên tiếp từ lần thứ 3 trở lên
MAX_FAILED_ATTEMPTS = 5      # Khóa tài khoản vĩnh viễn/tạm khóa khi sai từ 5 lần trở lên

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, request: Request):
    """Đăng nhập hệ thống bằng username/email và password nhận cặp Access + Refresh JWT token"""
    from database.user_db import (
        get_user_lockout_state,
        record_failed_login_attempt,
        reset_user_lockout,
    )

    identifier = credentials.username.strip()
    client_ip = extract_client_ip(request)
    track_key = f"{identifier.lower()}_{client_ip}"
    now = datetime.now()

    user = get_user_by_username(identifier) or get_user_by_email(identifier)

    # 1. Kiểm tra tài khoản bị Admin vô hiệu hóa (khóa vĩnh viễn)
    if user and not user.get("is_active", True):
        try:
            create_system_log(
                log_level="warning",
                module="Từ chối đăng nhập",
                message=f"Tài khoản '{user['username']}' bị vô hiệu hóa cố gắng đăng nhập",
                user_id=user["user_id"],
                ip_address=client_ip,
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_PERMANENTLY_LOCKED",
                "message": "Tài khoản của bạn đã bị khóa vĩnh viễn. Vui lòng liên hệ qua email oculide.system@gmail.com để được hỗ trợ mở khóa.",
            },
        )

    # 2. Kiểm tra khóa tạm thời (Temporary Account Lockout)
    if user:
        lock_state = get_user_lockout_state(user["user_id"])
        locked_until = lock_state.get("locked_until")
        if locked_until and locked_until > now:
            remaining_seconds = max(1, int((locked_until - now).total_seconds()))
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "code": "ACCOUNT_TEMP_LOCKED",
                    "retry_after_seconds": remaining_seconds,
                    "remaining_seconds": remaining_seconds,
                    "locked_until": locked_until.isoformat(),
                    "message": "Tài khoản tạm khóa 5 phút do nhập sai mật khẩu quá số lần quy định.",
                },
            )

    is_password_valid = verify_password(credentials.password, user["password_hash"]) if user else False

    # 3. Trường hợp sai tài khoản hoặc sai mật khẩu (KHÔNG set is_active = False)
    if not user or not is_password_valid:
        info = _FAILED_LOGIN_TRACKER.get(track_key)
        if not info or (now - info["last_failed"]).total_seconds() > FAILED_WINDOW_SECONDS:
            info = {"count": 1, "last_failed": now}
        else:
            info["count"] += 1
            info["last_failed"] = now
        _FAILED_LOGIN_TRACKER[track_key] = info

        if user:
            lock_res = record_failed_login_attempt(user["user_id"])
            attempts = lock_res["failed_login_attempts"]
            lock_minutes = lock_res["lock_minutes"]
            locked_until = lock_res["locked_until"]

            if lock_minutes > 0 and locked_until is not None:
                remaining_seconds = lock_minutes * 60
                try:
                    create_system_log(
                        log_level="warning",
                        module="Bảo mật / Tạm khóa tài khoản",
                        message=(
                            f"Tài khoản '{user['username']}' bị TẠM KHÓA {lock_minutes} phút "
                            f"do nhập sai mật khẩu {attempts} lần từ IP {client_ip}"
                        ),
                        user_id=user["user_id"],
                        ip_address=client_ip,
                        extra_data={
                            "attempt_count": attempts,
                            "lock_minutes": lock_minutes,
                            "identifier": identifier,
                            "ip": client_ip,
                            "temporary_locked": True,
                        },
                    )
                except Exception:
                    pass
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail={
                        "code": "ACCOUNT_TEMP_LOCKED",
                        "retry_after_seconds": remaining_seconds,
                        "remaining_seconds": remaining_seconds,
                        "locked_until": locked_until.isoformat(),
                        "lock_minutes": lock_minutes,
                        "message": f"Tài khoản tạm khóa {lock_minutes} phút do nhập sai mật khẩu quá số lần quy định.",
                    },
                )

            attempts_in_cycle = attempts % MAX_FAILED_ATTEMPTS
            remaining_tries = MAX_FAILED_ATTEMPTS - attempts_in_cycle
            next_lock_min = 15 if attempts >= MAX_FAILED_ATTEMPTS else 5
            try:
                create_system_log(
                    log_level="warning",
                    module="AUTH_LOGIN_FAILED",
                    message=f"Tài khoản '{identifier}' nhập sai mật khẩu (lần {attempts}) từ IP {client_ip}",
                    user_id=user["user_id"],
                    ip_address=client_ip,
                    extra_data={"attempt_count": attempts, "identifier": identifier, "ip": client_ip},
                )
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Sai mật khẩu. Bạn còn {remaining_tries} lần thử trước khi tài khoản tạm khóa {next_lock_min} phút.",
            )

        # Không tìm thấy user
        try:
            create_system_log(
                log_level="warning",
                module="AUTH_LOGIN_FAILED",
                message=f"Tài khoản '{identifier}' đăng nhập thất bại (không tồn tại) từ IP {client_ip}",
                user_id=None,
                ip_address=client_ip,
                extra_data={"attempt_count": info["count"], "identifier": identifier, "ip": client_ip},
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác",
        )

    # 4. Đăng nhập thành công -> Reset bộ đếm sai và xóa locked_until
    _FAILED_LOGIN_TRACKER.pop(track_key, None)
    reset_user_lockout(user["user_id"])

    # 3. Kiểm tra chế độ bảo trì hệ thống (Maintenance Mode)
    from services.system_settings_manager import SystemSettingsManager
    sys_settings = SystemSettingsManager.get_settings()
    user_role = (user.get("role") or "").lower()
    if sys_settings.maintenance_mode and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=sys_settings.maintenance_message or "Hệ thống đang được bảo trì định kỳ bởi Trung tâm CNTT. Vui lòng quay lại sau ít phút."
        )

    # 4. Kiểm tra Strict Single Active Session (First-In-Wins)
    from services.session_manager import SessionManager, parse_device_info
    existing_session = SessionManager.get_session(user["user_id"])
    if SessionManager.is_session_alive(existing_session):
        device_label = existing_session.get("deviceInfo") or "thiết bị khác"
        try:
            from database.system_log_db import queue_system_log
            queue_system_log(
                log_level="warn",
                module="AUTH_LOGIN",
                message=f"Từ chối đăng nhập từ IP {client_ip}: tài khoản đang hoạt động trên {device_label}",
                user_id=user["user_id"],
                ip_address=client_ip,
                user_agent=request.headers.get("user-agent", ""),
                extra_data={
                    "eventCode": "AUTH_LOGIN_FAILED",
                    "actionLabel": "Đăng nhập bị chặn (Trùng phiên)",
                    "category": "AUTH",
                    "status": "FAILED",
                    "errorCode": "SESSION_LOCKED_BY_OTHER_DEVICE",
                    "reason": f"Đang hoạt động trên {device_label}",
                    "sessionId": existing_session.get("activeSessionId"),
                },
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tài khoản này đang hoạt động trên một thiết bị khác ({device_label}). Vui lòng đăng xuất ở thiết bị cũ hoặc liên hệ Giám thị/Admin để mở khóa phiên."
        )

    device_info = parse_device_info(request.headers.get("user-agent", ""), client_ip)
    new_session = SessionManager.create_session(user["user_id"], device_info=device_info)

    # 5. Phân loại IP mới để đánh dấu mức độ, không dùng điều kiện này để bỏ log đăng nhập thành công.
    is_unfamiliar_ip = False
    if client_ip not in ("127.0.0.1", "localhost", "::1", "testclient"):
        if user.get("last_login"):
            try:
                from core.database import get_db_cursor
                with get_db_cursor() as cursor:
                    # Kiểm tra xem IP này đã từng xuất hiện trong SystemAuditLogs của user trong 30 ngày qua hay chưa
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM SystemAuditLogs 
                        WHERE user_id = ? 
                          AND ip_address = ? 
                          AND created_at >= DATEADD(day, -30, GETDATE())
                    """, (user["user_id"], client_ip))
                    seen_count = cursor.fetchone()[0] or 0
                    if seen_count == 0:
                        is_unfamiliar_ip = True
            except Exception:
                logger.exception(
                    "Could not determine whether login IP is new for user_id=%s",
                    user["user_id"],
                )

    try:
        from database.system_log_db import queue_system_log
        queue_system_log(
            log_level="warn" if is_unfamiliar_ip else "info",
            module="AUTH_LOGIN",
            message=f"Tài khoản {user['username']} đăng nhập thành công từ IP {client_ip}",
            user_id=user["user_id"],
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent", ""),
            extra_data={
                "eventCode": "AUTH_LOGIN_SUCCESS",
                "actionLabel": "Đăng nhập thành công",
                "category": "AUTH",
                "status": "SUCCESS",
                "sessionId": new_session["activeSessionId"],
                "is_new_ip": is_unfamiliar_ip,
                "ip": client_ip,
                "username": user["username"],
                "role": user["role"],
            },
        )
    except Exception:
        logger.exception(
            "Could not write successful login audit for user_id=%s",
            user["user_id"],
        )

    update_last_login(user["user_id"], client_ip=client_ip)
    user["last_login_ip"] = client_ip
    
    token_data = {
        "sub": str(user["user_id"]),
        "user_id": user["user_id"],
        "username": user["username"],
        "role": user["role"],
        "email": user["email"],
        "full_name": user["full_name"],
        "must_change_password": user.get("must_change_password", False),
        "sessionId": new_session["activeSessionId"],
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(refresh_req: RefreshTokenRequest):
    """Làm mới Access Token khi token cũ đã hết hạn bằng Refresh Token"""
    payload = decode_access_token(refresh_req.refresh_token)
    if not payload or payload.get("token_type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token không hợp lệ hoặc đã hết hạn"
        )
        
    user_id = payload.get("user_id")
    user = get_user_by_id(int(user_id)) if user_id else None
    if not user or not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại hoặc đã bị khóa"
        )
        
    token_data = {
        "sub": str(user["user_id"]),
        "user_id": user["user_id"],
        "username": user["username"],
        "role": user["role"],
        "email": user["email"],
        "full_name": user["full_name"],
        "must_change_password": user.get("must_change_password", False),
        "sessionId": new_session["activeSessionId"],
    }
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Lấy thông tin tài khoản hiện tại"""
    user = get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    return user

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request_data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks
):
    """Yêu cầu khôi phục mật khẩu qua Email"""
    email = request_data.email.strip().lower()
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email này chưa được đăng ký trong hệ thống."
        )
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ quản trị viên."
        )
    
    reset_token = secrets.token_urlsafe(32)
    create_password_reset_token(user["user_id"], reset_token, expires_minutes=15)
    
    # Gửi email khôi phục ngầm qua BackgroundTasks để tối ưu tốc độ phản hồi
    background_tasks.add_task(
        EmailService.send_password_reset_email,
        to_email=user["email"],
        reset_token=reset_token,
        full_name=user.get("full_name") or user["username"]
    )
    
    return {
        "message": f"Liên kết khôi phục mật khẩu đã được gửi tới email {email}.",
        "reset_link": None,
        "token": None
    }

@router.post("/reset-password")
async def reset_password(request_data: ResetPasswordRequest):
    """Đặt lại mật khẩu bằng Token từ email khôi phục"""
    user_id = verify_password_reset_token(request_data.token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Liên kết xác thực không hợp lệ hoặc đã hết hạn (tối đa 15 phút)."
        )
    
    change_user_password(user_id, request_data.new_password)
    mark_password_reset_token_used(request_data.token)
    
    try:
        user = get_user_by_id(user_id)
        u_name = user.get("username") if user else f"ID {user_id}"
        create_system_log(
            log_level="info",
            module="Đặt lại mật khẩu",
            message=f"Đặt lại mật khẩu thành công qua email xác thực cho tài khoản '{u_name}'",
            user_id=user_id
        )
    except Exception:
        pass
    
    return {"message": "Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập lại."}

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserProfileUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cập nhật thông tin tài khoản cá nhân"""
    updated = update_user_profile(
        user_id=current_user["user_id"],
        full_name=profile_data.full_name,
        email=profile_data.email,
        student_id=profile_data.student_id,
        department=profile_data.department,
        academic_rank=profile_data.academic_rank,
        phone_number=profile_data.phone_number,
        avatar_url=profile_data.avatar_url
    )
    return updated

@router.put("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Đổi mật khẩu người dùng"""
    user = get_user_by_id(current_user["user_id"])
    if not user or not verify_password(password_data.current_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác"
        )
    change_user_password(current_user["user_id"], password_data.new_password)
    
    try:
        create_system_log(
            log_level="info",
            module="Đổi mật khẩu",
            message=f"Người dùng '{user.get('username')}' ({user.get('full_name')}) đã đổi mật khẩu thành công",
            user_id=current_user["user_id"]
        )
    except Exception:
        pass
        
    return {"message": "Đổi mật khẩu thành công"}


@router.get("/maintenance-status")
async def get_maintenance_status():
    """Trạng thái bảo trì công khai để các phiên đang mở tự động đăng xuất hoặc cảnh báo trước 5 phút."""
    from datetime import datetime, timedelta
    from services.system_settings_manager import SystemSettingsManager
    sys_settings = SystemSettingsManager.get_settings()

    upcoming_maintenance = False
    minutes_remaining = None
    start_time_str = (sys_settings.maintenance_schedule_time or sys_settings.backup_time or "02:00").strip()

    if not sys_settings.maintenance_mode and sys_settings.maintenance_on_backup_schedule:
        try:
            hh, mm = [int(x) for x in start_time_str.split(":")[:2]]
            now = datetime.now()
            scheduled_dt = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
            if scheduled_dt < now:
                scheduled_dt += timedelta(days=1)
            diff_seconds = (scheduled_dt - now).total_seconds()
            if 0 < diff_seconds <= 300:
                upcoming_maintenance = True
                minutes_remaining = max(1, int((diff_seconds + 59) // 60))
        except Exception:
            pass

    return {
        "maintenance_mode": bool(sys_settings.maintenance_mode),
        "maintenance_message": sys_settings.maintenance_message or "",
        "maintenance_ends_at": sys_settings.maintenance_ends_at,
        "maintenance_duration_minutes": sys_settings.maintenance_duration_minutes,
        "upcoming_maintenance": upcoming_maintenance,
        "minutes_remaining": minutes_remaining,
        "maintenance_start_time": start_time_str,
    }


@router.post("/heartbeat")
async def session_heartbeat(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Duy trì phiên làm việc duy nhất (mỗi 20 giây) và phát hiện phiên bị mở khóa."""
    from services.session_manager import SessionManager

    auth_header = request.headers.get("authorization") or ""
    token = auth_header.replace("Bearer ", "").strip()
    payload = decode_access_token(token) if token else None
    session_id = (payload or {}).get("sessionId")

    if session_id:
        ok = SessionManager.touch_heartbeat(current_user["user_id"], session_id)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "SESSION_REVOKED",
                    "message": "Phiên làm việc đã được mở khóa hoặc kết thúc bởi Quản trị viên / Giám thị.",
                },
            )

    return {"status": "ok", "activeSessionId": session_id}


@router.post("/logout")
async def logout_session(request: Request):
    """Đăng xuất chủ động và giải phóng ngay activeSessionId để thiết bị khác đăng nhập được luôn."""
    from services.session_manager import SessionManager

    auth_header = request.headers.get("authorization") or ""
    token = auth_header.replace("Bearer ", "").strip()
    payload = decode_access_token(token) if token else None
    if payload and payload.get("user_id"):
        SessionManager.clear_session(int(payload["user_id"]))

    return {"message": "Đã đăng xuất và giải phóng phiên làm việc."}

