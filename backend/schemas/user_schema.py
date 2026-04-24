from pydantic import BaseModel, HttpUrl
from uuid import UUID
from datetime import datetime
from typing import Optional
from .enums_schema import UserRole


# --- Base ---
class UserBase(BaseModel):
    full_name: str
    role: UserRole
    grade: Optional[str] = None
    avatar_url: Optional[str] = None


# --- Auth: Đăng ký ---
class UserRegister(BaseModel):
    """Payload khi đăng ký tài khoản mới."""
    username: str       # Tên đăng nhập (viết liền, không dấu)
    password: str       # Mật khẩu gốc (sẽ được hash ở backend)
    full_name: str      # Họ và tên hiển thị
    role: UserRole = UserRole.STUDENT
    grade: Optional[str] = None


# --- Auth: Đăng nhập ---
class UserLogin(BaseModel):
    """Payload khi đăng nhập."""
    username: str
    password: str


# --- Auth: Response trả về khi đăng nhập/đăng ký thành công ---
class AuthResponse(BaseModel):
    """Trả về thông tin user + token (nếu có)."""
    user: 'UserResponse'
    token: Optional[str] = None   # JWT token (tuỳ chọn nâng cao)


# --- Response trả về khi lấy thông tin user ---
class UserResponse(UserBase):
    id: UUID
    username: str
    full_name: str
    role: str
    grade: Optional[str] = None
    
    total_points: int
    current_streak: int
    study_hours_this_week: float

    class Config:
        from_attributes = True


# Rebuild AuthResponse để tham chiếu UserResponse đúng cách
AuthResponse.model_rebuild()