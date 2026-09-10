from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from schemas.auth import UserResponse

class AdminUserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., pattern="^(admin|instructor|student)$")
    student_id: Optional[str] = None
    is_active: bool = True

class AdminUserStatusUpdate(BaseModel):
    is_active: bool

class AdminUserRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(admin|instructor|student)$")

class PaginatedUsersResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class BatchImportUserItem(BaseModel):
    username: str
    password: Optional[str] = None
    email: EmailStr
    full_name: str
    student_id: Optional[str] = None

class BatchImportRequest(BaseModel):
    role: str = Field("student", pattern="^(student|instructor)$")
    users: List[BatchImportUserItem]

class BatchImportResult(BaseModel):
    total_imported: int
    failed_count: int
    errors: List[str] = []
