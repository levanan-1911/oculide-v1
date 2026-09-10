from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any
from datetime import timedelta

import secrets
from schemas.auth import (
    UserRegisterRequest, LoginRequest, UserResponse, TokenResponse,
    JoinRoomRequest, UserProfileUpdateRequest, ChangePasswordRequest,
    RefreshTokenRequest
)
from core.security import create_access_token, create_refresh_token, decode_access_token, verify_password
from core.permissions import get_current_user
from database.user_db import (
    get_user_by_username, get_user_by_email, get_user_by_id,
    create_user, update_last_login, update_user_profile, change_user_password
)
from database.room_db import get_room_by_code
from database.enrollment_db import is_student_enrolled, enroll_student
from core.config import settings

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegisterRequest):
    """Đăng ký tài khoản người dùng mới (Instructor / Student)"""
    if get_user_by_username(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên người dùng (username) đã được sử dụng"
        )
    if get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã được đăng ký trên hệ thống"
        )
    
    new_user = create_user(
        username=user_data.username,
        password=user_data.password,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        student_id=user_data.student_id
    )
    return new_user

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """Đăng nhập hệ thống bằng username/password nhận cặp Access + Refresh JWT token"""
    user = get_user_by_username(credentials.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác"
        )
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác"
        )
        
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ quản trị viên."
        )
        
    update_last_login(user["user_id"])
    
    token_data = {
        "sub": str(user["user_id"]),
        "user_id": user["user_id"],
        "username": user["username"],
        "role": user["role"],
        "email": user["email"],
        "full_name": user["full_name"]
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
        "full_name": user["full_name"]
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

@router.post("/join", response_model=TokenResponse)
async def join_room_fast(join_data: JoinRoomRequest):
    """Sinh viên tham gia phòng nhanh bằng room_code và passcode (Tạo tài khoản khách duy nhất an toàn)"""
    room = get_room_by_code(join_data.room_code)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Phòng với mã '{join_data.room_code}' không tồn tại"
        )
    if not room["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phòng học/thi này đã bị đóng"
        )
    if room.get("passcode") and room["passcode"] != join_data.passcode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mật khẩu vào phòng (passcode) không chính xác"
        )
        
    # Tạo người dùng vãng lai với định danh duy nhất (chống trùng lặp tài khoản)
    safe_sid = join_data.student_id.strip() if join_data.student_id else join_data.room_code
    unique_suffix = secrets.token_hex(4)
    username = f"guest_{safe_sid}_{unique_suffix}"
    
    temp_password = f"TempPass_{secrets.token_urlsafe(8)}!"
    user = create_user(
        username=username,
        password=temp_password,
        email=f"{username}@oculide.temp",
        full_name=join_data.full_name or f"Sinh viên {safe_sid}",
        role="student",
        student_id=join_data.student_id
    )
        
    # Ghi danh vào phòng
    if not is_student_enrolled(room["room_id"], user["user_id"]):
        enroll_student(room["room_id"], user["user_id"], enrolled_by=room["instructor_id"])
        
    token_data = {
        "sub": str(user["user_id"]),
        "user_id": user["user_id"],
        "username": user["username"],
        "role": "student",
        "email": user["email"],
        "full_name": user["full_name"],
        "room_id": room["room_id"]
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

# ─── OAUTH2 PLACEHOLDERS & CALLBACKS ─────────────────────────────────────────
@router.get("/login/google")
async def login_google():
    """Khởi tạo URL đăng nhập qua Google OAuth2"""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Google OAuth2 chưa được cấu hình Client ID")
    redirect_uri = "https://api.oculide.id.vn/api/v1/auth/callback/google"
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={settings.GOOGLE_CLIENT_ID}&redirect_uri={redirect_uri}&scope=openid%20profile%20email"
    return {"auth_url": auth_url}

@router.get("/callback/google")
async def callback_google(code: str):
    """Tiếp nhận mã xác thực từ Google OAuth2 và trả JWT token"""
    # Gợi ý: Trao đổi code lấy Google Token và tải profile
    return {"message": "Google OAuth2 callback received", "auth_code": code[:10] + "..."}

@router.get("/login/github")
async def login_github():
    """Khởi tạo URL đăng nhập qua GitHub OAuth"""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="GitHub OAuth chưa được cấu hình Client ID")
    auth_url = f"https://github.com/login/oauth/authorize?client_id={settings.GITHUB_CLIENT_ID}&scope=user:email"
    return {"auth_url": auth_url}

@router.get("/callback/github")
async def callback_github(code: str):
    """Tiếp nhận mã xác thực từ GitHub OAuth"""
    return {"message": "GitHub OAuth callback received", "auth_code": code[:10] + "..."}


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
        student_id=profile_data.student_id
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
    return {"message": "Đổi mật khẩu thành công"}
