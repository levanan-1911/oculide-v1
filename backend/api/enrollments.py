from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any

from schemas.enrollment import EnrollmentCreateRequest, EnrollmentResponse
from core.permissions import get_current_user, instructor_or_admin_required
from database.enrollment_db import (
    enroll_student,
    get_enrollments_by_room,
    remove_enrollment,
    is_student_enrolled
)
from database.room_db import get_room_by_id

router = APIRouter()

@router.post("", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_student_to_room(
    data: EnrollmentCreateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Ghi danh sinh viên vào phòng thi / phòng thực hành (bảng Enrollments)"""
    room = get_room_by_id(data.room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
        
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền ghi danh vào phòng này")
        
    if is_student_enrolled(data.room_id, data.student_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sinh viên đã được ghi danh trong phòng này")
        
    enrollment = enroll_student(data.room_id, data.student_id, current_user["user_id"])
    return enrollment

@router.get("/room/{room_id}", response_model=List[EnrollmentResponse])
async def list_room_enrollments(
    room_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách sinh viên đã ghi danh trong một phòng"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
        
    if current_user["role"] == "student" and not is_student_enrolled(room_id, current_user["user_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn chưa được ghi danh trong phòng này")
        
    return get_enrollments_by_room(room_id)

@router.delete("/room/{room_id}/student/{student_id}", status_code=status.HTTP_200_OK)
async def remove_student_enrollment(
    room_id: int,
    student_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Xóa sinh viên khỏi danh sách phòng thi"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
        
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa sinh viên khỏi phòng này")
        
    removed = remove_enrollment(room_id, student_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bản ghi ghi danh của sinh viên")
    return {"status": "success", "message": "Đã xóa sinh viên khỏi phòng"}

@router.get("/check", response_model=Dict[str, bool])
async def check_student_enrolled(
    room_id: int,
    student_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Kiểm tra sinh viên đã được ghi danh trong phòng hay chưa"""
    enrolled = is_student_enrolled(room_id, student_id)
    return {"enrolled": enrolled}
