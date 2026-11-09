from pydantic import BaseModel, Field
from typing import Optional, Union, List
from datetime import datetime

class ClassCreateRequest(BaseModel):
    class_code: str = Field(..., min_length=2, max_length=50)
    class_name: str = Field(..., min_length=2, max_length=150)
    course_code: Optional[str] = Field(None, max_length=50)
    section_code: Optional[str] = Field(None, max_length=50)
    semester: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    instructor_id: Optional[int] = None

class ClassUpdateRequest(BaseModel):
    class_code: Optional[str] = Field(None, min_length=2, max_length=50)
    class_name: Optional[str] = Field(None, min_length=2, max_length=150)
    course_code: Optional[str] = Field(None, max_length=50)
    section_code: Optional[str] = Field(None, max_length=50)
    semester: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=500)

class ClassResponse(BaseModel):
    class_id: int
    class_code: str
    class_name: str
    course_code: Optional[str] = None
    section_code: Optional[str] = None
    semester: Optional[str] = None
    instructor_id: int
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    instructor_name: Optional[str] = None
    student_count: Optional[int] = 0

class StudentSearchItem(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: str
    student_id: Optional[str] = None
    lop_sinh_hoat: Optional[str] = None
    department: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool = True
    is_enrolled: bool = False

class ClassEnrollRequest(BaseModel):
    student_user_id: Union[int, str]
    status: str = Field("dang_hoc", pattern="^(dang_hoc|hoc_ghep|hoc_lai|hoc_vuot)$")

class ClassEnrollResponse(BaseModel):
    ma_dong: int
    class_id: int
    student_id: int
    status: str
    enrolled_at: datetime
    already_enrolled: bool = False

class ClassBatchEnrollRequest(BaseModel):
    student_ids: List[Union[int, str]]
    status: Optional[str] = "dang_hoc"

class ClassBatchEnrollResponse(BaseModel):
    status: str
    enrolled_count: int
    total_requested: int
