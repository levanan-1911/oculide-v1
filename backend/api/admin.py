from fastapi import APIRouter, HTTPException, Depends, status, Query, BackgroundTasks
from typing import Optional, List, Dict, Any
import secrets
import string

from schemas.admin import (
    AdminUserCreateRequest, AdminUserStatusUpdate, AdminUserRoleUpdate,
    AdminUserUpdateRequest, PaginatedUsersResponse, BatchImportRequest, BatchImportResult
)
from schemas.auth import UserResponse
from core.permissions import admin_required
from database.user_db import (
    get_user_by_id, get_user_by_username, get_user_by_email,
    create_user, get_all_users_paginated, update_user_status,
    update_user_role, update_user_profile, delete_user, change_user_password
)
from database.room_db import get_system_overview_stats
from database.system_log_db import get_system_logs
from services.email_service import EmailService

router = APIRouter(dependencies=[Depends(admin_required)])

@router.get("/users", response_model=PaginatedUsersResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    search: Optional[str] = None
):
    """Lấy danh sách người dùng hệ thống có tìm kiếm và phân trang"""
    skip = (page - 1) * page_size
    users, total = get_all_users_paginated(skip=skip, limit=page_size, role=role, search=search)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return {
        "users": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(
    user_data: AdminUserCreateRequest,
    background_tasks: BackgroundTasks
):
    """Admin tạo tài khoản người dùng mới và tự động gửi thông tin đăng nhập về email"""
    # 1. Xác định username: Tên đăng nhập luôn là phần trước dấu @ của email (VD: phamvanlong@dtu.edu.vn -> phamvanlong)
    clean_email = user_data.email.strip().lower()
    final_username = clean_email.split("@")[0].strip().lower()

    if get_user_by_username(final_username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tên tài khoản (username) '{final_username}' (lấy từ email {clean_email}) đã tồn tại trong hệ thống."
        )
    if get_user_by_email(clean_email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email này đã được sử dụng")

    # 2. Xác định mật khẩu: nếu không truyền, tự động sinh mật khẩu ngẫu nhiên bảo mật
    if not user_data.password:
        chars = string.ascii_letters + string.digits + "!@#$%"
        raw_password = "".join(secrets.choice(chars) for _ in range(10))
    else:
        raw_password = user_data.password
        
    new_user = create_user(
        username=final_username,
        password=raw_password,
        email=clean_email,
        full_name=user_data.full_name,
        role=user_data.role,
        student_id=user_data.student_id,
        is_active=user_data.is_active,
        department=user_data.department,
        lop_sinh_hoat=user_data.lop_sinh_hoat
    )

    # 3. Gửi email thông tin tài khoản và mật khẩu khởi tạo về cho sinh viên/giảng viên qua Brevo
    background_tasks.add_task(
        EmailService.send_account_credentials_email,
        to_email=new_user["email"],
        username=new_user["username"],
        raw_password=raw_password,
        full_name=new_user["full_name"],
        role=new_user["role"],
        ma_dinh_danh=new_user.get("student_id") or new_user.get("ma_dinh_danh")
    )
    
    return new_user

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_details(user_id: int):
    """Xem thông tin chi tiết người dùng"""
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    return user

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user_by_admin(user_id: int, user_data: AdminUserUpdateRequest):
    """Admin cập nhật thông tin người dùng trong CSDL SQL Server"""
    existing_user = get_user_by_id(user_id)
    if not existing_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")

    # 1. Kiểm tra trùng email nếu email thay đổi
    if user_data.email:
        clean_email = user_data.email.strip().lower()
        if clean_email != (existing_user.get("email") or "").strip().lower():
            other = get_user_by_email(clean_email)
            if other and other.get("user_id") != user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email '{clean_email}' đã được sử dụng bởi tài khoản khác trong hệ thống."
                )

    # 2. Xác định vai trò mục tiêu
    target_role = user_data.role if user_data.role else existing_user.get("role")

    # 3. Chuẩn hóa lớp sinh hoạt: sinh viên giữ lớp, giảng viên/admin xóa lớp
    clean_lop_sinh_hoat = user_data.lop_sinh_hoat.strip() if user_data.lop_sinh_hoat else ""
    if target_role != "student":
        clean_lop_sinh_hoat = ""

    # 4. Cập nhật thông tin profile
    update_user_profile(
        user_id=user_id,
        full_name=user_data.full_name.strip() if user_data.full_name else None,
        email=user_data.email.strip().lower() if user_data.email else None,
        student_id=user_data.student_id.strip().upper() if user_data.student_id is not None else None,
        department=user_data.department.strip() if user_data.department is not None else None,
        lop_sinh_hoat=clean_lop_sinh_hoat if (user_data.lop_sinh_hoat is not None or target_role != "student") else None
    )

    # 5. Cập nhật vai trò nếu có thay đổi
    if user_data.role and user_data.role != existing_user.get("role"):
        update_user_role(user_id, user_data.role)

    # 6. Cập nhật trạng thái kích hoạt nếu có thay đổi
    if user_data.is_active is not None and user_data.is_active != existing_user.get("is_active"):
        update_user_status(user_id, user_data.is_active)

    updated = get_user_by_id(user_id)
    return updated

@router.put("/users/{user_id}/status", response_model=UserResponse)
async def toggle_user_status(user_id: int, status_data: AdminUserStatusUpdate):
    """Kích hoạt hoặc vô hiệu hóa tài khoản người dùng"""
    if not get_user_by_id(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    update_user_status(user_id, status_data.is_active)
    return get_user_by_id(user_id)

@router.put("/users/{user_id}/role", response_model=UserResponse)
async def change_user_role(user_id: int, role_data: AdminUserRoleUpdate):
    """Cập nhật quyền vai trò người dùng (admin, instructor, student)"""
    if not get_user_by_id(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    update_user_role(user_id, role_data.role)
    return get_user_by_id(user_id)

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: int, background_tasks: BackgroundTasks):
    """Đặt lại mật khẩu người dùng về mật khẩu ngẫu nhiên và gửi về email"""
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    
    chars = string.ascii_letters + string.digits + "!@#$%"
    random_password = "".join(secrets.choice(chars) for _ in range(10))
    change_user_password(user_id, random_password)

    # Gửi mật khẩu mới trực tiếp về email của sinh viên / giảng viên
    background_tasks.add_task(
        EmailService.send_account_credentials_email,
        to_email=user["email"],
        username=user["username"],
        raw_password=random_password,
        full_name=user.get("full_name") or user["username"],
        role=user.get("role", "student"),
        ma_dinh_danh=user.get("student_id") or user.get("ma_dinh_danh")
    )

    return {
        "message": f"Đặt lại mật khẩu thành công. Thông tin đã được gửi về email {user['email']}.",
        "new_temporary_password": random_password
    }

@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def remove_user(
    user_id: int,
    current_user: Dict[str, Any] = Depends(admin_required)
):
    """Xóa tài khoản người dùng khỏi hệ thống (Admin only)"""
    if current_user.get("user_id") == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự xóa tài khoản của chính mình."
        )
    if not get_user_by_id(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")
    delete_user(user_id)
    return {"message": f"Đã xóa thành công người dùng ID {user_id}"}

@router.post("/users/batch-import", response_model=BatchImportResult)
async def batch_import_users(data: BatchImportRequest, background_tasks: BackgroundTasks):
    """Nhập danh sách tài khoản theo lô và tự động gửi thông tin đăng nhập về email từng người"""
    imported = 0
    failed = 0
    errors = []
    
    for u in data.users:
        try:
            # Chuẩn hóa email và username
            u_email = (u.email or "").strip().lower()
            if not u_email or "@" not in u_email:
                if u.student_id:
                    u_email = f"{u.student_id.strip().lower()}@dtu.edu.vn"
                elif u.username:
                    u_email = f"{u.username.strip().lower()}@dtu.edu.vn"
                else:
                    errors.append(f"Bỏ qua sinh viên '{u.full_name}': Không có thông tin email hợp lệ.")
                    failed += 1
                    continue

            username = u_email.split("@")[0].strip().lower() if u_email else (u.username or u.student_id or "").strip().lower()
            
            if get_user_by_username(username):
                errors.append(f"Tên tài khoản '{username}' (từ {u_email}) đã tồn tại.")
                failed += 1
                continue
            if get_user_by_email(u_email):
                errors.append(f"Email '{u_email}' đã tồn tại trong hệ thống.")
                failed += 1
                continue

            if not u.password:
                chars = string.ascii_letters + string.digits + "!@#$%"
                pwd = "".join(secrets.choice(chars) for _ in range(10))
            else:
                pwd = u.password

            new_u = create_user(
                username=username,
                password=pwd,
                email=u_email,
                full_name=u.full_name,
                role=data.role,
                student_id=u.student_id,
                department=u.department,
                lop_sinh_hoat=u.lop_sinh_hoat
            )
            imported += 1

            # Gửi email cấp tài khoản tự động cho từng sinh viên / giảng viên trong danh sách
            background_tasks.add_task(
                EmailService.send_account_credentials_email,
                to_email=u_email,
                username=username,
                raw_password=pwd,
                full_name=u.full_name or username,
                role=data.role,
                ma_dinh_danh=u.student_id
            )
        except Exception as e:
            failed += 1
            errors.append(f"Lỗi thêm {u.student_id or u.email}: {str(e)}")
            
    return {"total_imported": imported, "failed_count": failed, "errors": errors}

@router.get("/system/overview")
async def system_overview():
    """Lấy số liệu thống kê tổng quan hệ thống cho Admin"""
    return get_system_overview_stats()

@router.get("/logs")
async def list_system_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    log_level: Optional[str] = None,
    module: Optional[str] = None,
    user_id: Optional[int] = None
):
    """Lấy danh sách nhật ký kiểm toán hệ thống từ bảng SystemLogs"""
    skip = (page - 1) * page_size
    logs, total = get_system_logs(skip=skip, limit=page_size, log_level=log_level, module=module, user_id=user_id)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

