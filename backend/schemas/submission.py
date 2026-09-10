from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SubmissionCreateRequest(BaseModel):
    room_id: int
    question_id: int
    code_content: str = Field(..., min_length=1)
    language: str = Field(..., pattern="^(python|cpp|c|java)$")
    attempt_number: int = Field(default=1, ge=1)

class CodeRunRequest(BaseModel):
    code_content: str = Field(..., min_length=1)
    language: str = Field(..., pattern="^(python|cpp|c|java)$")
    custom_input: str = ""

class CodeRunResponse(BaseModel):
    stdout: str
    error: Optional[str] = None
    execution_ms: int

class GradingResultResponse(BaseModel):
    result_id: int
    submission_id: int
    test_case_id: int
    is_passed: bool
    actual_output: Optional[str] = None
    execution_time_ms: Optional[float] = None
    memory_used_mb: Optional[float] = None
    error_message: Optional[str] = None
    graded_at: Optional[datetime] = None

class SubmissionResponse(BaseModel):
    submission_id: int
    room_id: int
    student_id: int
    question_id: int
    attempt_number: int
    code_content: str
    language: str
    submitted_at: datetime
    status: str  # pending, grading, completed, failed, saved
    total_points: Optional[float] = None
    max_points: Optional[float] = None
    score_percentage: Optional[float] = None
    grading_results: Optional[List[GradingResultResponse]] = []
