from fastapi import APIRouter, HTTPException, Depends, Query, Body, status
from typing import Dict, Any, Optional, List
import unicodedata

from schemas.user import UserResponse, UserProfileUpdateRequest
from core.permissions import get_current_user, admin_required, instructor_or_admin_required, verify_instructor_student_access
from database.user_db import (
    get_user_by_id,
    get_all_users_paginated,
    update_user_profile,
    delete_user
)

router = APIRouter()


def _normalize_vi(text: Optional[str]) -> str:
    if not text:
        return ""
    s = text.replace("đ", "d").replace("Đ", "D")
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip().lower()


def _normalize_role_param(role: Optional[str]) -> Optional[str]:
    if not role:
        return None
    r = role.strip().upper()
    if r in ("LECTURER", "INSTRUCTOR", "GV"):
        return "instructor"
    if r in ("STUDENT", "SV"):
        return "student"
    if r == "ADMIN":
        return "admin"
    return role.strip().lower()


@router.get("/search", response_model=Dict[str, Any])
async def search_users_for_selection(
    role: Optional[str] = Query(None, description="LECTURER | STUDENT"),
    q: str = Query("", description="Từ khóa tìm kiếm (Họ tên, Mã GV/MSSV, Email)"),
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    current_user: Dict[str, Any] = Depends(admin_required),
):
    """Tìm kiếm đa trường không dấu tiếng Việt, ưu tiên khớp chính xác mã định danh."""
    db_role = _normalize_role_param(role)
    kw = _normalize_vi(q)

    users_list, _ = get_all_users_paginated(skip=0, limit=5000, role=db_role, is_active=True)

    matched = []
    for u in users_list:
        user_id = u.get("user_id")
        username = u.get("username") or ""
        student_id = u.get("student_id") or ""
        full_name_str = (u.get("full_name") or username or "").strip()
        email_str = (u.get("email") or "").strip()
        dept_str = (u.get("department") or "").strip()
        lop_sinh_hoat = (u.get("lop_sinh_hoat") or "").strip()
        u_role = (u.get("role") or "").lower()
        code = (student_id or username or str(user_id)).strip()
        sub_info = dept_str if u_role == "instructor" else lop_sinh_hoat

        norm_code = _normalize_vi(code)
        norm_name = _normalize_vi(full_name_str)
        norm_email = _normalize_vi(email_str)

        if not kw:
            priority = 0
        elif norm_code == kw:
            priority = 0
        elif norm_code.startswith(kw):
            priority = 1
        elif norm_name.startswith(kw) or any(part.startswith(kw) for part in norm_name.split()):
            priority = 2
        elif kw in norm_name or kw in norm_code:
            priority = 3
        elif kw in norm_email:
            priority = 4
        else:
            continue

        matched.append((
            priority,
            full_name_str.lower(),
            {
                "id": user_id,
                "code": code,
                "fullName": full_name_str,
                "email": email_str,
                "department": dept_str,
                "subInfo": sub_info,
            },
        ))

    matched.sort(key=lambda x: (x[0], x[1]))
    total = len(matched)
    offset = (page - 1) * limit
    page_items = [item[2] for item in matched[offset : offset + limit]]

    return {
        "items": page_items,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": offset + len(page_items) < total,
    }


@router.post("/bulk-lookup", response_model=Dict[str, Any])
async def bulk_lookup_users_by_code(
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(admin_required),
):
    """Đối chiếu hàng loạt danh sách MSSV/Mã định danh từ CSDL."""
    raw_codes = payload.get("codes") or []
    db_role = _normalize_role_param(payload.get("role") or "STUDENT")
    clean_codes = []
    seen = set()
    for c in raw_codes:
        val = str(c or "").strip().upper()
        if val and val not in seen:
            seen.add(val)
            clean_codes.append(val)

    if not clean_codes:
        return {"matched": [], "not_found": []}

    users_list, _ = get_all_users_paginated(skip=0, limit=5000, role=db_role, is_active=True)

    by_code: Dict[str, Dict[str, Any]] = {}
    for u in users_list:
        user_id = u.get("user_id")
        username = (u.get("username") or "").strip()
        student_id = (u.get("student_id") or "").strip()
        code = (student_id or username or str(user_id)).strip()
        item = {
            "id": user_id,
            "code": code,
            "fullName": (u.get("full_name") or username or "").strip(),
            "email": (u.get("email") or "").strip(),
            "department": (u.get("department") or "").strip(),
            "subInfo": (u.get("lop_sinh_hoat") or "").strip(),
        }
        if student_id:
            by_code[student_id.upper()] = item
        if username:
            by_code[username.upper()] = item

    matched_items = []
    not_found = []
    for c in clean_codes:
        if c in by_code:
            matched_items.append(by_code[c])
        else:
            not_found.append(c)

    return {"matched": matched_items, "not_found": not_found}


@router.post("/{user_id}/unlock-session")
async def unlock_user_session(
    user_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required),
):
    """Giám thị hoặc Admin mở khóa phiên & gỡ khóa tạm thời để thí sinh đăng nhập ngay."""
    verify_instructor_student_access(user_id, current_user)
    from services.session_manager import SessionManager
    from database.user_db import reset_user_lockout
    SessionManager.clear_session(user_id)
    reset_user_lockout(user_id)
    return {"message": f"Đã mở khóa phiên và gỡ khóa tạm thời cho tài khoản #{user_id}.", "user_id": user_id}

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
