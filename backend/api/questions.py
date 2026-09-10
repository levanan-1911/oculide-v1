from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional, List, Dict, Any

from schemas.question import (
    QuestionCreateRequest, QuestionUpdateRequest, QuestionResponse,
    TestCaseCreateRequest, TestCaseResponse
)
from core.permissions import get_current_user, instructor_or_admin_required
from database.question_db import (
    create_question, get_question_by_id, get_questions_by_room,
    update_question, delete_question, get_test_cases_by_question,
    create_test_case, delete_test_case, get_test_case_by_id, update_test_case
)
from database.room_db import get_room_by_id

router = APIRouter()

@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_question(
    question_data: QuestionCreateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Tạo mới câu hỏi/đề bài lập trình cho phòng thi"""
    room = get_room_by_id(question_data.room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền thêm câu hỏi vào phòng này")
        
    created_q = create_question(
        room_id=question_data.room_id,
        question_order=question_data.question_order,
        question_title=question_data.question_title,
        question_description=question_data.question_description,
        question_type=question_data.question_type,
        programming_language=question_data.programming_language,
        max_points=question_data.max_points,
        time_limit_minutes=question_data.time_limit_minutes,
        memory_limit_mb=question_data.memory_limit_mb
    )
    
    # Tạo test cases nếu có gửi kèm
    if question_data.test_cases:
        for tc in question_data.test_cases:
            create_test_case(
                question_id=created_q["question_id"],
                input_data=tc.input_data,
                expected_output=tc.expected_output,
                is_hidden=tc.is_hidden,
                points=tc.points
            )
        created_q["test_cases"] = get_test_cases_by_question(created_q["question_id"])
        
    return created_q

@router.get("/room/{room_id}", response_model=List[QuestionResponse])
async def list_questions_in_room(
    room_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách câu hỏi trong phòng (Sinh viên sẽ không thấy test cases ẩn)"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    
    is_staff = current_user["role"] in ("admin", "instructor")
    return get_questions_by_room(room_id, include_hidden_tests=is_staff)

@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question_details(
    question_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy chi tiết đề bài câu hỏi"""
    q = get_question_by_id(question_id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy câu hỏi")
    
    # Nếu là sinh viên thì chỉ xem test case công khai
    if current_user["role"] == "student":
        q["test_cases"] = [tc for tc in q.get("test_cases", []) if not tc.get("is_hidden")]
    return q

@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question_details(
    question_id: int,
    question_data: QuestionUpdateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Chỉnh sửa câu hỏi"""
    q = get_question_by_id(question_id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy câu hỏi")
    
    updated = update_question(question_id, **question_data.model_dump(exclude_unset=True))
    return updated

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_question(
    question_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Xóa câu hỏi khỏi đề thi"""
    q = get_question_by_id(question_id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy câu hỏi")
    delete_question(question_id)
    return None

# ─── TEST CASES ─────────────────────────────────────────────────────────────
@router.get("/{question_id}/test-cases", response_model=List[TestCaseResponse])
async def list_test_cases(
    question_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giảng viên xem toàn bộ danh sách test cases (bao gồm ẩn và công khai)"""
    return get_test_cases_by_question(question_id, include_hidden=True)

@router.post("/{question_id}/test-cases", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def add_test_case(
    question_id: int,
    tc_data: TestCaseCreateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Thêm test case mới cho câu hỏi"""
    q = get_question_by_id(question_id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy câu hỏi")
    return create_test_case(
        question_id=question_id,
        input_data=tc_data.input_data,
        expected_output=tc_data.expected_output,
        is_hidden=tc_data.is_hidden,
        points=tc_data.points
    )

@router.put("/{question_id}/test-cases/{test_case_id}", response_model=TestCaseResponse)
async def update_test_case_endpoint(
    question_id: int,
    test_case_id: int,
    tc_data: TestCaseCreateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Chỉnh sửa thông tin test case (input, output, ẩn/hiện, điểm)"""
    tc = get_test_case_by_id(test_case_id)
    if not tc or tc["question_id"] != question_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy test case")
        
    updated = update_test_case(
        test_case_id=test_case_id,
        input_data=tc_data.input_data,
        expected_output=tc_data.expected_output,
        is_hidden=tc_data.is_hidden,
        points=tc_data.points
    )
    return updated

@router.delete("/{question_id}/test-cases/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_test_case(
    question_id: int,
    test_case_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Xóa test case"""
    delete_test_case(test_case_id)
    return None

