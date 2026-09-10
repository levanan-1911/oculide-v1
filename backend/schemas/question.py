from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TestCaseCreateRequest(BaseModel):
    input_data: str
    expected_output: str
    is_hidden: bool = False
    points: float = 0.0

class TestCaseUpdateRequest(BaseModel):
    input_data: Optional[str] = None
    expected_output: Optional[str] = None
    is_hidden: Optional[bool] = None
    points: Optional[float] = None

class TestCaseResponse(BaseModel):
    test_case_id: int
    question_id: int
    input_data: str
    expected_output: str
    is_hidden: bool
    points: float
    created_at: Optional[datetime] = None

class QuestionCreateRequest(BaseModel):
    room_id: int
    question_order: int = Field(..., ge=1)
    question_title: str = Field(..., min_length=1, max_length=200)
    question_description: str
    question_type: str = Field("coding", pattern="^(coding|multiple_choice|essay)$")
    programming_language: Optional[str] = Field("python", max_length=20)
    max_points: float = Field(default=10.0, gt=0)
    time_limit_minutes: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    test_cases: Optional[List[TestCaseCreateRequest]] = []

class QuestionUpdateRequest(BaseModel):
    question_order: Optional[int] = None
    question_title: Optional[str] = None
    question_description: Optional[str] = None
    question_type: Optional[str] = None
    programming_language: Optional[str] = None
    max_points: Optional[float] = None
    time_limit_minutes: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    is_active: Optional[bool] = None

class QuestionResponse(BaseModel):
    question_id: int
    room_id: int
    question_order: int
    question_title: str
    question_description: str
    question_type: str
    programming_language: Optional[str]
    max_points: float
    time_limit_minutes: Optional[int]
    memory_limit_mb: Optional[int]
    is_active: bool
    test_cases: Optional[List[TestCaseResponse]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
