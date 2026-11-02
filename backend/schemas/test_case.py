from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TestCaseCreateRequest(BaseModel):
    question_id: Optional[int] = None
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
