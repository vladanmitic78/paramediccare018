"""
Authentication utilities - JWT, password hashing, and user verification
"""
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, VERIFICATION_TOKEN_HOURS

security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str, role: str) -> str:
    """Create a JWT access token"""
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    return jwt.encode({"user_id": user_id, "role": role, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_verification_token(user_id: str) -> str:
    """Create a verification token for email verification"""
    exp = datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_HOURS)
    return jwt.encode({"user_id": user_id, "type": "verification", "exp": exp}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_verification_token(token: str) -> dict:
    """Verify an email verification token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "verification":
            raise HTTPException(status_code=400, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Verification link has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid verification link")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))):
    """Get current user if token provided, otherwise return None"""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None


def require_roles(allowed_roles: List[str]):
    """Decorator to require specific roles for an endpoint"""
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker
