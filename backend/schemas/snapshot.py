from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SnapshotCreateRequest(BaseModel):
    session_id: int
    image_url: str = Field(..., max_length=500)
    face_detected: bool = False
    face_count: int = 0
    looking_at_screen: bool = True
    confidence_score: Optional[float] = None

class SnapshotResponse(BaseModel):
    snapshot_id: int
    session_id: int
    student_id: int
    image_url: str
    face_detected: bool
    face_count: int
    looking_at_screen: bool
    confidence_score: Optional[float] = None
    captured_at: datetime
