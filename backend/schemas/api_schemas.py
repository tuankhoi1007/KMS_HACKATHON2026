from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

# Dành cho Chat Socratic
class ChatRequest(BaseModel):
    student_id: UUID
    topic_name: str
    message: str

class ChatResponse(BaseModel):
    session_id: UUID
    reply: str

# Dành cho Dashboard Giáo viên
class ProgressResponse(BaseModel):
    student_id: UUID
    course_module_name: str
    mastery_score: int
    ai_dependency: str
    risk_level: str

    class Config:
        from_attributes = True