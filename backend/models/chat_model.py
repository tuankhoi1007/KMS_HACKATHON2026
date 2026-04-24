from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from core.database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    topic_name = Column(String)
    
    messages = Column(JSONB, default=[]) 
    ai_summary = Column(Text)
    
    # Dual-Agent metadata
    agent_used = Column(String, default="agent_1")     # "agent_1" hoặc "agent_2"
    retry_count = Column(Integer, default=0)            # Số lần Agent 1 phải thử lại (0-3)
    validation_score = Column(Integer, default=0)       # Điểm chất lượng từ Agent 2 (0-100)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())