from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict, Any

from core.permissions import get_current_user, instructor_or_admin_required, instructor_required
from schemas.template import TemplateCreateRequest, TemplateUpdateRequest
from database.template_db import (
    list_templates_full,
    list_template_usage,
    get_template_detail,
    create_template_full,
    update_template_full,
    delete_template_full,
)

router = APIRouter()


@router.get("")
async def list_exam_templates(
    room_type: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Lấy danh sách Bộ đề mẫu kèm câu hỏi & test cases từ CSDL.
    Quy định hệ thống:
    - Admin chỉ truy cập các bộ đề cuối kỳ đã có; việc tạo bộ đề mới do giảng viên phụ trách.
    - Giảng viên quản lý các bộ đề do mình khởi tạo (hoặc tra cứu theo room_type).
    """
    is_admin = current_user.get("role") == "admin"
    instructor_id = current_user["user_id"] if current_user.get("role") == "instructor" else None
    target_room_type = "final" if is_admin else room_type
    return list_templates_full(instructor_id=instructor_id, room_type=target_room_type)


@router.get("/usage")
async def list_template_usage_endpoint(
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required),
):
    """Lấy thống kê lớp sử dụng bộ đề từ các phòng đã gán trong CSDL."""
    is_admin = current_user.get("role") == "admin"
    instructor_id = current_user["user_id"] if not is_admin else None
    return list_template_usage(instructor_id=instructor_id, final_only=is_admin)


@router.get("/{template_identifier}")
async def get_exam_template_detail(
    template_identifier: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lấy chi tiết 1 bộ đề mẫu kèm câu hỏi & test cases"""
    include_hidden = current_user.get("role") in ("instructor", "admin")
    detail = get_template_detail(template_identifier, include_hidden_tests=include_hidden)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bộ đề mẫu")
    return detail


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_exam_template(
    payload: TemplateCreateRequest,
    current_user: Dict[str, Any] = Depends(instructor_required),
):
    """Giảng viên tạo bộ đề; admin chỉ sử dụng các bộ đề cuối kỳ đã có."""
    if payload.type in ("final_exam", "cuoi_ky", "final") or "cuối kỳ" in str(payload.title).lower() or "kết thúc" in str(payload.title).lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Giảng viên không có quyền tạo đề thi kết thúc học phần (cuối kỳ)."
        )
    return create_template_full(
        instructor_id=current_user["user_id"],
        data=payload.model_dump(),
    )


@router.put("/{template_identifier}")
async def update_exam_template(
    template_identifier: str,
    payload: TemplateUpdateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required),
):
    """Cập nhật Bộ đề mẫu và danh sách câu hỏi/test cases"""
    existing = get_template_detail(template_identifier)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bộ đề mẫu")
    
    is_admin = current_user.get("role") == "admin"
    if is_admin:
        # Admin chỉ có thể quản lý đề cuối kỳ (final / final_exam)
        existing_type = str(existing.get("type", "")).lower()
        if existing_type in ("lab", "practice", "midterm", "midterm_exam"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin chỉ có quyền quản lý đề thi cuối kỳ. Đề thực hành và đề giữa kỳ do Giảng viên quản lý."
            )
        if payload.type and payload.type not in ("final", "final_exam"):
            payload.type = "final_exam"
    else:
        if existing.get("instructor_id") != current_user["user_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền sửa bộ đề của người khác")
        if (payload.type and payload.type in ("final_exam", "cuoi_ky", "final")) or (payload.title and ("cuối kỳ" in str(payload.title).lower() or "kết thúc" in str(payload.title).lower())):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Giảng viên không có quyền chỉnh sửa đề thi kết thúc học phần."
            )

    updated = update_template_full(
        identifier=template_identifier,
        instructor_id=current_user["user_id"],
        data=payload.model_dump(exclude_unset=True),
    )
    return updated


@router.delete("/{template_identifier}", status_code=status.HTTP_200_OK)
async def delete_exam_template(
    template_identifier: str,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required),
):
    """Xóa Bộ đề mẫu an toàn khỏi SQL Server"""
    existing = get_template_detail(template_identifier)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bộ đề mẫu")
    
    is_admin = current_user.get("role") == "admin"
    if is_admin:
        existing_type = str(existing.get("type", "")).lower()
        if existing_type in ("lab", "practice", "midterm", "midterm_exam"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin chỉ có quyền xóa và quản lý đề thi cuối kỳ."
            )
    else:
        if existing.get("instructor_id") != current_user["user_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa bộ đề của người khác")

    delete_template_full(template_identifier)
    return {"success": True, "message": "Đã xóa bộ đề mẫu"}
