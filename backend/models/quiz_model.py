from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from core.database import Base

class QuizHistory(Base):
    __tablename__ = "quiz_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    topic_name = Column(String)
    difficulty_level = Column(String)
    
    score = Column(Integer, default=0)
    hints_used = Column(Integer, default=0)
    
    quiz_details = Column(JSONB, default={}) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TeacherQuiz(Base):
    __tablename__ = "teacher_quizzes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    topic_name = Column(String, nullable=False)
    difficulty_level = Column(String, nullable=False)
    target_grade = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    questions = Column(JSONB, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())