from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from core.database import Base


class SkillNode(Base):
    """Đại diện cho một khái niệm/kỹ năng trong Skill Tree."""
    __tablename__ = "skill_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Cây riêng cho mỗi học sinh
    course_name = Column(String, nullable=True)                   # Tên khóa học (VD: "[DSA] Graph Search")
    key = Column(String, nullable=True)                           # Key ngắn (VD: "big_o", "arrays")
    name = Column(String, nullable=False)                         # Tên hiển thị (VD: "Arrays & Strings")
    description = Column(Text, nullable=True)                     # Mô tả chi tiết
    category = Column(String, nullable=False, default="dsa")      # Nhóm môn: dsa, ltnc, hdh
    position_x = Column(Integer, default=0)                       # Toạ độ x để render trên graph
    position_y = Column(Integer, default=0)                       # Toạ độ y để render trên graph

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SkillEdge(Base):
    """Liên kết giữa 2 SkillNode (quan hệ tiên quyết)."""
    __tablename__ = "skill_edges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_node_id = Column(UUID(as_uuid=True), ForeignKey("skill_nodes.id"), nullable=False)
    target_node_id = Column(UUID(as_uuid=True), ForeignKey("skill_nodes.id"), nullable=False)


class StudentSkillStatus(Base):
    """Trạng thái học của từng sinh viên trên từng SkillNode."""
    __tablename__ = "student_skill_status"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    skill_node_id = Column(UUID(as_uuid=True), ForeignKey("skill_nodes.id"), nullable=False)
    status = Column(String, default="locked")  # locked | in-progress | mastered
    mastery_pct = Column(Integer, default=0)   # Phần trăm thành thạo (0-100)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
