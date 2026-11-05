from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class GradingResultResponse(BaseModel):
    result_id: int
    submission_id: int
    test_case_id: int
    is_passed: bool
    actual_output: Optional[str] = None
    execution_time_ms: Optional[float] = None
    memory_used_mb: Optional[float] = None
    error_message: Optional[str] = None
    graded_at: datetime
