from fastapi import APIRouter, Depends, Query
from typing import Optional, List, Dict, Any

from core.permissions import get_current_user
from database.room_db import get_exam_templates

router = APIRouter()

@router.get("")
async def list_exam_templates(
    room_type: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    API Lấy danh sách bộ đề mẫu (BoDeMau) trong CSDL:
    Bao gồm mã đề, tiêu đề, loại đề (lab/exam), thời lượng chuẩn, tổng điểm và số lượng câu hỏi.
    """
    instructor_id = current_user["user_id"] if current_user.get("role") == "instructor" else None
    return get_exam_templates(instructor_id=instructor_id, room_type=room_type)

