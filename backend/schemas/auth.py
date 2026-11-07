from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserRegisterRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., pattern="^(instructor|student)$")
    student_id: Optional[str] = Field(None, max_length=50)

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: str
    role: str
    student_id: Optional[str] = None
    user_code: Optional[str] = None
    department: Optional[str] = None
    academic_rank: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    must_change_password: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class JoinRoomRequest(BaseModel):
    room_code: str = Field(..., min_length=3, max_length=50)
    passcode: Optional[str] = None
    full_name: Optional[str] = None
    student_id: Optional[str] = None

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    student_id: Optional[str] = None
    department: Optional[str] = None
    academic_rank: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str
    reset_link: Optional[str] = None
    token: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)
