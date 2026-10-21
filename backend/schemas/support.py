from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SupportRequestCreate(BaseModel):
    room_id: int
    session_id: Optional[int] = None
    issue_type: str = Field(..., pattern="^(technical|exam_question|permission|other)$")
    message: str = Field(..., min_length=2, max_length=1000)

class SupportStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|in_progress|resolved|rejected)$")

class SupportRequestResponse(BaseModel):
    request_id: int
    room_id: int
    student_id: int
    session_id: Optional[int] = None
    issue_type: str
    message: str
    status: str
    resolved_by: Optional[int] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    student_name: Optional[str] = None
    student_code: Optional[str] = None
