from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict, Any

from core.permissions import get_current_user, instructor_or_admin_required
from schemas.template import TemplateCreateRequest, TemplateUpdateRequest
from database.template_db import (
    list_templates_full,
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
    """Lấy danh sách toàn bộ Bộ đề mẫu (BoDeMau) kèm câu hỏi & test cases từ CSDL"""
    instructor_id = current_user["user_id"] if current_user.get("role") == "instructor" else None
    return list_templates_full(instructor_id=instructor_id, room_type=room_type)


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
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required),
):
    """Tạo mới Bộ đề mẫu kèm Câu hỏi và Bộ kiểm thử (Test cases) vào SQL Server"""
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
    if current_user.get("role") != "admin" and existing.get("instructor_id") != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền sửa bộ đề của giảng viên khác")

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
    if current_user.get("role") != "admin" and existing.get("instructor_id") != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa bộ đề của giảng viên khác")

    delete_template_full(template_identifier)
    return {"success": True, "message": "Đã xóa bộ đề mẫu"}
