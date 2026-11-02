from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: str
    role: str
    student_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    student_id: Optional[str] = Field(None, max_length=20)
