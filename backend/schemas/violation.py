from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ViolationCreateRequest(BaseModel):
    session_id: int
    violation_type: str = Field(..., pattern="^(tab_switch|copy_paste|no_face_detected|multiple_faces|phone_detected|suspicious_object|fullscreen_exit|camera_blocked|time_exceeded|inactive_30s|multiple_people)$")
    severity: str = Field("medium", pattern="^(low|medium|high|critical)$")
    description: Optional[str] = None
    snapshot_url: Optional[str] = None

class AIViolationHookRequest(BaseModel):
    room_id: int
    student_id: int
    session_id: Optional[int] = None
    violation_type: str = Field(..., pattern="^(no_face_detected|multiple_faces|phone_detected|suspicious_object|camera_blocked|multiple_people|looking_away|tab_switch|copy_paste|fullscreen_exit)$")
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    severity: str = Field("high", pattern="^(low|medium|high|critical)$")
    description: Optional[str] = None
    snapshot_url: Optional[str] = None

class SnapshotAnalyzeRequest(BaseModel):
    session_id: int
    snapshot_data: str  # Base64 string
    is_typing: Optional[bool] = False
    client_event: Optional[str] = None  # tab_switch, fullscreen_exit, blur, periodic

class ViolationReviewRequest(BaseModel):
    review_status: str = Field(..., pattern="^(confirmed|rejected)$")

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
    review_status: str = 'pending'
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    student_name: Optional[str] = None
    student_code: Optional[str] = None

class ViolationStatsItem(BaseModel):
    violation_type: str
    severity: str
    violation_count: int
    first_occurrence: datetime
    last_occurrence: datetime
