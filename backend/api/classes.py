from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Dict, Any, List, Optional

from schemas.classes import (
    ClassCreateRequest,
    ClassUpdateRequest,
    ClassResponse,
    StudentSearchItem,
    ClassEnrollRequest,
    ClassEnrollResponse,
    ClassBatchEnrollRequest,
    ClassBatchEnrollResponse
)
from core.permissions import get_current_user, instructor_or_admin_required
from database.classes_db import (
    create_class,
    get_class_by_id,
    get_classes_by_instructor,
    update_class,
    delete_class,
    search_students,
    enroll_student_to_class,
    enroll_students_batch,
    remove_student_from_class,
    get_class_enrolled_students,
    get_class_rooms
)

router = APIRouter()

@router.post("", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def add_class(
    data: ClassCreateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giảng viên hoặc Admin tạo một lớp học phần mới (Admin có thể gán giảng viên phụ trách)"""
    try:
        assigned_instructor_id = current_user["user_id"]
        if current_user["role"] == "admin" and data.instructor_id:
            assigned_instructor_id = data.instructor_id

        new_cls = create_class(
            class_code=data.class_code,
            class_name=data.class_name,
            instructor_id=assigned_instructor_id,
            course_code=data.course_code,
            section_code=data.section_code,
            semester=data.semester,
            description=data.description
        )
        return new_cls
    except Exception as e:
        if "UNIQUE" in str(e).upper() or "UQ" in str(e).upper():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã lớp học đã tồn tại")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("", response_model=List[ClassResponse])
async def list_classes(
    instructor_id: Optional[int] = Query(None, description="Lọc theo mã giảng viên"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách các lớp học (Giảng viên thấy lớp của mình, Admin thấy toàn bộ hoặc lọc theo instructor_id)"""
    if current_user["role"] == "admin":
        return get_classes_by_instructor(instructor_id)
    elif current_user["role"] == "instructor":
        # Giảng viên xem lớp của chính mình
        return get_classes_by_instructor(current_user["user_id"])
    else:
        return get_classes_by_instructor(instructor_id)

@router.get("/students/search", response_model=List[StudentSearchItem])
async def search_students_endpoint(
    q: str = Query(..., min_length=1, description="Từ khóa tìm kiếm (MSSV, Họ tên, Email, Tên đăng nhập)"),
    class_id: Optional[str] = Query(None, description="Mã lớp (CS316-A) hoặc ID lớp học để kiểm tra trạng thái ghi danh"),
    class_code: Optional[str] = Query(None, description="Mã lớp học để kiểm tra trạng thái ghi danh"),
    limit: int = Query(15, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """
    API tìm kiếm nhanh sinh viên trong hệ thống để thêm vào lớp học phần.
    Hỗ trợ cả Admin và Giảng viên.
    Tìm theo MSSV (ma_dinh_danh), Họ tên, Email, Tên đăng nhập.
    Tự động báo 'is_enrolled: True' nếu sinh viên đã có trong lớp được chỉ định.
    """
    return search_students(
        query=q,
        class_id=class_id,
        class_code=class_code,
        limit=limit
    )

@router.get("/semesters/list")
async def list_semesters():
    """Lấy danh sách các học kỳ từ bảng HocKy trong CSDL SQL Server"""
    from database.classes_db import get_all_semesters
    return get_all_semesters()

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
        
    try:
        updated = update_class(
            class_id,
            class_code=data.class_code,
            class_name=data.class_name,
            description=data.description
        )
        return updated
    except Exception as e:
        if "UNIQUE" in str(e).upper() or "UQ" in str(e).upper():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã lớp học đã tồn tại")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{class_id}", status_code=status.HTTP_200_OK)
async def remove_class(
    class_id: str,
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

@router.get("/{class_id}/students")
async def list_class_students(
    class_id: str,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Lấy danh sách sinh viên ghi danh trong lớp học phần"""
    cls = get_class_by_id(class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lớp học")
    return get_class_enrolled_students(class_id)

@router.get("/{class_id}/rooms")
async def list_class_rooms(
    class_id: str,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Lấy danh sách các bài Lab và Bài kiểm tra/Thi của lớp học phần"""
    cls = get_class_by_id(class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lớp học")
    return get_class_rooms(class_id)

@router.post("/{class_id}/students", response_model=ClassEnrollResponse)
async def enroll_student(
    class_id: str,
    data: ClassEnrollRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Ghi danh một sinh viên vào lớp học phần"""
    cls = get_class_by_id(class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lớp học")
    if current_user["role"] != "admin" and cls["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền chỉnh sửa lớp của giảng viên khác")
    
    result = enroll_student_to_class(
        class_id=class_id,
        student_user_id=data.student_user_id,
        student_name=data.student_name,
        email=data.email,
        added_by=current_user["user_id"],
        status=data.status
    )
    return result

@router.post("/{class_id}/students/batch", response_model=ClassBatchEnrollResponse)
async def enroll_students_batch_endpoint(
    class_id: str,
    data: ClassBatchEnrollRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Ghi danh hàng loạt sinh viên vào lớp học phần"""
    cls = get_class_by_id(class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lớp học")
    if current_user["role"] != "admin" and cls["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền chỉnh sửa lớp của giảng viên khác")

    enrolled = enroll_students_batch(
        class_id=class_id,
        student_identifiers=data.student_ids,
        added_by=current_user["user_id"],
        status=data.status or "dang_hoc"
    )
    return {
        "status": "success",
        "enrolled_count": enrolled,
        "total_requested": len(data.student_ids)
    }

@router.delete("/{class_id}/students/{student_user_id}")
async def unenroll_student(
    class_id: str,
    student_user_id: str,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Xóa sinh viên khỏi lớp học phần"""
    cls = get_class_by_id(class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lớp học")
    if current_user["role"] != "admin" and cls["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa sinh viên khỏi lớp của giảng viên khác")
    
    success = remove_student_from_class(class_id, student_user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sinh viên không có trong lớp này")
    return {"status": "success", "message": "Đã xóa sinh viên khỏi lớp học"}
