from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class RoomCreateRequest(BaseModel):
    room_code: str = Field(..., min_length=3, max_length=50)
    room_name: str = Field(..., min_length=1, max_length=200)
    room_type: str = Field("lab", pattern="^(exam|lab|classroom)$")
    class_id: Optional[Union[int, str]] = None
    template_id: Optional[Union[int, str]] = None
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int = Field(..., gt=0)
    max_attempts: int = Field(default=10, gt=0)
    passcode: Optional[str] = Field(None, max_length=50)
    proctoring_config: Optional[Union[Dict[str, Any], str]] = None
    status: Optional[str] = "chua_mo"

class RoomUpdateRequest(BaseModel):
    room_name: Optional[str] = None
    room_type: Optional[str] = None
    class_id: Optional[Union[int, str]] = None
    template_id: Optional[Union[int, str]] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    is_active: Optional[bool] = None
    passcode: Optional[str] = None
    proctoring_config: Optional[Union[Dict[str, Any], str]] = None
    status: Optional[str] = None

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
    class_id: Optional[int] = None
    template_id: Optional[int] = None
    proctoring_config: Optional[str] = None
    status: Optional[str] = "chua_mo"
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
    pending_violation_count: int = 0
    confirmed_violation_count: int = 0
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

class RoomStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(chua_mo|dang_dien_ra|da_dong|da_huy|waiting|in_progress|ended)$")
    force_close_conflicts: Optional[bool] = False

class RoomAttendeeResponse(BaseModel):
    student_id: str
    user_id: Optional[int] = None
    student_name: str
    student_email: Optional[str] = None
    status: str = "absent"  # waiting, absent, completed
    joined_at: Optional[str] = None
    device: Optional[str] = None
    camera_ready: Optional[bool] = False

class RoomLobbyResponse(BaseModel):
    room_id: int
    room_code: str
    room_name: str
    room_type: str
    instructor_id: int
    class_id: Optional[int] = None
    class_code: Optional[str] = None
    class_name: Optional[str] = None
    course_name: Optional[str] = None
    template_id: Optional[int] = None
    template_title: Optional[str] = None
    template_code: Optional[str] = None
    template_language: Optional[str] = None
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    max_attempts: int
    is_active: bool
    passcode: Optional[str] = None
    livekit_room_name: Optional[str] = None
    proctoring_config: Optional[Union[Dict[str, Any], str]] = None
    status: str
    created_at: datetime
    attendees: List[RoomAttendeeResponse] = []

class RoomManualAttendanceRequest(BaseModel):
    student_id: Union[int, str]
    status: str = Field(..., pattern="^(waiting|absent)$")
