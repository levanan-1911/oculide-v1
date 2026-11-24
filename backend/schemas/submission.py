from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

class SubmissionCreateRequest(BaseModel):
    room_id: int
    question_id: int
    code_content: str = Field(..., min_length=1)
    language: str
    attempt_number: int = Field(default=1, ge=1)

    @validator("language", pre=True)
    def normalize_create_language(cls, v):
        if not v:
            return "cpp"
        v_clean = str(v).lower().strip()
        if v_clean in ("c++", "cpp"):
            return "cpp"
        if v_clean in ("python", "py"):
            return "python"
        if v_clean == "java":
            return "java"
        if v_clean == "c":
            return "c"
        return v_clean

class CodeRunRequest(BaseModel):
    code_content: str = Field(..., min_length=1)
    language: str
    custom_input: str = ""

    @validator("language", pre=True)
    def normalize_run_language(cls, v):
        if not v:
            return "cpp"
        v_clean = str(v).lower().strip()
        if v_clean in ("c++", "cpp"):
            return "cpp"
        if v_clean in ("python", "py"):
            return "python"
        if v_clean == "java":
            return "java"
        if v_clean == "c":
            return "c"
        return v_clean

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
    class_id: Optional[int] = None
    class_code: Optional[str] = None
    class_name: Optional[str] = None
    course_name: Optional[str] = None
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
