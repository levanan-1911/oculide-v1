from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class RoomCreateRequest(BaseModel):
    room_code: str = Field(..., min_length=3, max_length=20)
    room_name: str = Field(..., min_length=1, max_length=100)
    room_type: str = Field("exam", pattern="^(exam|classroom)$")
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int = Field(..., gt=0)
    max_attempts: int = Field(default=1, gt=0)
    passcode: Optional[str] = Field(None, max_length=50)

class RoomUpdateRequest(BaseModel):
    room_name: Optional[str] = None
    room_type: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    is_active: Optional[bool] = None
    passcode: Optional[str] = None

class RoomResponse(BaseModel):
    room_id: int
    room_code: str
    room_name: str
    room_type: str
    instructor_id: int
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    max_attempts: int
    is_active: bool
    passcode: Optional[str] = None
    livekit_room_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class PublicRoomResponse(BaseModel):
    room_id: int
    room_code: str
    room_name: str
    room_type: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    requires_passcode: bool

class RoomDashboardStudentItem(BaseModel):
    student_id: int
    student_name: str
    student_code: Optional[str] = None
    status: str = "active"
    violation_count: int = 0
    duration_minutes: int = 0
    last_snapshot_url: Optional[str] = None

class RoomDashboardResponse(BaseModel):
    room_id: int
    room_code: str
    room_name: str
    room_type: str
    active_students_count: int
    students: List[RoomDashboardStudentItem] = []

class RoomEnrollmentRequest(BaseModel):
    student_ids: List[int]
