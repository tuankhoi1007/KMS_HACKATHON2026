from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from .enums_schema import AlertType

# Dùng khi tạo mới một cảnh báo (giáo viên tạo, hoặc AI tự động tạo)
class AlertCreate(BaseModel):
    student_id: Optional[UUID] = None # Để trống nếu là cảnh báo chung cho cả lớp
    type: AlertType
    title: str
    content: str

# Dùng khi giáo viên bấm nút "Đánh dấu đã giải quyết"
class AlertUpdate(BaseModel):
    is_resolved: bool

# Dùng khi trả dữ liệu về cho Dashboard của giáo viên xem
class AlertResponse(BaseModel):
    id: UUID
    student_id: Optional[UUID]
    type: AlertType
    title: str
    content: str
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True