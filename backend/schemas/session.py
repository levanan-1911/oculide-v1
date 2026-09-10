from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SessionCreateRequest(BaseModel):
    room_id: int
    browser_fingerprint: Optional[str] = None

class SessionStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|completed|terminated|abandoned)$")

class SessionResponse(BaseModel):
    session_id: int
    room_id: int
    student_id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    browser_fingerprint: Optional[str] = None
    status: str
