from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from core.database import Base

class LearningProgress(Base):
    __tablename__ = "learning_progress"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    course_module_name = Column(String)
    
    progress_pct = Column(Integer, default=0)
    mastery_score = Column(Integer, default=0)
    ai_dependency = Column(String, default="none") 
    risk_level = Column(String, default="optimal")
    time_spent_mins = Column(Integer, default=0)
    
    last_active = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())