from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EnrollmentCreateRequest(BaseModel):
    room_id: int
    student_id: int

class EnrollmentResponse(BaseModel):
    enrollment_id: int
    room_id: int
    student_id: int
    enrolled_at: datetime
    enrolled_by: int
    username: Optional[str] = None
    full_name: Optional[str] = None
    student_code: Optional[str] = None
    email: Optional[str] = None
