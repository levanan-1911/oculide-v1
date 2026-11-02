from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any

from schemas.test_case import TestCaseCreateRequest, TestCaseUpdateRequest, TestCaseResponse
from core.permissions import get_current_user, instructor_or_admin_required
from database.question_db import (
    create_test_case,
    get_test_cases_by_question,
    get_test_case_by_id,
    update_test_case,
    delete_test_case,
    get_question_by_id
)

router = APIRouter()

@router.post("", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_new_test_case(
    test_case_data: TestCaseCreateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Tạo mới test case cho câu hỏi lập trình (bảng TestCases)"""
    if not test_case_data.question_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="question_id là bắt buộc")
        
    question = get_question_by_id(test_case_data.question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy câu hỏi")
        
    tc = create_test_case(
        question_id=test_case_data.question_id,
        input_data=test_case_data.input_data,
        expected_output=test_case_data.expected_output,
        is_hidden=test_case_data.is_hidden,
        points=test_case_data.points
    )
    return tc

@router.get("/question/{question_id}", response_model=List[TestCaseResponse])
async def list_question_test_cases(
    question_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách test cases của một câu hỏi (Sinh viên chỉ thấy test case công khai)"""
    question = get_question_by_id(question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy câu hỏi")
        
    is_staff = current_user["role"] in ("admin", "instructor")
    return get_test_cases_by_question(question_id, include_hidden=is_staff)

@router.get("/{test_case_id}", response_model=TestCaseResponse)
async def get_single_test_case(
    test_case_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy chi tiết một test case"""
    tc = get_test_case_by_id(test_case_id)
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy test case")
    if current_user["role"] == "student" and tc["is_hidden"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem test case ẩn")
    return tc

@router.put("/{test_case_id}", response_model=TestCaseResponse)
async def modify_test_case(
    test_case_id: int,
    data: TestCaseUpdateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Cập nhật dữ liệu test case"""
    updated = update_test_case(
        test_case_id=test_case_id,
        input_data=data.input_data,
        expected_output=data.expected_output,
        is_hidden=data.is_hidden,
        points=data.points
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy test case để cập nhật")
    return updated

@router.delete("/{test_case_id}", status_code=status.HTTP_200_OK)
async def remove_test_case(
    test_case_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Xóa một test case"""
    deleted = delete_test_case(test_case_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy test case để xóa")
    return {"status": "success", "message": "Đã xóa test case thành công"}
