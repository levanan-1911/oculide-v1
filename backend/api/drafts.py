from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any

from schemas.draft import DraftSaveRequest, DraftResponse
from core.permissions import get_current_user
from database.draft_db import upsert_code_draft, get_code_draft, delete_code_draft
from database.session_db import get_session_by_id

router = APIRouter()

@router.post("", response_model=DraftResponse, status_code=status.HTTP_200_OK)
async def save_code_draft(
    draft_data: DraftSaveRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Tự động lưu bản nháp code định kỳ (Auto-save) phòng mất điện, sập mạng"""
    session = get_session_by_id(draft_data.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên làm bài")
    
    # Chống IDOR: Chỉ sinh viên sở hữu phiên thi mới được lưu nháp
    if current_user["role"] == "student" and session["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền thao tác trên phiên thi của người khác")
    
    if session["status"] != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phiên làm bài không còn hoạt động để lưu nháp")
    
    draft = upsert_code_draft(
        session_id=draft_data.session_id,
        question_id=draft_data.question_id,
        student_id=session["student_id"],
        draft_code=draft_data.draft_code,
        language=draft_data.language
    )
    return draft

@router.get("/session/{session_id}/question/{question_id}", response_model=DraftResponse)
async def get_latest_code_draft(
    session_id: int,
    question_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy bản nháp code gần nhất khi sinh viên tải lại trang (F5/Reload)"""
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên làm bài")
    
    if current_user["role"] == "student" and session["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập bản nháp này")
        
    draft = get_code_draft(session_id, question_id)
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không có bản nháp nào cho câu hỏi này")
    return draft

@router.delete("/session/{session_id}/question/{question_id}", status_code=status.HTTP_200_OK)
async def remove_code_draft(
    session_id: int,
    question_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Xóa bản nháp sau khi đã nộp bài chính thức"""
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên làm bài")
        
    if current_user["role"] == "student" and session["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa bản nháp này")
        
    delete_code_draft(session_id, question_id)
    return {"status": "success", "message": "Đã xóa bản nháp"}
