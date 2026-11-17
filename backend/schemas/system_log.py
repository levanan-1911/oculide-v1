from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime

class SystemLogCreateRequest(BaseModel):
    log_level: str = Field("info", pattern="^(info|warning|error|debug|critical|security)$")
    module: str = Field(..., max_length=50)
    message: str
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    extra_data: Optional[Any] = None

class SystemLogResponse(BaseModel):
    log_id: int
    log_level: str
    module: str
    message: str
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    username: Optional[str] = None
    extra_data: Optional[Any] = None
    created_at: datetime
