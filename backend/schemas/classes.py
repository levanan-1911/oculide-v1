from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ClassCreateRequest(BaseModel):
    class_code: str = Field(..., min_length=2, max_length=50)
    class_name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = Field(None, max_length=500)

class ClassUpdateRequest(BaseModel):
    class_name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = Field(None, max_length=500)

class ClassResponse(BaseModel):
    class_id: int
    class_code: str
    class_name: str
    instructor_id: int
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    instructor_name: Optional[str] = None
