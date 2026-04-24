from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from .enums_schema import AIDependency, RiskLevel

class ProgressBase(BaseModel):
    course_module_name: str
    progress_pct: int = Field(ge=0, le=100)
    mastery_score: int = Field(ge=0, le=100)
    ai_dependency: AIDependency
    risk_level: RiskLevel
    time_spent_mins: int

class ProgressResponse(ProgressBase):
    id: UUID
    student_id: UUID
    last_active: datetime

    class Config:
        from_attributes = True