from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any

from schemas.grading_result import GradingResultResponse
from core.permissions import get_current_user
from database.submission_db import (
    get_grading_results,
    get_grading_result_by_id,
    get_submission_by_id
)

router = APIRouter()

@router.get("/submission/{submission_id}", response_model=List[GradingResultResponse])
async def list_submission_grading_results(
    submission_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách kết quả chấm bài chi tiết theo từng test case (bảng GradingResults)"""
    submission = get_submission_by_id(submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bài nộp")
        
    if current_user["role"] == "student" and submission["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem kết quả chấm của thí sinh khác")
        
    return get_grading_results(submission_id)

@router.get("/{result_id}", response_model=GradingResultResponse)
async def get_single_grading_result(
    result_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy chi tiết một kết quả chấm bài theo result_id"""
    res = get_grading_result_by_id(result_id)
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy kết quả chấm bài")
        
    submission = get_submission_by_id(res["submission_id"])
    if submission and current_user["role"] == "student" and submission["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem kết quả chấm này")
        
    return res
