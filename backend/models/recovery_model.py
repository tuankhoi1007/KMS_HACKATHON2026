from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from core.database import Base

class AiRecoveryPlan(Base):
    __tablename__ = "ai_recovery_plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    plan_details = Column(JSONB, default={}) 
    status = Column(String, default="active")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())