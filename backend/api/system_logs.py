from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional
import csv
import io

from schemas.system_log import SystemLogCreateRequest, SystemLogResponse
from core.permissions import admin_required
from api.auth import extract_client_ip
from database.system_log_db import create_system_log, get_system_logs

router = APIRouter()


def _resolve_date_range(date_range: Optional[str], start_date: Optional[str], end_date: Optional[str]):
    now = datetime.now()
    if date_range == "today":
        return now.strftime("%Y-%m-%d 00:00:00"), now.strftime("%Y-%m-%d 23:59:59")
    if date_range == "7d":
        return (now - timedelta(days=7)).strftime("%Y-%m-%d 00:00:00"), now.strftime("%Y-%m-%d 23:59:59")
    sd = f"{start_date} 00:00:00" if start_date and len(start_date) == 10 else start_date
    ed = f"{end_date} 23:59:59" if end_date and len(end_date) == 10 else end_date
    return sd, ed


@router.get("", response_model=Dict[str, Any])
async def list_system_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    log_level: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    module: Optional[str] = None,
    user_id: Optional[int] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(admin_required),
):
    """Truy vấn danh sách nhật ký hệ thống chuẩn hóa với bộ lọc và phân trang."""
    sd, ed = _resolve_date_range(date_range, start_date, end_date)
    logs, total = get_system_logs(
        skip=skip,
        limit=limit,
        log_level=log_level,
        severity=severity,
        category=category,
        status_filter=status_filter,
        module=module,
        user_id=user_id,
        role=role,
        search=search,
        start_date=sd,
        end_date=ed,
    )
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": logs,
    }


def _sanitize_csv_cell(value: Any) -> str:
    """Chống CSV Formula Injection (Excel) bằng cách thêm dấu nháy đơn trước =, +, -, @, \\t, \\r."""
    if value is None:
        return ""
    s = str(value)
    if s and (s[0] in ("=", "+", "-", "@", "\t", "\r") or s.lstrip(" ")[0:1] in ("=", "+", "-", "@", "\t", "\r")):
        return f"'{s}"
    return s


@router.get("/export")
async def export_system_logs_csv(
    severity: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    role: Optional[str] = None,
    search: Optional[str] = None,
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(admin_required),
):
    """Xuất báo cáo nhật ký hệ thống ra CSV chuẩn UTF-8 BOM theo bộ lọc hiện tại."""
    sd, ed = _resolve_date_range(date_range, start_date, end_date)
    logs, _ = get_system_logs(
        skip=0,
        limit=2000,
        severity=severity,
        category=category,
        status_filter=status_filter,
        role=role,
        search=search,
        start_date=sd,
        end_date=ed,
    )

    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow(["ID", "Thời gian", "Mã sự kiện", "Hành động", "Phân hệ", "Mức độ", "Trạng thái", "Người thực hiện", "Vai trò", "Mã định danh", "IP", "Chi tiết"])

    for log in logs:
        actor = log.get("actor_json") if isinstance(log.get("actor_json"), dict) else {}
        row = [
            log.get("log_id"),
            str(log.get("created_at") or ""),
            log.get("event_code") or "",
            log.get("action_label") or log.get("module") or "",
            log.get("category") or "SYSTEM",
            log.get("severity") or "INFO",
            log.get("status") or "SUCCESS",
            actor.get("fullName") or log.get("actor_name") or "Hệ thống",
            actor.get("role") or log.get("actor_role") or "SYSTEM",
            actor.get("code") or log.get("actor_code") or "",
            log.get("ip_address") or "",
            log.get("message") or "",
        ]
        writer.writerow([_sanitize_csv_cell(cell) for cell in row])

    output.seek(0)
    filename = f"oculide_audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("", response_model=SystemLogResponse, status_code=status.HTTP_201_CREATED)
async def add_system_log(
    log_data: SystemLogCreateRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(admin_required),
):
    """Ghi nhận nhật ký kiểm toán mới vào bảng SystemAuditLogs."""
    client_ip = log_data.ip_address or extract_client_ip(request)
    log_record = create_system_log(
        log_level=log_data.log_level,
        module=log_data.module,
        message=log_data.message,
        user_id=log_data.user_id or current_user.get("user_id"),
        ip_address=client_ip,
        extra_data=log_data.extra_data,
        user_agent=request.headers.get("user-agent", ""),
    )
    return log_record
