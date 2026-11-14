from fastapi import APIRouter, HTTPException, Depends, Query, Request, status
from typing import List, Dict, Any, Optional

from schemas.system_log import SystemLogCreateRequest, SystemLogResponse
from core.permissions import admin_required
from database.system_log_db import create_system_log, get_system_logs

router = APIRouter()

@router.get("", response_model=Dict[str, Any])
async def list_system_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    log_level: Optional[str] = None,
    module: Optional[str] = None,
    user_id: Optional[int] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(admin_required)
):
    """Truy vấn danh sách nhật ký hệ thống (bảng NhatKyHeThong) với bộ lọc và phân trang"""
    logs, total = get_system_logs(
        skip=skip,
        limit=limit,
        log_level=log_level,
        module=module,
        user_id=user_id,
        role=role,
        search=search
    )
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": logs
    }

@router.post("", response_model=SystemLogResponse, status_code=status.HTTP_201_CREATED)
async def add_system_log(
    log_data: SystemLogCreateRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(admin_required)
):
    """Ghi nhận nhật ký kiểm toán mới vào bảng NhatKyHeThong"""
    client_ip = log_data.ip_address
    if not client_ip:
        client_ip = request.client.host if request.client else "127.0.0.1"
        
    log_record = create_system_log(
        log_level=log_data.log_level,
        module=log_data.module,
        message=log_data.message,
        user_id=log_data.user_id or current_user.get("user_id"),
        ip_address=client_ip,
        extra_data=log_data.extra_data
    )
    return log_record
