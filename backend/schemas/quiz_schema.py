from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Any, Dict

class QuizHistoryBase(BaseModel):
    topic_name: str
    difficulty_level: str # "easy", "medium", "hard" ...
    score: int = Field(..., description="Số điểm đạt được")
    hints_used: int = Field(default=0, description="Số lần dùng AI Hint")
    # quiz_details lưu JSONB gồm danh sách câu hỏi, câu trả lời đúng/sai
    quiz_details: Dict[str, Any] 

class QuizHistoryCreate(QuizHistoryBase):
    student_id: UUID

class QuizHistoryResponse(QuizHistoryBase):
    id: UUID
    student_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True