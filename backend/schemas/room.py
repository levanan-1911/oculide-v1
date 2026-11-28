from pydantic import BaseModel, Field, AliasChoices, model_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class QuestionPointConfig(BaseModel):
    question_id: int
    points: float = Field(..., gt=0)

class RoomCreateRequest(BaseModel):
    room_code: str = Field(..., min_length=3, max_length=8)
    room_name: str = Field(..., min_length=1, max_length=200)
    room_type: str = Field("lab", pattern="^(exam|lab|classroom)$")
    session_type: Optional[str] = Field(None, pattern="^(LAB|MIDTERM|FINAL)$")
    class_id: Optional[Union[int, str]] = None
    template_id: Optional[Union[int, str]] = None
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int = Field(..., gt=0)
    max_attempts: int = Field(default=10, gt=0)
    passcode: Optional[str] = Field(None, max_length=8)
    proctoring_config: Optional[Union[Dict[str, Any], str]] = None
    status: Optional[str] = "chua_mo"
    total_points: Optional[float] = Field(None, gt=0, le=10)
    question_points: Optional[List[QuestionPointConfig]] = None

    @model_validator(mode="after")
    def validate_points_cap(self):
        if self.end_time <= self.start_time:
            raise ValueError("Thời gian kết thúc phải sau thời gian bắt đầu")
        if self.question_points:
            total_q = round(sum(qp.points for qp in self.question_points), 2)
            if total_q > 10.0:
                raise ValueError("Tổng điểm các câu hỏi không được vượt quá 10 điểm")
        return self

class RoomUpdateRequest(BaseModel):
    room_name: Optional[str] = None
    room_type: Optional[str] = None
    session_type: Optional[str] = Field(None, pattern="^(LAB|MIDTERM|FINAL)$")
    class_id: Optional[Union[int, str]] = None
    template_id: Optional[Union[int, str]] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    is_active: Optional[bool] = None
    passcode: Optional[str] = Field(None, max_length=8)
    proctoring_config: Optional[Union[Dict[str, Any], str]] = None
    status: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("Thời gian kết thúc phải sau thời gian bắt đầu")
        return self

class RoomTemplateAssignRequest(BaseModel):
    template_id: Optional[int] = Field(
        None,
        ge=1,
        validation_alias=AliasChoices("template_id", "templateId"),
    )

class RoomPublishStateUpdateRequest(BaseModel):
    results_published: Optional[bool] = Field(
        None,
        validation_alias=AliasChoices("results_published", "resultsPublished"),
    )
    student_id: Optional[Union[int, str]] = Field(
        None,
        validation_alias=AliasChoices("student_id", "studentId"),
    )
    is_published: Optional[bool] = Field(
        None,
        validation_alias=AliasChoices("is_published", "isPublished"),
    )

    @model_validator(mode="after")
    def validate_publish_payload(self):
        if self.student_id is not None and self.is_published is None:
            raise ValueError("Thiếu trường is_published khi cập nhật theo student_id")
        if self.is_published is not None and self.student_id is None:
            raise ValueError("Thiếu trường student_id khi cập nhật is_published")
        if self.results_published is None and self.student_id is None:
            raise ValueError("Phải cung cấp results_published hoặc cặp student_id/is_published")
        return self

class RoomResponse(BaseModel):
    room_id: int
    room_code: str
    room_name: str
    room_type: str
    session_type: Optional[str] = None
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
    instructor_name: Optional[str] = None
    class_code: Optional[str] = None
    class_name: Optional[str] = None
    course_name: Optional[str] = None
    total_students: Optional[int] = 0
    attended_students: Optional[int] = 0
    pending_violations: Optional[int] = 0
    student_session_status: Optional[str] = None
    student_submissions_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

class PublicRoomResponse(BaseModel):
    room_id: int
    room_code: str
    room_name: str
    room_type: str
    session_type: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    requires_passcode: bool
    instructor_name: Optional[str] = None
    class_code: Optional[str] = None
    class_name: Optional[str] = None
    course_name: Optional[str] = None
    status: Optional[str] = "chua_mo"
    is_active: Optional[bool] = True

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
    session_type: Optional[str] = None
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
    status: str = "absent"  # waiting, absent, completed, late
    joined_at: Optional[str] = None
    camera_ready: Optional[bool] = False

class RoomLobbyResponse(BaseModel):
    room_id: int
    room_code: str
    room_name: str
    room_type: str
    session_type: Optional[str] = None
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

class StudentJoinRoomResponse(RoomResponse):
    session_id: Optional[int] = None
    class_code: Optional[str] = None
    class_name: Optional[str] = None
    course_name: Optional[str] = None
    is_late: Optional[bool] = False
    attendance_status: Optional[str] = "co_mat"

class DeviceCheckRequest(BaseModel):
    camera_ready: bool = True
    mic_ready: bool = True
    screen_ready: bool = False
    network_latency_ms: int = 25
    os_info: Optional[str] = None
    browser_info: Optional[str] = None

class StudentRoomStatusResponse(BaseModel):
    room_id: int
    room_code: str
    room_name: str
    room_type: str
    status: str
    is_active: bool
    duration_minutes: int
    start_time: datetime
    end_time: datetime
    has_submitted: Optional[bool] = False
    is_late: Optional[bool] = False
    attendance_status: Optional[str] = "co_mat"
    has_template: Optional[bool] = True

