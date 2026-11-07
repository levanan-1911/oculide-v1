from fastapi import APIRouter, HTTPException, Depends, status, Header, BackgroundTasks
from typing import Dict, Any, Optional
from datetime import timedelta
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
from core.config import settings

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegisterRequest):
    """Đăng ký tài khoản người dùng mới (Instructor / Student)"""
    clean_email = user_data.email.strip().lower()
    username = (user_data.username or clean_email.split("@")[0]).strip().lower()

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
    return new_user

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """Đăng nhập hệ thống bằng username/email và password nhận cặp Access + Refresh JWT token"""
    identifier = credentials.username.strip()
    user = get_user_by_username(identifier) or get_user_by_email(identifier)
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
    return {"message": "Đổi mật khẩu thành công"}

