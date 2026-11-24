from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime

def _clean_language(v: Any) -> str:
    if not isinstance(v, str):
        return "cpp"
    val = v.strip().lower()
    if "python" in val or val == "py":
        return "python"
    if "java" in val and "script" not in val:
        return "java"
    if "c++" in val or "cpp" in val:
        return "cpp"
    if val == "c":
        return "c"
    return "cpp"

class SubmissionCreateRequest(BaseModel):
    room_id: int
    question_id: int
    code_content: str = Field(..., min_length=1)
    language: str = Field(default="cpp")
    attempt_number: int = Field(default=1, ge=1)

    @field_validator('language', mode='before')
    @classmethod
    def validate_lang(cls, v):
        return _clean_language(v)

class CodeRunRequest(BaseModel):
    code_content: str = Field(..., min_length=1)
    language: str = Field(default="cpp")
    custom_input: str = ""

    @field_validator('language', mode='before')
    @classmethod
    def validate_lang(cls, v):
        return _clean_language(v)

class CodeRunResponse(BaseModel):
    stdout: str
    error: Optional[str] = None
    execution_ms: int

class GradingResultResponse(BaseModel):
    result_id: int
    submission_id: int
    test_case_id: int
    is_passed: bool
    is_hidden: Optional[bool] = False
    input_data: Optional[str] = None
    expected_output: Optional[str] = None
    actual_output: Optional[str] = None
    execution_time_ms: Optional[float] = None
    memory_used_mb: Optional[float] = None
    error_message: Optional[str] = None
    graded_at: Optional[datetime] = None

class SubmissionResponse(BaseModel):
    submission_id: int
    room_id: int
    room_code: Optional[str] = None
    room_name: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    question_id: int
    question_title: Optional[str] = None
    attempt_number: int
    code_content: str
    language: str
    submitted_at: datetime
    status: str  # pending, grading, completed, failed, saved
    total_points: Optional[float] = None
    max_points: Optional[float] = None
    score_percentage: Optional[float] = None
    grading_results: Optional[List[GradingResultResponse]] = []
