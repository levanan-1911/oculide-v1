from fastapi import APIRouter, HTTPException, Depends, status, Header, BackgroundTasks, Request
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
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

def extract_client_ip(request: Request) -> str:
    """
    Bóc tách địa chỉ IP thực tế của client:
    1. Header X-Client-Public-IP do frontend resolver hoặc reverse proxy truyền
    2. Cloudflare header CF-Connecting-IP
    3. X-Real-IP
    4. X-Forwarded-For (lấy IP đầu tiên)
    5. Fallback request.client.host
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

    # 3. Nginx / Reverse Proxy Real IP
    real_ip = request.headers.get("x-real-ip")
    if real_ip and real_ip.strip():
        return real_ip.strip()

    # 4. Standard X-Forwarded-For
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for and forwarded_for.strip():
        ips = [i.strip() for i in forwarded_for.split(",") if i.strip()]
        if ips:
            return ips[0]

    # 5. Socket Host
    if request.client and request.client.host:
        return request.client.host

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
    from services.system_settings_manager import SystemSettingsManager
    sys_settings = SystemSettingsManager.get_settings()
    raw_domain = (sys_settings.allowed_email_domain or "").strip().lower()
    if raw_domain:
        allowed_domain = raw_domain if raw_domain.startswith("@") else f"@{raw_domain}"
        if not clean_email.endswith(allowed_domain):
            try:
                from database.system_log_db import create_system_log
                client_ip = extract_client_ip(request)
                create_system_log(
                    log_level="warning",
                    module="AUTH_REGISTER",
                    message=f"Từ chối đăng ký tài khoản với email '{clean_email}': Tên miền không thuộc cấu hình hệ thống cho phép ({allowed_domain})",
                    ip_address=client_ip,
                    extra_data={
                        "attempted_email": clean_email,
                        "username": username,
                        "allowed_domain": allowed_domain
                    }
                )
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Hệ thống chỉ chấp nhận đăng ký tài khoản bằng email thuộc tên miền trường '{sys_settings.allowed_email_domain}'"
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
FAILED_THRESHOLD = 3         # Chỉ ghi log cảnh báo khi sai liên tiếp từ lần thứ 3 trở lên

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, request: Request):
    """Đăng nhập hệ thống bằng username/email và password nhận cặp Access + Refresh JWT token"""
    identifier = credentials.username.strip()
    client_ip = extract_client_ip(request)
    track_key = f"{identifier.lower()}_{client_ip}"
    now = datetime.now()

    user = get_user_by_username(identifier) or get_user_by_email(identifier)
    is_password_valid = verify_password(credentials.password, user["password_hash"]) if user else False

    # 1. Trường hợp sai tài khoản hoặc sai mật khẩu
    if not user or not is_password_valid:
        info = _FAILED_LOGIN_TRACKER.get(track_key)
        if not info or (now - info["last_failed"]).total_seconds() > FAILED_WINDOW_SECONDS:
            info = {"count": 1, "last_failed": now}
        else:
            info["count"] += 1
            info["last_failed"] = now
        _FAILED_LOGIN_TRACKER[track_key] = info

        # CHỈ lưu log nếu có dấu hiệu bất thường (sai từ 3 lần trở lên liên tiếp).
        # Sai bình thường 1-2 lần không lưu log để tránh tràn bộ nhớ.
        if info["count"] >= FAILED_THRESHOLD:
            try:
                create_system_log(
                    log_level="warning",
                    module="Cảnh báo đăng nhập sai",
                    message=f"Tài khoản '{identifier}' đăng nhập sai {info['count']} lần liên tiếp từ IP {client_ip}",
                    user_id=user["user_id"] if user else None,
                    ip_address=client_ip,
                    extra_data={"attempt_count": info["count"], "identifier": identifier, "ip": client_ip}
                )
            except Exception:
                pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác"
        )

    # Đăng nhập thông tin chính xác -> Xóa bộ đếm đăng nhập sai
    _FAILED_LOGIN_TRACKER.pop(track_key, None)

    # 2. Kiểm tra tài khoản bị khóa
    if not user.get("is_active", True):
        try:
            create_system_log(
                log_level="warning",
                module="Từ chối đăng nhập",
                message=f"Tài khoản '{user['username']}' bị khóa cố gắng đăng nhập",
                user_id=user["user_id"],
                ip_address=client_ip
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ quản trị viên."
        )

    # 3. Kiểm tra chế độ bảo trì hệ thống (Maintenance Mode)
    from services.system_settings_manager import SystemSettingsManager
    sys_settings = SystemSettingsManager.get_settings()
    user_role = (user.get("role") or "").lower()
    if sys_settings.maintenance_mode and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=sys_settings.maintenance_message or "Hệ thống đang được bảo trì định kỳ bởi Trung tâm CNTT. Vui lòng quay lại sau ít phút."
        )

    # 4. Kiểm tra xem có phải ĐĂNG NHẬP TỪ IP LẠ hay không:
    # "đăng nhập thành công chỉ lưu log khi đăng nhập từ 1 địa chỉ IP lạ (chưa từng được ghi nhận trong hệ thống trong 1 khoảng thời gian)"
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
                pass

    if is_unfamiliar_ip:
        try:
            create_system_log(
                log_level="warning",
                module="Đăng nhập từ IP lạ",
                message=f"Tài khoản {user['username']} ({user['full_name']}) đăng nhập từ địa chỉ IP mới: {client_ip}",
                user_id=user["user_id"],
                ip_address=client_ip,
                extra_data={"is_new_ip": True, "ip": client_ip, "username": user["username"], "role": user["role"]}
            )
        except Exception:
            pass
    # Ngược lại: Đăng nhập thành công bình thường từ IP quen thuộc -> KHÔNG LƯU LOG để tránh tràn bộ nhớ.

    update_last_login(user["user_id"], client_ip=client_ip)
    user["last_login_ip"] = client_ip
    
    token_data = {
        "sub": str(user["user_id"]),
        "user_id": user["user_id"],
        "username": user["username"],
        "role": user["role"],
        "email": user["email"],
        "full_name": user["full_name"],
        "must_change_password": user.get("must_change_password", False)
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
        "must_change_password": user.get("must_change_password", False)
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
        # Không tiết lộ email có tồn tại hay không vì lý do bảo mật
        return {
            "message": "Nếu email này tồn tại trong hệ thống, liên kết khôi phục đã được tạo.",
            "reset_link": None,
            "token": None
        }
    
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

