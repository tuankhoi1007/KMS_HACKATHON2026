import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from models.user_model import User
from schemas.user_schema import UserRegister, UserLogin, AuthResponse, UserResponse
import bcrypt
import jwt 

auth = APIRouter(prefix="/auth", tags=["Authentication"])

def hash_password(password: str) -> str:
    """Hash mật khẩu bằng bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    """Kiểm tra mật khẩu có khớp với hash không."""
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

from dotenv import load_dotenv
load_dotenv()

def create_access_token(data: dict):
    """Tạo vé thông hành (JWT Token) cho Frontend."""
    to_encode = data.copy()
    expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, os.getenv("SECRET_KEY", "brainroot_secret"), algorithm=os.getenv("ALGORITHM", "HS256"))
    return encoded_jwt

# ============================================================================
# POST /auth/register  — Đăng ký tài khoản
# ============================================================================
@auth.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Tạo tài khoản mới (học sinh hoặc giáo viên)."""

    # 1. Kiểm tra username đã tồn tại chưa
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.")

    # 2. Hash mật khẩu
    hashed_pw = hash_password(payload.password)

    # 3. Xử lý giá trị Role (đề phòng lỗi Schema Enum)
    user_role = payload.role.value if hasattr(payload.role, 'value') else payload.role

    # 4. Tạo user mới
    new_user = User(
        username=payload.username,
        password_hash=hashed_pw,
        full_name=payload.full_name,
        role=user_role,
        grade=payload.grade,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 5. Sinh Token
    access_token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role})

    return AuthResponse(user=UserResponse.model_validate(new_user), token=access_token)

# ============================================================================
# POST /auth/login  — Đăng nhập
# ============================================================================
@auth.post("/login", response_model=AuthResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Xác thực tên đăng nhập và mật khẩu."""

    # 1. Tìm user theo username
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu.")

    # 2. Verify mật khẩu
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu.")

    # 3. Sinh Token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})

    return AuthResponse(user=UserResponse.model_validate(user), token=access_token)