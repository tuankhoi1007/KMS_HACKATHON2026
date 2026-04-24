from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from core.database import Base


class Course(Base):
    """Khóa học do giáo viên tạo."""
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)          # VD: "[DSA] Graph Search (BFS/DFS)"
    subject = Column(String, nullable=False)        # VD: "dsa", "ltnc", "hdh"
    description = Column(Text, nullable=True)
    target_grade = Column(String, nullable=True)    # Lớp mục tiêu (VD: "K22 - CSE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CourseEnrollment(Base):
    """Đăng ký học sinh vào khóa học."""
    __tablename__ = "course_enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
