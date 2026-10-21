from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DraftSaveRequest(BaseModel):
    session_id: int
    question_id: int
    draft_code: str
    language: str = Field(default="python", max_length=20)

class DraftResponse(BaseModel):
    draft_id: int
    session_id: int
    question_id: int
    student_id: int
    draft_code: str
    language: str
    last_saved_at: datetime
