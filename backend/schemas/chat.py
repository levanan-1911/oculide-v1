from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ChatMessageRequest(BaseModel):
    room_id: int
    message_content: str = Field(..., min_length=1, max_length=1000)
    recipient_id: Optional[int] = None
    message_type: str = Field("text", pattern="^(text|system|announcement)$")

class ChatMessageResponse(BaseModel):
    message_id: int
    room_id: int
    sender_id: int
    sender_name: Optional[str] = None
    message_content: str
    message_type: str = "text"
    is_private: bool = False
    recipient_id: Optional[int] = None
    sent_at: datetime
