from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional

from schemas.classes import ClassCreateRequest, ClassUpdateRequest, ClassResponse
from core.permissions import get_current_user, instructor_or_admin_required
from database.classes_db import (
    create_class,
    get_class_by_id,
    get_classes_by_instructor,
    update_class,
    delete_class
)

router = APIRouter()

@router.post("", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def add_class(
    data: ClassCreateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giảng viên tạo lớp học phần mới"""
    try:
        new_cls = create_class(
            class_code=data.class_code,
            class_name=data.class_name,
            instructor_id=current_user["user_id"],
            description=data.description
        )
        new_cls["instructor_name"] = current_user.get("full_name")
        return new_cls
    except Exception as e:
        if "UNIQUE" in str(e).upper() or "UQ" in str(e).upper():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã lớp học đã tồn tại")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("", response_model=List[ClassResponse])
async def list_classes(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách các lớp học (Giảng viên thấy lớp của mình, Admin thấy toàn bộ)"""
    if current_user["role"] == "admin":
        return get_classes_by_instructor(None)
    elif current_user["role"] == "instructor":
        return get_classes_by_instructor(current_user["user_id"])
    else:
        # Sinh viên: tạm thời xem danh sách lớp của hệ thống
        return get_classes_by_instructor(None)

@router.get("/{class_id}", response_model=ClassResponse)
async def get_class_details(
    class_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy thông tin chi tiết một lớp học"""
    cls = get_class_by_id(class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lớp học")
    return cls

@router.put("/{class_id}", response_model=ClassResponse)
async def edit_class(
    class_id: int,
    data: ClassUpdateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giảng viên cập nhật thông tin lớp học"""
    cls = get_class_by_id(class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lớp học")
    if current_user["role"] != "admin" and cls["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền chỉnh sửa lớp của giảng viên khác")
        
    updated = update_class(class_id, class_name=data.class_name, description=data.description)
    return updated

@router.delete("/{class_id}", status_code=status.HTTP_200_OK)
async def remove_class(
    class_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giảng viên xóa lớp học"""
    cls = get_class_by_id(class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lớp học")
    if current_user["role"] != "admin" and cls["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa lớp của giảng viên khác")
        
    delete_class(class_id)
    return {"status": "success", "message": "Đã xóa lớp học"}
