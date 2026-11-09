from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from schemas.auth import UserResponse

class AdminUserCreateRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., pattern="^(admin|instructor|student)$")
    student_id: Optional[str] = None
    department: Optional[str] = None
    lop_sinh_hoat: Optional[str] = None
    is_active: bool = True

class AdminUserStatusUpdate(BaseModel):
    is_active: bool

class AdminUserRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(admin|instructor|student)$")

class AdminUserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, pattern="^(admin|instructor|student)$")
    student_id: Optional[str] = None
    department: Optional[str] = None
    lop_sinh_hoat: Optional[str] = None
    is_active: Optional[bool] = None

class PaginatedUsersResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class BatchImportUserItem(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    email: str
    full_name: str
    student_id: Optional[str] = None
    department: Optional[str] = None
    lop_sinh_hoat: Optional[str] = None

class BatchImportRequest(BaseModel):
    role: str = Field("student", pattern="^(student|instructor|admin)$")
    users: List[BatchImportUserItem]

class BatchImportResult(BaseModel):
    total_imported: int
    failed_count: int
    errors: List[str] = []
