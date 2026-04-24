from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from enum import Enum


class SkillStatus(str, Enum):
    LOCKED = "locked"
    IN_PROGRESS = "in-progress"
    MASTERED = "mastered"


# --- Skill Node ---
class SkillNodeBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "dsa"
    position_x: int = 0
    position_y: int = 0


class SkillNodeCreate(SkillNodeBase):
    """Dùng khi giáo viên tạo một node mới trong Skill Tree."""
    pass


class SkillNodeResponse(SkillNodeBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# --- Skill Edge ---
class SkillEdgeBase(BaseModel):
    source_node_id: UUID
    target_node_id: UUID


class SkillEdgeCreate(SkillEdgeBase):
    pass


class SkillEdgeResponse(SkillEdgeBase):
    id: UUID

    class Config:
        from_attributes = True


# --- Student Skill Status ---
class StudentSkillStatusBase(BaseModel):
    student_id: UUID
    skill_node_id: UUID
    status: SkillStatus = SkillStatus.LOCKED
    mastery_pct: int = Field(ge=0, le=100, default=0)


class StudentSkillStatusUpdate(BaseModel):
    """Payload để cập nhật trạng thái kỹ năng của sinh viên."""
    status: SkillStatus
    mastery_pct: int = Field(ge=0, le=100, default=0)


class StudentSkillStatusResponse(StudentSkillStatusBase):
    id: UUID
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Graph Response tổng hợp trả về cho Frontend ---
class SkillNodeWithStatus(BaseModel):
    """Một node đã gắn kèm trạng thái học của sinh viên."""
    id: UUID
    key: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: str
    position_x: int
    position_y: int
    status: SkillStatus = SkillStatus.LOCKED
    mastery_pct: int = 0


class TimeAllocation(BaseModel):
    topic: str
    percentage: int

class ScheduleItem(BaseModel):
    day: str
    task: str
    duration: Optional[str] = None

class SkillGraphResponse(BaseModel):
    """Response trả về toàn bộ graph cho frontend React Flow."""
    nodes: List[SkillNodeWithStatus]
    edges: List[SkillEdgeResponse]
    ai_insight: Optional[str] = None
    recommended_next: Optional[str] = None
    weakness_areas: Optional[List[str]] = None
    time_allocation: Optional[List[TimeAllocation]] = None
    schedule: Optional[List[ScheduleItem]] = None
