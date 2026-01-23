"""
User-related Pydantic models
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional


class UserRole:
    REGULAR = "regular"
    DOCTOR = "doctor"
    NURSE = "nurse"
    DRIVER = "driver"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: str = UserRole.REGULAR
    language: str = "sr"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool = True
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RoleUpdate(BaseModel):
    role: str


class StatusUpdate(BaseModel):
    is_active: bool
