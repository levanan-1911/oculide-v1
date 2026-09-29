from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ViolationCreateRequest(BaseModel):
    session_id: int
    violation_type: str = Field(..., pattern="^(tab_switch|copy_paste|no_face_detected|multiple_faces|phone_detected|suspicious_object|fullscreen_exit|camera_blocked|time_exceeded|inactive_30s|multiple_people)$")
    severity: str = Field("warning", pattern="^(low|medium|high|critical)$")
    description: Optional[str] = None
    snapshot_url: Optional[str] = None

class SnapshotAnalyzeRequest(BaseModel):
    session_id: int
    snapshot_data: str  # Base64 string
    is_typing: Optional[bool] = False
    client_event: Optional[str] = None  # tab_switch, fullscreen_exit, blur, periodic

class ViolationResponse(BaseModel):
    violation_id: int
    session_id: int
    student_id: int
    violation_type: str
    severity: str
    description: Optional[str] = None
    snapshot_url: Optional[str] = None
    detected_at: datetime
    is_reviewed: bool = False
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None

class ViolationStatsItem(BaseModel):
    violation_type: str
    severity: str
    violation_count: int
    first_occurrence: datetime
    last_occurrence: datetime
