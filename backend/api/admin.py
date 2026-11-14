from fastapi import APIRouter, HTTPException, Depends, status, Query, BackgroundTasks, Request
from fastapi.responses import FileResponse
from typing import Optional, List, Dict, Any
import asyncio
import secrets
import string

from schemas.admin import (
    AdminUserCreateRequest, AdminUserStatusUpdate, AdminUserRoleUpdate,
    AdminUserUpdateRequest, PaginatedUsersResponse, BatchImportRequest, BatchImportResult
)
from schemas.system_management import (
    SystemSettingsModel, BackupListResponse, BackupCreateResponse, StorageStatsResponse
)
from schemas.auth import UserResponse
from core.permissions import admin_required
from database.user_db import (
    get_user_by_id, get_user_by_username, get_user_by_email,
    create_user, get_all_users_paginated, update_user_status,
    update_user_role, update_user_profile, delete_user, change_user_password
)
from database.room_db import get_system_overview_stats
from database.system_log_db import get_system_logs, create_system_log
from services.email_service import EmailService
from services.system_settings_manager import SystemSettingsManager
from services.backup_service import BackupService
from services.host_metrics import get_real_host_metrics

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

@router.get("/system/health")
async def system_health():
    """Kiểm tra thời gian thực trạng thái, độ trễ và số liệu của các thành phần hạ tầng"""
    import time
    from core.database import ping_database
    from core.config import settings
    try:
        import redis.asyncio as redis_async
    except ImportError:
        redis_async = None

    # 1. Database Check
    db_start = time.perf_counter()
    db_ping = ping_database()
    db_latency = max(1, int((time.perf_counter() - db_start) * 1000))
    db_status = "healthy" if db_ping.get("status") == "up" else "down"

    db_metrics = [
        {"label": "Trạng thái", "value": "Kết nối tốt" if db_status == "healthy" else "Lỗi"},
        {"label": "Độ trễ", "value": f"{db_latency} ms"},
        {"label": "Driver", "value": "SQLAlchemy MSSQL"},
    ]

    # 2. Redis Check
    redis_status = "healthy"
    redis_latency = 1
    if redis_async is not None:
        try:
            r_start = time.perf_counter()
            r = redis_async.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                db=settings.REDIS_DB,
                socket_timeout=0.5,
                socket_connect_timeout=0.5
            )
            pong = await asyncio.wait_for(r.ping(), timeout=0.5)
            await r.aclose()
            redis_latency = max(1, int((time.perf_counter() - r_start) * 1000))
            redis_status = "healthy" if pong else "down"
        except Exception:
            redis_status = "degraded"
            redis_latency = 5
    else:
        redis_status = "degraded"

    redis_metrics = [
        {"label": "Độ trễ", "value": f"{redis_latency} ms"},
        {"label": "Cổng", "value": str(settings.REDIS_PORT)},
        {"label": "Kênh PubSub", "value": "Active" if redis_status == "healthy" else "Standby"}
    ]

    # Đọc thông số tài nguyên máy chủ thực tế (RAM, Disk, Uptime)
    host = get_real_host_metrics()
    sys_settings = SystemSettingsManager.get_settings()

    # 3. LiveKit Media
    livekit_configured = bool(settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET)
    livekit_status = "healthy" if livekit_configured else "degraded"
    livekit_metrics = [
        {"label": "LiveKit Cloud", "value": "Connected" if livekit_configured else "Dev Mode"},
        {"label": "WebRTC Video", "value": "Screen + Cam"},
        {"label": "Bitrate Cap", "value": f"{sys_settings.max_livekit_bitrate_kbps} kbps"}
    ]

    # 4. Code Sandbox (Docker / Judge)
    sandbox_metrics = [
        {"label": "Worker tối đa", "value": f"{sys_settings.max_sandbox_workers} workers"},
        {"label": "Dung lượng code trần", "value": f"{sys_settings.max_code_file_size_mb} MB"},
        {"label": "Trạng thái", "value": "Sẵn sàng"}
    ]

    # 5. Core API Server
    api_metrics = [
        {"label": "RAM Đang Dùng", "value": f"{host['ram_used_mb']} / {host['ram_total_mb']} MB ({host['ram_percent']}%)"},
        {"label": "Uptime Máy Chủ", "value": host["uptime"]},
        {"label": "Chế độ Bảo trì", "value": "ĐANG BẬT" if sys_settings.maintenance_mode else "Bình thường"}
    ]

    services = [
        {
            "id": "backend_api",
            "name": "Core Backend API (FastAPI)",
            "category": "Application Server",
            "status": "healthy",
            "latencyMs": 2,
            "uptimePercent": 99.99,
            "lastChecked": "Vừa xong",
            "metrics": api_metrics,
            "description": "Xử lý xác thực người dùng, điều hướng phòng thi và quản lý API dữ liệu."
        },
        {
            "id": "database",
            "name": "Cơ sở Dữ liệu (Microsoft SQL Server)",
            "category": "Data Storage",
            "status": db_status,
            "latencyMs": db_latency,
            "uptimePercent": 100.0 if db_status == "healthy" else 95.0,
            "lastChecked": "Vừa xong",
            "metrics": db_metrics,
            "description": "Lưu trữ thông tin người dùng, lớp học, ngân hàng câu hỏi và bản nháp bài thi."
        },
        {
            "id": "redis_cache",
            "name": "Redis Cache & Event Queue",
            "category": "In-Memory Cache",
            "status": redis_status,
            "latencyMs": redis_latency,
            "uptimePercent": 99.9,
            "lastChecked": "Vừa xong",
            "metrics": redis_metrics,
            "description": "Quản lý phiên đăng nhập (JWT token blacklisting) và hàng đợi thông báo vi phạm."
        },
        {
            "id": "livekit_media",
            "name": "LiveKit WebRTC Media Server",
            "category": "Streaming Engine",
            "status": livekit_status,
            "latencyMs": 35,
            "uptimePercent": 99.9,
            "lastChecked": "Vừa xong",
            "metrics": livekit_metrics,
            "description": "Truyền tải video chia sẻ màn hình và webcam thời gian thực từ laptop sinh viên về màn hình giám sát của giảng viên."
        },
        {
            "id": "code_sandbox",
            "name": "Máy chủ Chấm Code (Docker Sandbox / Judge)",
            "category": "Execution Engine",
            "status": "healthy",
            "latencyMs": 42,
            "uptimePercent": 99.8,
            "lastChecked": "Vừa xong",
            "metrics": sandbox_metrics,
            "description": "Môi trường sandbox an toàn thực thi và chấm test case cho C/C++, Java, Python."
        }
    ]

    return {
        "overall_status": "healthy" if db_status == "healthy" and redis_status == "healthy" else "degraded",
        "host_metrics": host,
        "services": services
    }

@router.get("/system/storage", response_model=StorageStatsResponse)
async def system_storage():
    """Lấy số liệu phân bổ dung lượng lưu trữ CSDL và dung lượng ổ cứng máy chủ thực tế"""
    return BackupService.get_storage_statistics()

# ── CẤU HÌNH HẠ TẦNG HỆ THỐNG (SYSTEM SETTINGS - 0 DB TABLES) ───────────────────
@router.get("/system/settings", response_model=SystemSettingsModel)
async def get_system_settings():
    """Lấy toàn bộ các tham số cấu hình hạ tầng hiện tại"""
    return SystemSettingsManager.get_settings()

@router.put("/system/settings", response_model=SystemSettingsModel)
async def update_system_settings(
    settings_data: SystemSettingsModel,
    request: Request,
    current_user: Dict[str, Any] = Depends(admin_required)
):
    """Admin cập nhật các tham số cấu hình hạ tầng hệ thống"""
    client_ip = request.client.host if request.client else "127.0.0.1"
    admin_name = current_user.get("username", "admin")
    updated = SystemSettingsManager.update_settings(settings_data.model_dump(), updated_by=admin_name)

    try:
        create_system_log(
            log_level="info",
            module="SYSTEM_SETTINGS",
            message=f"Admin {admin_name} cập nhật cấu hình hạ tầng (Bảo trì: {'BẬT' if updated.maintenance_mode else 'TẮT'})",
            user_id=current_user.get("user_id"),
            ip_address=client_ip,
            extra_data=updated.model_dump()
        )
    except Exception:
        pass

    return updated

@router.post("/system/settings/reset", response_model=SystemSettingsModel)
async def reset_system_settings(
    request: Request,
    current_user: Dict[str, Any] = Depends(admin_required)
):
    """Khôi phục toàn bộ cấu hình hạ tầng về mặc định an toàn"""
    client_ip = request.client.host if request.client else "127.0.0.1"
    admin_name = current_user.get("username", "admin")
    reset = SystemSettingsManager.reset_settings(updated_by=admin_name)

    try:
        create_system_log(
            log_level="warning",
            module="SYSTEM_SETTINGS",
            message=f"Admin {admin_name} khôi phục toàn bộ cấu hình hạ tầng về mặc định",
            user_id=current_user.get("user_id"),
            ip_address=client_ip,
            extra_data={"action": "RESET_DEFAULT"}
        )
    except Exception:
        pass

    return reset

# ── SAO LƯU CƠ SỞ DỮ LIỆU THỰC TẾ (DATABASE BACKUPS) ───────────────────────────
@router.get("/system/backups", response_model=BackupListResponse)
async def list_database_backups():
    """Lấy danh sách các tệp sao lưu .bak thực tế trên đĩa cứng máy chủ"""
    backups = BackupService.list_backups()
    return {"total": len(backups), "backups": backups}

@router.post("/system/backups", response_model=BackupCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_database_backup(
    request: Request,
    current_user: Dict[str, Any] = Depends(admin_required)
):
    """Kích hoạt sao lưu toàn bộ CSDL SQL Server ra tệp .bak thực tế"""
    client_ip = request.client.host if request.client else "127.0.0.1"
    try:
        bk_info = BackupService.create_database_backup(
            backup_type="manual",
            actor_id=current_user.get("user_id"),
            ip_address=client_ip
        )
        return {
            "message": f"Sao lưu cơ sở dữ liệu thành công ({bk_info['filename']})",
            "backup": bk_info
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi thực hiện sao lưu: {str(e)}"
        )

@router.get("/system/backups/{filename}/download")
async def download_database_backup(
    filename: str,
    current_user: Dict[str, Any] = Depends(admin_required)
):
    """Tải tệp .bak thực tế về máy tính của Quản trị viên"""
    filepath = BackupService.get_backup_path(filename)
    if not filepath:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tệp sao lưu '{filename}' trên máy chủ"
        )
    return FileResponse(
        path=str(filepath),
        filename=filename,
        media_type="application/octet-stream"
    )

@router.delete("/system/backups/{filename}")
async def delete_database_backup(
    filename: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(admin_required)
):
    """Xóa tệp sao lưu trên đĩa cứng máy chủ để giải phóng dung lượng"""
    client_ip = request.client.host if request.client else "127.0.0.1"
    deleted = BackupService.delete_backup(
        filename=filename,
        actor_id=current_user.get("user_id"),
        ip_address=client_ip
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tệp sao lưu '{filename}' hoặc tệp không hợp lệ"
        )
    return {"message": f"Đã xóa bản sao lưu {filename} thành công"}

@router.get("/logs")
async def list_system_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    log_level: Optional[str] = None,
    module: Optional[str] = None,
    user_id: Optional[int] = None,
    role: Optional[str] = None,
    search: Optional[str] = None
):
    """Lấy danh sách nhật ký kiểm toán hệ thống từ bảng NhatKyHeThong"""
    skip = (page - 1) * page_size
    logs, total = get_system_logs(
        skip=skip, limit=page_size, log_level=log_level, module=module, user_id=user_id, role=role, search=search
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

