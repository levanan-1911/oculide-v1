from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Dict, Any, Optional

from schemas.user import UserResponse, UserProfileUpdateRequest
from core.permissions import get_current_user, admin_required
from database.user_db import (
    get_user_by_id,
    get_all_users_paginated,
    update_user_profile,
    delete_user
)

router = APIRouter()

@router.get("", response_model=Dict[str, Any])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: Dict[str, Any] = Depends(admin_required)
):
    """Lấy danh sách người dùng trong hệ thống (bảng Users - dành cho Admin)"""
    users, total = get_all_users_paginated(
        skip=skip,
        limit=limit,
        role=role,
        search=search,
        is_active=is_active
    )
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": users
    }

@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy thông tin tài khoản đang đăng nhập"""
    user = get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông tin tài khoản")
    return user

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_detail(
    user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy thông tin chi tiết của một tài khoản theo user_id"""
    if current_user["role"] != "admin" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem thông tin tài khoản người khác")
        
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserProfileUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cập nhật thông tin hồ sơ người dùng"""
    if current_user["role"] != "admin" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền sửa đổi tài khoản người khác")
        
    updated = update_user_profile(
        user_id=user_id,
        full_name=data.full_name,
        email=data.email,
        student_id=data.student_id
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng để cập nhật")
    return updated

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def remove_user(
    user_id: int,
    current_user: Dict[str, Any] = Depends(admin_required)
):
    """Xóa tài khoản người dùng khỏi hệ thống (Admin only)"""
    if current_user["user_id"] == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể tự xóa tài khoản của chính mình")
        
    deleted = delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản để xóa")
    return {"status": "success", "message": "Đã xóa tài khoản thành công"}
