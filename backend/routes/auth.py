"""
Authentication routes - /auth/*
Handles: User registration, login, email verification, profile
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import List
import jwt
import uuid

from config import (
    db, JWT_SECRET, JWT_ALGORITHM, 
    VERIFICATION_TOKEN_HOURS, FRONTEND_URL
)
from models import UserRole, UserCreate, UserLogin, UserResponse, TokenResponse
from utils.auth import hash_password, verify_password, create_token, get_current_user, require_roles
from utils.email import send_email, get_email_header, get_email_footer

router = APIRouter(tags=["Authentication"])


def create_verification_token(user_id: str) -> str:
    """Create a JWT token for email verification"""
    payload = {
        "user_id": user_id,
        "type": "email_verification",
        "exp": datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_verification_token(token: str) -> dict:
    """Verify and decode the email verification token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "email_verification":
            raise HTTPException(status_code=400, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Verification link has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid verification token")


def get_verification_email_template(full_name: str, verification_link: str, language: str = "sr"):
    """Email template for email verification"""
    if language == "en":
        subject = "Verify Your Email - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <h2 style="color: #0f172a; margin-bottom: 20px; text-align: center;">Verify Your Email Address</h2>
                <p style="color: #475569; line-height: 1.8; text-align: center;">Hello <strong>{full_name}</strong>,</p>
                <p style="color: #475569; line-height: 1.8; text-align: center;">Please click the button below to verify your email:</p>
                <div style="text-align: center; margin: 35px 0;">
                    <a href="{verification_link}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">VERIFY EMAIL</a>
                </div>
                <p style="color: #94a3b8; font-size: 13px; text-align: center;">This link will expire in {VERIFICATION_TOKEN_HOURS} hours.</p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "Potvrdite svoju email adresu - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <h2 style="color: #0f172a; margin-bottom: 20px; text-align: center;">Potvrdite svoju email adresu</h2>
                <p style="color: #475569; line-height: 1.8; text-align: center;">Poštovani <strong>{full_name}</strong>,</p>
                <p style="color: #475569; line-height: 1.8; text-align: center;">Kliknite na dugme ispod da biste potvrdili svoju email adresu:</p>
                <div style="text-align: center; margin: 35px 0;">
                    <a href="{verification_link}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">POTVRDI EMAIL</a>
                </div>
                <p style="color: #94a3b8; font-size: 13px; text-align: center;">Link ističe za {VERIFICATION_TOKEN_HOURS} sati.</p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body


def get_registration_email_template(full_name: str, email: str, language: str = "sr"):
    """Welcome email template after successful verification"""
    if language == "en":
        subject = "Welcome to Paramedic Care 018!"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <h2 style="color: #0f172a; margin-bottom: 20px;">Welcome, {full_name}!</h2>
                <p style="color: #475569; line-height: 1.8;">Your account has been successfully verified.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{FRONTEND_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">LOGIN NOW</a>
                </div>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "Dobrodošli u Paramedic Care 018!"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <h2 style="color: #0f172a; margin-bottom: 20px;">Dobrodošli, {full_name}!</h2>
                <p style="color: #475569; line-height: 1.8;">Vaš nalog je uspešno verifikovan.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{FRONTEND_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">PRIJAVI SE</a>
                </div>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body


def get_admin_new_user_notification_template(full_name: str, email: str, phone: str, registration_time: str, language: str = "sr"):
    """Email template to notify admin of new user registration"""
    subject = "🆕 Nova registracija korisnika - Paramedic Care 018"
    body = f"""
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
        {get_email_header()}
        <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-bottom: 20px;">Nova registracija korisnika</h2>
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; color: #334155;">
                    <tr><td style="padding: 8px 0; font-weight: bold;">Ime:</td><td>{full_name}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td>{email}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Telefon:</td><td>{phone}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Vreme:</td><td>{registration_time}</td></tr>
                </table>
            </div>
        </div>
        {get_email_footer("sr")}
    </body>
    </html>
    """
    return subject, body


@router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register a new user with email verification"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        if not existing.get("is_verified", False):
            verification_token = create_verification_token(existing["id"])
            verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
            subject, body = get_verification_email_template(existing["full_name"], verification_link, user_data.language)
            await send_email(user_data.email, subject, body)
            return {"message": "Verification email resent. Please check your inbox.", "requires_verification": True}
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    registration_time = datetime.now(timezone.utc)
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": user_data.role if user_data.role in [UserRole.REGULAR, UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER] else UserRole.REGULAR,
        "language": user_data.language,
        "is_active": True,
        "is_verified": False,
        "created_at": registration_time.isoformat()
    }
    await db.users.insert_one(user_doc)
    
    verification_token = create_verification_token(user_id)
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    
    subject, body = get_verification_email_template(user_data.full_name, verification_link, user_data.language)
    await send_email(user_data.email, subject, body)
    
    admin_email = "info@paramedic-care018.rs"
    formatted_time = registration_time.strftime("%d.%m.%Y %H:%M")
    admin_subject, admin_body = get_admin_new_user_notification_template(
        user_data.full_name, user_data.email, user_data.phone or "N/A", formatted_time, "sr"
    )
    await send_email(admin_email, admin_subject, admin_body)
    
    return {"message": "Registration successful. Please check your email to verify your account.", "requires_verification": True}


@router.get("/auth/verify-email")
async def verify_email(token: str):
    """Verify user's email address"""
    payload = verify_verification_token(token)
    user_id = payload["user_id"]
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("is_verified", False):
        return {"message": "Email already verified", "already_verified": True}
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    subject, body = get_registration_email_template(user["full_name"], user["email"], user.get("language", "sr"))
    await send_email(user["email"], subject, body)
    
    return {"message": "Email verified successfully! Welcome email has been sent.", "verified": True}


@router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email and password"""
    email = credentials.email.strip().lower()
    password = credentials.password.strip() if credentials.password else ""
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account deactivated")
    if not user.get("is_verified", False):
        raise HTTPException(status_code=401, detail="Please verify your email before logging in")
    
    token = create_token(user["id"], user["role"])
    user_response = {k: v for k, v in user.items() if k != "password"}
    return TokenResponse(access_token=token, user=UserResponse(**user_response))


@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(**{k: v for k, v in user.items() if k != "password"})


# ============ USER MANAGEMENT (Admin) ============

@router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]


@router.get("/users/staff", response_model=List[UserResponse])
async def get_staff(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DOCTOR, UserRole.NURSE]))):
    """Get staff members (drivers, nurses, doctors)"""
    staff_roles = [UserRole.DRIVER, UserRole.NURSE, UserRole.DOCTOR, UserRole.ADMIN]
    users = await db.users.find(
        {"role": {"$in": staff_roles}, "is_active": True},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    return [UserResponse(**u) for u in users]
