from sqlalchemy import Column, String, Integer, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)    
    password_hash = Column(String, nullable=False)            
    role = Column(String, nullable=False, default="student")  
    full_name = Column(String, nullable=False)
    grade = Column(String)
    avatar_url = Column(String)
    
    # Gamification
    total_points = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    study_hours_this_week = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())