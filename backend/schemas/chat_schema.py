from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any

class ChatMessage(BaseModel):
    role: str # "user" hoặc "ai"
    content: str

class ChatSessionBase(BaseModel):
    student_id: UUID
    topic_name: str

class ChatCreate(ChatSessionBase):
    message: str # Tin nhắn đầu tiên để mở session

class ChatSessionResponse(ChatSessionBase):
    id: UUID
    messages: List[ChatMessage] # Tự động parse JSONB từ DB
    ai_summary: Optional[str] = None
    
    # Dual-Agent metadata
    agent_used: Optional[str] = "agent_1"      # "agent_1" hoặc "agent_2"
    retry_count: Optional[int] = 0              # Số lần retry (0-3)
    validation_score: Optional[int] = 0         # Điểm chất lượng (0-100)
    
    created_at: datetime

    class Config:
        from_attributes = True