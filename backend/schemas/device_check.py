from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DeviceCheckCreateRequest(BaseModel):
    session_id: int
    camera_status: bool = False
    mic_status: bool = False
    network_latency_ms: Optional[int] = None
    os_info: Optional[str] = None
    browser_info: Optional[str] = None
    is_passed: bool = False

class DeviceCheckResponse(BaseModel):
    check_id: int
    session_id: int
    student_id: int
    camera_status: bool
    mic_status: bool
    network_latency_ms: Optional[int] = None
    os_info: Optional[str] = None
    browser_info: Optional[str] = None
    is_passed: bool
    checked_at: datetime
