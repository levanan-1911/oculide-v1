from pydantic import BaseModel, Field
from typing import Optional, List


class TemplateTestCaseSchema(BaseModel):
    id: Optional[str] = None
    input_data: str = ""
    expected_output: str = ""
    is_hidden: bool = False
    points: float = 1.0


class TemplateQuestionSchema(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    difficulty: str = "Trung bình"
    description: str = ""
    sample_input: Optional[str] = ""
    sample_output: Optional[str] = ""
    programming_language: Optional[str] = "C++ / Python"
    max_points: float = 10.0
    test_cases: List[TemplateTestCaseSchema] = []


class TemplateCreateRequest(BaseModel):
    code: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    type: str = Field(default="lab", pattern="^(lab|exam)$")
    category: Optional[str] = "Lập trình"
    language: str = "C++ / Python"
    duration_minutes: int = Field(default=90, ge=5, le=600)
    description: Optional[str] = ""
    questions: List[TemplateQuestionSchema] = []


class TemplateUpdateRequest(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = Field(default=None, pattern="^(lab|exam)$")
    category: Optional[str] = None
    language: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=5, le=600)
    description: Optional[str] = None
    questions: Optional[List[TemplateQuestionSchema]] = None
