from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
import shutil
import io
import asyncio
import json

# PDF Generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'paramedic-care-018-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Email Settings - All emails sent from info@paramedic-care018.rs
SMTP_HOST = os.environ.get('SMTP_HOST', 'mailcluster.loopia.se')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 465))
INFO_EMAIL = os.environ.get('INFO_EMAIL', 'info@paramedic-care018.rs')
INFO_PASS = os.environ.get('INFO_PASS', 'Ambulanta!SSSS2026')
TRANSPORT_EMAIL = os.environ.get('TRANSPORT_EMAIL', 'transport@paramedic-care018.rs')
MEDICAL_EMAIL = os.environ.get('MEDICAL_EMAIL', 'ambulanta@paramedic-care018.rs')

# Frontend URL for verification links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://paracare.preview.emergentagent.com')

# Verification token expiration (24 hours)
VERIFICATION_TOKEN_HOURS = 24

# Create the main app
app = FastAPI(title="Paramedic Care 018 API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

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
    language: str = "sr"  # User's preferred language for emails

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

class BookingCreate(BaseModel):
    start_point: str
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    end_point: str
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    booking_date: str
    contact_phone: str
    contact_email: EmailStr
    patient_name: str
    notes: Optional[str] = None
    documents: Optional[List[str]] = []
    booking_type: str = "transport"  # transport or medical
    language: str = "sr"  # User's language preference

class BookingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    start_point: str
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    end_point: str
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    booking_date: str
    contact_phone: str
    contact_email: str
    patient_name: str
    notes: Optional[str] = None
    documents: List[str] = []
    status: str
    assigned_driver: Optional[str] = None
    assigned_medical: Optional[str] = None
    created_at: str
    user_id: Optional[str] = None

class BookingStatusUpdate(BaseModel):
    status: str
    assigned_driver: Optional[str] = None
    assigned_medical: Optional[str] = None

# ============ PATIENT PORTAL MODELS ============

class BookingStatus:
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    EN_ROUTE = "en_route"
    PICKED_UP = "picked_up"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MobilityStatus:
    WALKING = "walking"
    WHEELCHAIR = "wheelchair"
    STRETCHER = "stretcher"

# ============ DRIVER APP MODELS ============

class DriverStatus:
    OFFLINE = "offline"
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    EN_ROUTE = "en_route"
    ON_SITE = "on_site"
    TRANSPORTING = "transporting"

class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    speed: Optional[float] = None  # km/h
    heading: Optional[float] = None  # degrees
    accuracy: Optional[float] = None  # meters

class DriverStatusUpdate(BaseModel):
    status: str
    booking_id: Optional[str] = None

class DriverAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    booking_id: str
    patient_name: str
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    destination_address: str
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    preferred_date: str
    preferred_time: str
    mobility_status: str
    transport_reason: str
    contact_phone: str
    status: str

# WebSocket connection manager for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # driver_id -> websocket
        self.admin_connections: List[WebSocket] = []  # admin websockets for live map
    
    async def connect_driver(self, websocket: WebSocket, driver_id: str):
        await websocket.accept()
        self.active_connections[driver_id] = websocket
        logger.info(f"Driver {driver_id} connected")
    
    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_connections.append(websocket)
        logger.info(f"Admin connected to live map")
    
    def disconnect_driver(self, driver_id: str):
        if driver_id in self.active_connections:
            del self.active_connections[driver_id]
            logger.info(f"Driver {driver_id} disconnected")
    
    def disconnect_admin(self, websocket: WebSocket):
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)
            logger.info(f"Admin disconnected from live map")
    
    async def send_to_driver(self, driver_id: str, message: dict):
        if driver_id in self.active_connections:
            await self.active_connections[driver_id].send_json(message)
    
    async def broadcast_to_admins(self, message: dict):
        disconnected = []
        for connection in self.admin_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        for conn in disconnected:
            self.admin_connections.remove(conn)

ws_manager = ConnectionManager()

class PatientBookingCreate(BaseModel):
    # Patient Information
    patient_name: str
    patient_age: int
    contact_phone: str
    contact_email: EmailStr
    
    # Transport Need
    transport_reason: str  # dropdown value
    transport_reason_details: Optional[str] = None
    mobility_status: str = MobilityStatus.WALKING
    
    # Transport Details
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    destination_address: str
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    preferred_date: str
    preferred_time: str
    
    # Consent
    consent_given: bool = False
    language: str = "sr"

class PatientBookingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_name: str
    patient_age: int
    contact_phone: str
    contact_email: str
    transport_reason: str
    transport_reason_details: Optional[str] = None
    mobility_status: str
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    destination_address: str
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    preferred_date: str
    preferred_time: str
    status: str
    assigned_driver: Optional[str] = None
    assigned_vehicle: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    user_id: str
    invoice_id: Optional[str] = None

class SavedAddress(BaseModel):
    label: str  # "Home", "Work", etc.
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class EmergencyContact(BaseModel):
    name: str
    phone: str
    relationship: str

class PatientProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    saved_addresses: Optional[List[SavedAddress]] = None
    emergency_contact: Optional[EmergencyContact] = None
    preferred_language: Optional[str] = None

class InvoiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    invoice_number: str
    booking_id: str
    patient_name: str
    patient_email: str
    service_type: str
    service_date: str
    service_description: str
    amount: float
    tax: float
    total: float
    payment_status: str  # pending, paid
    created_at: str
    due_date: str

# ============ STAFF AVAILABILITY MODELS ============
class AvailabilityStatus:
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    ON_LEAVE = "on_leave"
    SICK = "sick"

class AvailabilityCreate(BaseModel):
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    status: str = AvailabilityStatus.AVAILABLE
    notes: Optional[str] = None
    repeat_weekly: bool = False  # If true, repeat for next 4 weeks

class AvailabilityUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AvailabilityResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    user_role: str
    date: str
    start_time: str
    end_time: str
    status: str
    notes: Optional[str] = None
    created_at: str

class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title_sr: str
    title_en: str
    message_sr: str
    message_en: str
    notification_type: str  # booking_confirmation, status_update, admin_message
    is_read: bool
    created_at: str
    booking_id: Optional[str] = None

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    inquiry_type: str = "general"  # general, transport, medical
    language: str = "sr"  # User's language preference

class ContactResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    message: str
    is_read: bool = False
    created_at: str

class ContentCreate(BaseModel):
    key: str
    title_sr: str
    title_en: str
    content_sr: str
    content_en: str
    image_url: Optional[str] = None
    category: str
    order: int = 0

class ContentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    key: str
    title_sr: str
    title_en: str
    content_sr: str
    content_en: str
    image_url: Optional[str] = None
    category: str
    order: int
    updated_at: str

class PageContentCreate(BaseModel):
    page: str  # medical-care, transport, about
    section: str  # hero, services, team, etc.
    title_sr: str
    title_en: str
    subtitle_sr: Optional[str] = None
    subtitle_en: Optional[str] = None
    content_sr: str
    content_en: str
    image_url: Optional[str] = None
    icon: Optional[str] = None
    order: int = 0
    is_active: bool = True

class PageContentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    page: str
    section: str
    title_sr: str
    title_en: str
    subtitle_sr: Optional[str] = None
    subtitle_en: Optional[str] = None
    content_sr: str
    content_en: str
    image_url: Optional[str] = None
    icon: Optional[str] = None
    order: int
    is_active: bool
    updated_at: str
    updated_by: Optional[str] = None

class ServiceCreate(BaseModel):
    name_sr: str
    name_en: str
    description_sr: str
    description_en: str
    icon: str
    category: str
    order: int = 0
    is_active: bool = True

class ServiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name_sr: str
    name_en: str
    description_sr: str
    description_en: str
    icon: str
    category: str
    order: int
    is_active: bool

# ============ MEDICAL PATIENT PROFILE MODELS ============

class MedicalCondition(BaseModel):
    name: str
    diagnosed_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    prescribed_by: Optional[str] = None
    notes: Optional[str] = None

class Allergy(BaseModel):
    allergen: str
    reaction: Optional[str] = None
    severity: str = "moderate"  # mild, moderate, severe
    notes: Optional[str] = None

class MedicalEmergencyContact(BaseModel):
    name: str
    relationship: str
    phone: str
    is_primary: bool = False

class PatientMedicalProfileCreate(BaseModel):
    # Basic Info
    full_name: str
    date_of_birth: str
    gender: str  # male, female, other
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    
    # Medical Info
    blood_type: Optional[str] = None  # A+, A-, B+, B-, AB+, AB-, O+, O-
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    
    # Medical History
    allergies: List[Allergy] = []
    chronic_conditions: List[MedicalCondition] = []
    current_medications: List[Medication] = []
    
    # Emergency Contacts
    emergency_contacts: List[MedicalEmergencyContact] = []
    
    # Additional
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None

class PatientMedicalProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    blood_type: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    allergies: Optional[List[Allergy]] = None
    chronic_conditions: Optional[List[MedicalCondition]] = None
    current_medications: Optional[List[Medication]] = None
    emergency_contacts: Optional[List[MedicalEmergencyContact]] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None

class PatientMedicalProfileResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str  # Unique patient identifier like "PC018-P-00001"
    full_name: str
    date_of_birth: str
    gender: str
    age: Optional[int] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    blood_type: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    bmi: Optional[float] = None
    allergies: List[dict] = []
    chronic_conditions: List[dict] = []
    current_medications: List[dict] = []
    emergency_contacts: List[dict] = []
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: str
    created_by: str
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None

# ============ VITAL SIGNS MODELS ============

class VitalSignsEntry(BaseModel):
    patient_id: str
    # Core Vitals
    systolic_bp: Optional[int] = None  # mmHg
    diastolic_bp: Optional[int] = None  # mmHg
    heart_rate: Optional[int] = None  # bpm
    oxygen_saturation: Optional[int] = None  # SpO2 %
    respiratory_rate: Optional[int] = None  # breaths/min
    temperature: Optional[float] = None  # Celsius
    blood_glucose: Optional[float] = None  # mg/dL or mmol/L
    
    # Advanced
    pain_score: Optional[int] = None  # 1-10
    gcs_score: Optional[int] = None  # Glasgow Coma Scale 3-15
    
    # Context
    measurement_type: str = "routine"  # routine, emergency, transport
    notes: Optional[str] = None
    recorded_by: Optional[str] = None  # Will be set from auth
    recorded_at: Optional[str] = None  # Will be auto-set

class VitalSignsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    blood_glucose: Optional[float] = None
    pain_score: Optional[int] = None
    gcs_score: Optional[int] = None
    measurement_type: str
    notes: Optional[str] = None
    recorded_by: str
    recorded_by_name: Optional[str] = None
    recorded_at: str
    # Flags for abnormal values
    flags: Optional[List[str]] = []

# ============ MEDICAL CHECK / EXAMINATION MODELS ============

class MedicalCheckCreate(BaseModel):
    patient_id: str
    check_type: str = "routine"  # routine, follow_up, emergency, pre_transport
    location: Optional[str] = None
    
    # Vitals (can be auto-filled)
    vitals: Optional[VitalSignsEntry] = None
    
    # Examination
    symptoms: Optional[str] = None
    physical_findings: Optional[str] = None
    provisional_diagnosis: Optional[str] = None
    recommendations: Optional[str] = None
    
    # Medications Prescribed
    prescriptions: List[Medication] = []
    
    # Lifestyle
    smoking_status: Optional[str] = None  # never, former, current
    alcohol_use: Optional[str] = None  # none, occasional, regular
    physical_activity: Optional[str] = None  # sedentary, light, moderate, active
    
    # Attachments
    attachments: List[str] = []  # File URLs

class MedicalCheckResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    patient_name: Optional[str] = None
    check_type: str
    location: Optional[str] = None
    vitals: Optional[dict] = None
    symptoms: Optional[str] = None
    physical_findings: Optional[str] = None
    provisional_diagnosis: Optional[str] = None
    recommendations: Optional[str] = None
    prescriptions: List[dict] = []
    smoking_status: Optional[str] = None
    alcohol_use: Optional[str] = None
    physical_activity: Optional[str] = None
    attachments: List[str] = []
    performed_by: str
    performed_by_name: Optional[str] = None
    performed_at: str
    signed_by: Optional[str] = None
    signed_at: Optional[str] = None

# ============ HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    return jwt.encode({"user_id": user_id, "role": role, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

def require_roles(allowed_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

async def send_email(to_email: str, subject: str, body_html: str):
    """Send email from info@paramedic-care018.rs"""
    try:
        message = MIMEMultipart("alternative")
        message["From"] = INFO_EMAIL
        message["To"] = to_email
        message["Subject"] = subject
        message.attach(MIMEText(body_html, "html"))
        
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=INFO_EMAIL,
            password=INFO_PASS,
            use_tls=True
        )
        logger.info(f"Email sent to {to_email} from {INFO_EMAIL}")
        return True
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return False

# ============ EMAIL TEMPLATES ============

def get_email_header():
    """Common email header with company logo and branding"""
    return """
    <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
        <img src="https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg" alt="Paramedic Care 018" style="height: 60px; width: auto;">
    </div>
    """

def get_email_footer(language: str = "sr"):
    """Common email footer with company details"""
    if language == "en":
        return """
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; margin-top: 30px;">
            <p style="margin: 5px 0;"><strong>Paramedic Care 018</strong></p>
            <p style="margin: 5px 0;">Žarka Zrenjanina 50A, 18103 Niš, Serbia</p>
            <p style="margin: 5px 0;">Phone: +381 18 123 456 | Email: info@paramedic-care018.rs</p>
            <p style="margin: 5px 0;">PIB: 115243796 | MB: 68211557</p>
            <p style="margin: 15px 0 5px 0; font-size: 11px;">© 2026 Paramedic Care 018. All rights reserved.</p>
        </div>
        """
    else:
        return """
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; margin-top: 30px;">
            <p style="margin: 5px 0;"><strong>Paramedic Care 018</strong></p>
            <p style="margin: 5px 0;">Žarka Zrenjanina 50A, 18103 Niš, Srbija</p>
            <p style="margin: 5px 0;">Telefon: +381 18 123 456 | Email: info@paramedic-care018.rs</p>
            <p style="margin: 5px 0;">PIB: 115243796 | MB: 68211557</p>
            <p style="margin: 15px 0 5px 0; font-size: 11px;">© 2026 Paramedic Care 018. Sva prava zadržana.</p>
        </div>
        """

def get_verification_email_template(full_name: str, verification_link: str, language: str = "sr"):
    """Email template for email verification"""
    if language == "en":
        subject = "Verify Your Email - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Icon -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 50%; padding: 20px; box-shadow: 0 10px 40px rgba(14, 165, 233, 0.3);">
                        <span style="font-size: 40px;">✉️</span>
                    </div>
                </div>
                
                <!-- Title -->
                <h1 style="color: #0f172a; margin-bottom: 10px; text-align: center; font-size: 28px; font-weight: 700;">Verify Your Email</h1>
                <p style="color: #64748b; text-align: center; font-size: 16px; margin-bottom: 30px;">One more step to complete your registration</p>
                
                <!-- Greeting -->
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Hello <strong style="color: #0ea5e9;">{full_name}</strong>,</p>
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Thank you for registering with Paramedic Care 018! To complete your registration and access all features, please verify your email address by clicking the button below:</p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="{verification_link}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4); transition: all 0.3s;">
                        ✓ Verify My Email
                    </a>
                </div>
                
                <!-- Alternative Link -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0;">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="color: #0ea5e9; font-size: 12px; word-break: break-all; margin: 0; background-color: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">{verification_link}</p>
                </div>
                
                <!-- Security Note -->
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>⚠️ Security Note:</strong> This verification link will expire in 24 hours. If you didn't create an account with us, please ignore this email.
                    </p>
                </div>
                
                <!-- Footer Message -->
                <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
                    Need help? Contact us at <a href="mailto:info@paramedic-care018.rs" style="color: #0ea5e9;">info@paramedic-care018.rs</a>
                </p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "Potvrdite Vašu Email Adresu - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Icon -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 50%; padding: 20px; box-shadow: 0 10px 40px rgba(14, 165, 233, 0.3);">
                        <span style="font-size: 40px;">✉️</span>
                    </div>
                </div>
                
                <!-- Title -->
                <h1 style="color: #0f172a; margin-bottom: 10px; text-align: center; font-size: 28px; font-weight: 700;">Potvrdite Vašu Email Adresu</h1>
                <p style="color: #64748b; text-align: center; font-size: 16px; margin-bottom: 30px;">Još jedan korak do završetka registracije</p>
                
                <!-- Greeting -->
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Poštovani/a <strong style="color: #0ea5e9;">{full_name}</strong>,</p>
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Hvala vam što ste se registrovali na Paramedic Care 018! Da biste završili registraciju i pristupili svim funkcijama, molimo vas da potvrdite vašu email adresu klikom na dugme ispod:</p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="{verification_link}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4); transition: all 0.3s;">
                        ✓ Potvrdi Email
                    </a>
                </div>
                
                <!-- Alternative Link -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0;">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">Ako dugme ne radi, kopirajte i nalepite ovaj link u vaš pretraživač:</p>
                    <p style="color: #0ea5e9; font-size: 12px; word-break: break-all; margin: 0; background-color: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">{verification_link}</p>
                </div>
                
                <!-- Security Note -->
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>⚠️ Bezbednosna napomena:</strong> Ovaj link za verifikaciju ističe za 24 sata. Ako niste kreirali nalog kod nas, molimo vas da ignorišete ovaj email.
                    </p>
                </div>
                
                <!-- Footer Message -->
                <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
                    Potrebna vam je pomoć? Kontaktirajte nas na <a href="mailto:info@paramedic-care018.rs" style="color: #0ea5e9;">info@paramedic-care018.rs</a>
                </p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body

def get_registration_email_template(full_name: str, email: str, language: str = "sr"):
    """Email template for successful registration - sent after email verification"""
    if language == "en":
        subject = "🎉 Welcome to Paramedic Care 018!"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Success Icon -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; padding: 25px; box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);">
                        <span style="font-size: 50px;">🎉</span>
                    </div>
                </div>
                
                <!-- Title -->
                <h1 style="color: #0f172a; margin-bottom: 10px; text-align: center; font-size: 32px; font-weight: 700;">Welcome to the Family!</h1>
                <p style="color: #10b981; text-align: center; font-size: 18px; font-weight: 600; margin-bottom: 30px;">Your account is now verified and ready to use</p>
                
                <!-- Greeting -->
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Dear <strong style="color: #0ea5e9;">{full_name}</strong>,</p>
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Congratulations! Your email has been verified and your Paramedic Care 018 account is now fully activated.</p>
                
                <!-- Account Info Card -->
                <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; padding: 25px; margin: 30px 0; border: 1px solid #bae6fd;">
                    <h3 style="color: #0284c7; margin: 0 0 15px 0; font-size: 16px;">📋 Account Details</h3>
                    <table style="width: 100%;">
                        <tr>
                            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Email:</td>
                            <td style="color: #0f172a; padding: 8px 0; font-size: 14px; font-weight: 600;">{email}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">✓ Verified</span></td>
                        </tr>
                    </table>
                </div>
                
                <!-- Features -->
                <h3 style="color: #0f172a; font-size: 18px; margin-bottom: 20px;">What you can do now:</h3>
                <div style="display: table; width: 100%;">
                    <div style="display: table-row;">
                        <div style="display: table-cell; padding: 15px; background-color: #fef3c7; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">🚑</span>
                            <p style="color: #92400e; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Book Transport</p>
                            <p style="color: #a16207; margin: 0; font-size: 12px;">Schedule medical transport</p>
                        </div>
                        <div style="display: table-cell; width: 4%;"></div>
                        <div style="display: table-cell; padding: 15px; background-color: #dbeafe; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">📊</span>
                            <p style="color: #1e40af; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Track Status</p>
                            <p style="color: #3b82f6; margin: 0; font-size: 12px;">Real-time updates</p>
                        </div>
                    </div>
                </div>
                
                <div style="display: table; width: 100%; margin-top: 15px;">
                    <div style="display: table-row;">
                        <div style="display: table-cell; padding: 15px; background-color: #f3e8ff; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">📜</span>
                            <p style="color: #7c3aed; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">View History</p>
                            <p style="color: #8b5cf6; margin: 0; font-size: 12px;">Access past bookings</p>
                        </div>
                        <div style="display: table-cell; width: 4%;"></div>
                        <div style="display: table-cell; padding: 15px; background-color: #dcfce7; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">💬</span>
                            <p style="color: #166534; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Get Support</p>
                            <p style="color: #22c55e; margin: 0; font-size: 12px;">24/7 assistance</p>
                        </div>
                    </div>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="https://paramedic-care018.rs/login" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4);">
                        Go to My Dashboard →
                    </a>
                </div>
                
                <!-- Emergency Contact -->
                <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: 600;">🚨 Emergency Contact</p>
                    <p style="margin: 0; color: #dc2626; font-size: 24px; font-weight: 700;">+381 18 123 456</p>
                    <p style="margin: 5px 0 0 0; color: #7f1d1d; font-size: 12px;">Available 24/7</p>
                </div>
                
                <p style="color: #334155; line-height: 1.8; margin-top: 30px; font-size: 16px;">Thank you for choosing Paramedic Care 018. We're here to help you whenever you need us.</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 20px;">Warm regards,<br><strong style="color: #0ea5e9;">The Paramedic Care 018 Team</strong></p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "🎉 Dobrodošli u Paramedic Care 018!"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Success Icon -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; padding: 25px; box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);">
                        <span style="font-size: 50px;">🎉</span>
                    </div>
                </div>
                
                <!-- Title -->
                <h1 style="color: #0f172a; margin-bottom: 10px; text-align: center; font-size: 32px; font-weight: 700;">Dobrodošli u našu porodicu!</h1>
                <p style="color: #10b981; text-align: center; font-size: 18px; font-weight: 600; margin-bottom: 30px;">Vaš nalog je verifikovan i spreman za korišćenje</p>
                
                <!-- Greeting -->
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Poštovani/a <strong style="color: #0ea5e9;">{full_name}</strong>,</p>
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Čestitamo! Vaš email je verifikovan i vaš Paramedic Care 018 nalog je sada potpuno aktiviran.</p>
                
                <!-- Account Info Card -->
                <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; padding: 25px; margin: 30px 0; border: 1px solid #bae6fd;">
                    <h3 style="color: #0284c7; margin: 0 0 15px 0; font-size: 16px;">📋 Podaci o nalogu</h3>
                    <table style="width: 100%;">
                        <tr>
                            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Email:</td>
                            <td style="color: #0f172a; padding: 8px 0; font-size: 14px; font-weight: 600;">{email}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">✓ Verifikovan</span></td>
                        </tr>
                    </table>
                </div>
                
                <!-- Features -->
                <h3 style="color: #0f172a; font-size: 18px; margin-bottom: 20px;">Šta sada možete da radite:</h3>
                <div style="display: table; width: 100%;">
                    <div style="display: table-row;">
                        <div style="display: table-cell; padding: 15px; background-color: #fef3c7; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">🚑</span>
                            <p style="color: #92400e; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Rezervišite Transport</p>
                            <p style="color: #a16207; margin: 0; font-size: 12px;">Zakažite medicinski prevoz</p>
                        </div>
                        <div style="display: table-cell; width: 4%;"></div>
                        <div style="display: table-cell; padding: 15px; background-color: #dbeafe; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">📊</span>
                            <p style="color: #1e40af; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Pratite Status</p>
                            <p style="color: #3b82f6; margin: 0; font-size: 12px;">Ažuriranja u realnom vremenu</p>
                        </div>
                    </div>
                </div>
                
                <div style="display: table; width: 100%; margin-top: 15px;">
                    <div style="display: table-row;">
                        <div style="display: table-cell; padding: 15px; background-color: #f3e8ff; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">📜</span>
                            <p style="color: #7c3aed; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Pregledajte Istoriju</p>
                            <p style="color: #8b5cf6; margin: 0; font-size: 12px;">Pristupite prošlim rezervacijama</p>
                        </div>
                        <div style="display: table-cell; width: 4%;"></div>
                        <div style="display: table-cell; padding: 15px; background-color: #dcfce7; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">💬</span>
                            <p style="color: #166534; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Dobijte Podršku</p>
                            <p style="color: #22c55e; margin: 0; font-size: 12px;">24/7 pomoć</p>
                        </div>
                    </div>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="https://paramedic-care018.rs/login" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4);">
                        Idi na Moj Panel →
                    </a>
                </div>
                
                <!-- Emergency Contact -->
                <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: 600;">🚨 Hitna linija</p>
                    <p style="margin: 0; color: #dc2626; font-size: 24px; font-weight: 700;">+381 18 123 456</p>
                    <p style="margin: 5px 0 0 0; color: #7f1d1d; font-size: 12px;">Dostupno 24/7</p>
                </div>
                
                <p style="color: #334155; line-height: 1.8; margin-top: 30px; font-size: 16px;">Hvala vam što ste izabrali Paramedic Care 018. Tu smo za vas kad god vam zatrebamo.</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 20px;">Srdačan pozdrav,<br><strong style="color: #0ea5e9;">Tim Paramedic Care 018</strong></p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body

def get_admin_new_user_notification_template(user_name: str, user_email: str, user_phone: str, registration_time: str, language: str = "sr"):
    """Email template to notify admin of new user registration"""
    if language == "en":
        subject = "🆕 New User Registration - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 15px;">
                        <span style="font-size: 30px;">👤</span>
                    </div>
                </div>
                
                <h2 style="color: #0f172a; margin-bottom: 20px; text-align: center;">New User Registration</h2>
                <p style="color: #334155; line-height: 1.6; text-align: center;">A new user has registered on the Paramedic Care 018 platform.</p>
                
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #0ea5e9; margin-top: 0; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">User Details</h3>
                    <table style="width: 100%; color: #334155;">
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold; width: 35%;">Full Name:</td>
                            <td style="padding: 10px 0;">{user_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Email:</td>
                            <td style="padding: 10px 0;"><a href="mailto:{user_email}" style="color: #0ea5e9;">{user_email}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Phone:</td>
                            <td style="padding: 10px 0;"><a href="tel:{user_phone}" style="color: #0ea5e9;">{user_phone}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Registered:</td>
                            <td style="padding: 10px 0;">{registration_time}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>Action Required:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">You can view and manage this user in the Admin Dashboard under User Management.</p>
                </div>
                
                <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">This is an automated notification from Paramedic Care 018 system.</p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "🆕 Nova registracija korisnika - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 15px;">
                        <span style="font-size: 30px;">👤</span>
                    </div>
                </div>
                
                <h2 style="color: #0f172a; margin-bottom: 20px; text-align: center;">Nova registracija korisnika</h2>
                <p style="color: #334155; line-height: 1.6; text-align: center;">Novi korisnik se registrovao na platformi Paramedic Care 018.</p>
                
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #0ea5e9; margin-top: 0; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">Podaci o korisniku</h3>
                    <table style="width: 100%; color: #334155;">
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold; width: 35%;">Ime i prezime:</td>
                            <td style="padding: 10px 0;">{user_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Email:</td>
                            <td style="padding: 10px 0;"><a href="mailto:{user_email}" style="color: #0ea5e9;">{user_email}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Telefon:</td>
                            <td style="padding: 10px 0;"><a href="tel:{user_phone}" style="color: #0ea5e9;">{user_phone}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Registrovan:</td>
                            <td style="padding: 10px 0;">{registration_time}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>Potrebna akcija:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Možete pregledati i upravljati ovim korisnikom u Admin panelu pod Upravljanje korisnicima.</p>
                </div>
                
                <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">Ovo je automatska notifikacija iz sistema Paramedic Care 018.</p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body

def get_contact_autoreply_template(name: str, inquiry_type: str, language: str = "sr"):
    """Email template for contact form auto-reply"""
    inquiry_labels = {
        "general": {"sr": "Opšti upit", "en": "General Inquiry"},
        "transport": {"sr": "Transport", "en": "Transport"},
        "medical": {"sr": "Medicinska nega", "en": "Medical Care"}
    }
    inquiry_label = inquiry_labels.get(inquiry_type, inquiry_labels["general"])
    
    if language == "en":
        subject = "We received your message - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f172a; margin-bottom: 20px;">Thank you for contacting us!</h2>
                <p style="color: #334155; line-height: 1.6;">Dear <strong>{name}</strong>,</p>
                <p style="color: #334155; line-height: 1.6;">We have received your message regarding <strong>{inquiry_label["en"]}</strong>.</p>
                
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;"><strong>What happens next?</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Our team will review your message and respond within 24 hours during business days.</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">For urgent medical transport needs, please call us directly:</p>
                <p style="color: #0ea5e9; font-size: 20px; font-weight: bold; margin: 15px 0;">+381 18 123 456</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Paramedic Care 018 Team</strong></p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "Primili smo vašu poruku - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f172a; margin-bottom: 20px;">Hvala vam što ste nas kontaktirali!</h2>
                <p style="color: #334155; line-height: 1.6;">Poštovani/a <strong>{name}</strong>,</p>
                <p style="color: #334155; line-height: 1.6;">Primili smo vašu poruku u vezi sa: <strong>{inquiry_label["sr"]}</strong>.</p>
                
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;"><strong>Šta sledi?</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Naš tim će pregledati vašu poruku i odgovoriti u roku od 24 sata tokom radnih dana.</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">Za hitne potrebe medicinskog transporta, pozovite nas direktno:</p>
                <p style="color: #0ea5e9; font-size: 20px; font-weight: bold; margin: 15px 0;">+381 18 123 456</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 30px;">Srdačan pozdrav,<br><strong>Tim Paramedic Care 018</strong></p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body

def get_booking_confirmation_template(patient_name: str, booking_date: str, start_point: str, end_point: str, booking_id: str, booking_type: str = "transport", language: str = "sr"):
    """Email template for booking confirmation (transport or medical care)"""
    
    if booking_type == "medical":
        icon_color = "#0ea5e9"
        type_label = {"sr": "Medicinska Nega", "en": "Medical Care"}
    else:
        icon_color = "#ef4444"
        type_label = {"sr": "Medicinski Transport", "en": "Medical Transport"}
    
    if language == "en":
        subject = f"Booking Confirmation - {type_label['en']} - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 15px;">
                        <span style="font-size: 30px;">✓</span>
                    </div>
                </div>
                
                <h2 style="color: #0f172a; margin-bottom: 20px; text-align: center;">Booking Confirmed!</h2>
                <p style="color: #334155; line-height: 1.6; text-align: center;">Your <strong>{type_label['en']}</strong> booking has been successfully submitted.</p>
                
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: {icon_color}; margin-top: 0; border-bottom: 2px solid {icon_color}; padding-bottom: 10px;">Booking Details</h3>
                    <table style="width: 100%; color: #334155;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; width: 40%;">Booking ID:</td>
                            <td style="padding: 8px 0;">{booking_id[:8]}...</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Patient Name:</td>
                            <td style="padding: 8px 0;">{patient_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Date & Time:</td>
                            <td style="padding: 8px 0;">{booking_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Pickup Location:</td>
                            <td style="padding: 8px 0;">{start_point}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Destination:</td>
                            <td style="padding: 8px 0;">{end_point}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">PENDING</span></td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>What happens next?</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Our team will review your booking and contact you to confirm the details. You will receive a confirmation call or SMS.</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">For any questions or changes to your booking, please contact us:</p>
                <p style="color: #0ea5e9; font-size: 18px; font-weight: bold; margin: 10px 0;">+381 18 123 456</p>
                <p style="color: #64748b; font-size: 14px;">info@paramedic-care018.rs</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Paramedic Care 018 Team</strong></p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = f"Potvrda rezervacije - {type_label['sr']} - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 15px;">
                        <span style="font-size: 30px;">✓</span>
                    </div>
                </div>
                
                <h2 style="color: #0f172a; margin-bottom: 20px; text-align: center;">Rezervacija potvrđena!</h2>
                <p style="color: #334155; line-height: 1.6; text-align: center;">Vaša rezervacija za <strong>{type_label['sr']}</strong> je uspešno primljena.</p>
                
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: {icon_color}; margin-top: 0; border-bottom: 2px solid {icon_color}; padding-bottom: 10px;">Detalji rezervacije</h3>
                    <table style="width: 100%; color: #334155;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; width: 40%;">ID rezervacije:</td>
                            <td style="padding: 8px 0;">{booking_id[:8]}...</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Ime pacijenta:</td>
                            <td style="padding: 8px 0;">{patient_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Datum i vreme:</td>
                            <td style="padding: 8px 0;">{booking_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Polazna lokacija:</td>
                            <td style="padding: 8px 0;">{start_point}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Odredište:</td>
                            <td style="padding: 8px 0;">{end_point}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">NA ČEKANJU</span></td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>Šta sledi?</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Naš tim će pregledati vašu rezervaciju i kontaktirati vas radi potvrde detalja. Dobićete poziv ili SMS sa potvrdom.</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">Za sva pitanja ili izmene rezervacije, kontaktirajte nas:</p>
                <p style="color: #0ea5e9; font-size: 18px; font-weight: bold; margin: 10px 0;">+381 18 123 456</p>
                <p style="color: #64748b; font-size: 14px;">info@paramedic-care018.rs</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 30px;">Srdačan pozdrav,<br><strong>Tim Paramedic Care 018</strong></p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body

def get_internal_notification_template(notification_type: str, data: dict):
    """Internal notification email for staff"""
    if notification_type == "new_booking":
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Nova Rezervacija / New Booking</h2>
            <p><strong>Pacijent / Patient:</strong> {data.get('patient_name', 'N/A')}</p>
            <p><strong>Polazna tačka / Start:</strong> {data.get('start_point', 'N/A')}</p>
            <p><strong>Odredište / Destination:</strong> {data.get('end_point', 'N/A')}</p>
            <p><strong>Datum / Date:</strong> {data.get('booking_date', 'N/A')}</p>
            <p><strong>Telefon / Phone:</strong> {data.get('contact_phone', 'N/A')}</p>
            <p><strong>Email:</strong> {data.get('contact_email', 'N/A')}</p>
            <p><strong>Napomene / Notes:</strong> {data.get('notes', 'N/A')}</p>
            <hr>
            <p>Booking ID: {data.get('booking_id', 'N/A')}</p>
        </body>
        </html>
        """
    elif notification_type == "new_contact":
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Nova Kontakt Poruka / New Contact Message</h2>
            <p><strong>Tip upita / Inquiry Type:</strong> {data.get('inquiry_type', 'N/A')}</p>
            <p><strong>Ime / Name:</strong> {data.get('name', 'N/A')}</p>
            <p><strong>Email:</strong> {data.get('email', 'N/A')}</p>
            <p><strong>Telefon / Phone:</strong> {data.get('phone', 'N/A')}</p>
            <p><strong>Poruka / Message:</strong></p>
            <p>{data.get('message', 'N/A')}</p>
        </body>
        </html>
        """
    return ""

# ============ HEALTH CHECK ============

# Health check
@api_router.get("/health")
async def health():
    return {"status": "healthy", "service": "Paramedic Care 018 API"}

# ============ AUTH ROUTES ============

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

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        # Check if user exists but is not verified
        if not existing.get("is_verified", False):
            # Resend verification email
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
        "is_verified": False,  # Not verified until email confirmation
        "created_at": registration_time.isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create verification token and send verification email
    verification_token = create_verification_token(user_id)
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    
    subject, body = get_verification_email_template(user_data.full_name, verification_link, user_data.language)
    await send_email(user_data.email, subject, body)
    
    # Send notification email to admin
    admin_email = "info@paramedic-care018.rs"
    formatted_time = registration_time.strftime("%d.%m.%Y %H:%M")
    admin_subject, admin_body = get_admin_new_user_notification_template(
        user_data.full_name, 
        user_data.email, 
        user_data.phone or "N/A",
        formatted_time,
        "sr"  # Admin notification in Serbian
    )
    await send_email(admin_email, admin_subject, admin_body)
    
    return {"message": "Registration successful. Please check your email to verify your account.", "requires_verification": True}

@api_router.get("/auth/verify-email")
async def verify_email(token: str):
    """Verify user's email address"""
    payload = verify_verification_token(token)
    user_id = payload["user_id"]
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("is_verified", False):
        return {"message": "Email already verified", "already_verified": True}
    
    # Update user as verified
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Send welcome email now that user is verified
    subject, body = get_registration_email_template(user["full_name"], user["email"], user.get("language", "sr"))
    await send_email(user["email"], subject, body)
    
    return {"message": "Email verified successfully! Welcome email has been sent.", "verified": True}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Trim whitespace from email and password (helps with mobile keyboard issues)
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

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in user.items() if k != "password"})

# ============ USER MANAGEMENT (Admin) ============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, admin: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": user_data.role,
        "is_active": True,
        "is_verified": True,  # Admin-created users are auto-verified
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return UserResponse(**{k: v for k, v in user_doc.items() if k != "password" and k != "_id"})

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, role: str = None, is_active: bool = None, admin: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    update_doc = {}
    if role is not None:
        update_doc["role"] = role
    if is_active is not None:
        update_doc["is_active"] = is_active
    
    if update_doc:
        await db.users.update_one({"id": user_id}, {"$set": update_doc})
    return {"success": True}

class RoleUpdate(BaseModel):
    role: str

class StatusUpdate(BaseModel):
    is_active: bool

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: RoleUpdate, admin: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    # Check if trying to set superadmin role - only superadmin can do that
    if data.role == UserRole.SUPERADMIN and admin["role"] != UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can assign Super Admin role")
    
    # Admin can only assign: regular, doctor, nurse, driver
    # Super Admin can also assign: admin
    allowed_roles = [UserRole.REGULAR, UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER]
    if admin["role"] == UserRole.SUPERADMIN:
        allowed_roles.append(UserRole.ADMIN)
    
    if data.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Cannot assign this role")
    
    await db.users.update_one({"id": user_id}, {"$set": {"role": data.role}})
    return {"success": True}

@api_router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, data: StatusUpdate, admin: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    # Cannot deactivate superadmin unless you are superadmin
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if target_user and target_user.get("role") == UserRole.SUPERADMIN and admin["role"] != UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Cannot modify Super Admin status")
    
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": data.is_active}})
    return {"success": True}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    # Cannot delete superadmin
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if target_user and target_user.get("role") == UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Cannot delete Super Admin")
    
    await db.users.delete_one({"id": user_id})
    return {"success": True}

@api_router.get("/users/staff", response_model=List[UserResponse])
async def get_staff(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    staff = await db.users.find({"role": {"$in": [UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER]}}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**s) for s in staff]

# ============ BOOKING ROUTES ============

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))):
    """Get user if authenticated, otherwise return None"""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None

@api_router.post("/bookings", response_model=BookingResponse)
async def create_booking(booking: BookingCreate, user: dict = Depends(get_optional_user)):
    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        **booking.model_dump(),
        "status": "pending",
        "assigned_driver": None,
        "assigned_medical": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user["id"] if user else None
    }
    await db.bookings.insert_one(booking_doc)
    
    # Send confirmation email to customer
    subject, body = get_booking_confirmation_template(
        booking.patient_name,
        booking.booking_date,
        booking.start_point,
        booking.end_point,
        booking_id,
        booking.booking_type,
        booking.language
    )
    await send_email(booking.contact_email, subject, body)
    
    # Send internal notification to staff
    internal_body = get_internal_notification_template("new_booking", {
        "patient_name": booking.patient_name,
        "start_point": booking.start_point,
        "end_point": booking.end_point,
        "booking_date": booking.booking_date,
        "contact_phone": booking.contact_phone,
        "contact_email": booking.contact_email,
        "notes": booking.notes,
        "booking_id": booking_id
    })
    
    # Route to appropriate internal email based on booking type
    if booking.booking_type == "medical":
        await send_email(MEDICAL_EMAIL, f"Nova Rezervacija Medicinske Nege - {booking.patient_name}", internal_body)
    else:
        await send_email(TRANSPORT_EMAIL, f"Nova Rezervacija Transporta - {booking.patient_name}", internal_body)
    
    return BookingResponse(**{k: v for k, v in booking_doc.items() if k != "_id"})

@api_router.get("/bookings", response_model=List[BookingResponse])
async def get_bookings(user: dict = Depends(get_current_user)):
    if user["role"] in [UserRole.ADMIN, UserRole.SUPERADMIN]:
        bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    elif user["role"] in [UserRole.DRIVER, UserRole.DOCTOR, UserRole.NURSE]:
        bookings = await db.bookings.find(
            {"$or": [{"assigned_driver": user["id"]}, {"assigned_medical": user["id"]}]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
    else:
        bookings = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [BookingResponse(**b) for b in bookings]

@api_router.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse(**booking)

@api_router.put("/bookings/{booking_id}", response_model=BookingResponse)
async def update_booking(booking_id: str, update: BookingStatusUpdate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER, UserRole.DOCTOR, UserRole.NURSE]))):
    update_doc = {"status": update.status}
    if update.assigned_driver:
        update_doc["assigned_driver"] = update.assigned_driver
    if update.assigned_medical:
        update_doc["assigned_medical"] = update.assigned_medical
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_doc})
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return BookingResponse(**booking)

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    await db.bookings.delete_one({"id": booking_id})
    return {"success": True}

# ============ PATIENT PORTAL ROUTES ============

# Transport reasons for dropdown
TRANSPORT_REASONS = {
    "sr": [
        {"value": "hospital_appointment", "label": "Pregled u bolnici"},
        {"value": "dialysis", "label": "Dijaliza"},
        {"value": "rehabilitation", "label": "Rehabilitacija"},
        {"value": "discharge", "label": "Otpust iz bolnice"},
        {"value": "transfer", "label": "Premeštaj u drugu ustanovu"},
        {"value": "emergency", "label": "Hitna pomoć"},
        {"value": "other", "label": "Ostalo"}
    ],
    "en": [
        {"value": "hospital_appointment", "label": "Hospital Appointment"},
        {"value": "dialysis", "label": "Dialysis"},
        {"value": "rehabilitation", "label": "Rehabilitation"},
        {"value": "discharge", "label": "Hospital Discharge"},
        {"value": "transfer", "label": "Facility Transfer"},
        {"value": "emergency", "label": "Emergency"},
        {"value": "other", "label": "Other"}
    ]
}

@api_router.get("/patient/transport-reasons")
async def get_transport_reasons(language: str = "sr"):
    """Get transport reasons for booking form dropdown"""
    return TRANSPORT_REASONS.get(language, TRANSPORT_REASONS["sr"])

@api_router.get("/patient/dashboard")
async def get_patient_dashboard(user: dict = Depends(get_current_user)):
    """Get patient dashboard data"""
    user_id = user["id"]
    
    # Get user profile
    profile = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    # Get active booking (most recent non-completed/cancelled)
    active_booking = await db.patient_bookings.find_one(
        {"user_id": user_id, "status": {"$nin": ["completed", "cancelled"]}},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    # Get recent bookings count
    total_bookings = await db.patient_bookings.count_documents({"user_id": user_id})
    
    # Get unread notifications count
    unread_notifications = await db.notifications.count_documents({"user_id": user_id, "is_read": False})
    
    # Get pending invoices count
    pending_invoices = await db.invoices.count_documents({"user_id": user_id, "payment_status": "pending"})
    
    return {
        "profile": profile,
        "active_booking": active_booking,
        "stats": {
            "total_bookings": total_bookings,
            "unread_notifications": unread_notifications,
            "pending_invoices": pending_invoices
        }
    }

@api_router.post("/patient/bookings", response_model=PatientBookingResponse)
async def create_patient_booking(booking: PatientBookingCreate, user: dict = Depends(get_current_user)):
    """Create a new patient booking"""
    if not booking.consent_given:
        raise HTTPException(status_code=400, detail="Consent must be given to proceed")
    
    booking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    booking_doc = {
        "id": booking_id,
        "patient_name": booking.patient_name,
        "patient_age": booking.patient_age,
        "contact_phone": booking.contact_phone,
        "contact_email": booking.contact_email,
        "transport_reason": booking.transport_reason,
        "transport_reason_details": booking.transport_reason_details,
        "mobility_status": booking.mobility_status,
        "pickup_address": booking.pickup_address,
        "pickup_lat": booking.pickup_lat,
        "pickup_lng": booking.pickup_lng,
        "destination_address": booking.destination_address,
        "destination_lat": booking.destination_lat,
        "destination_lng": booking.destination_lng,
        "preferred_date": booking.preferred_date,
        "preferred_time": booking.preferred_time,
        "status": BookingStatus.REQUESTED,
        "assigned_driver": None,
        "assigned_vehicle": None,
        "created_at": now,
        "updated_at": now,
        "user_id": user["id"],
        "invoice_id": None
    }
    
    await db.patient_bookings.insert_one(booking_doc)
    
    # Create notification for patient
    await create_notification(
        user["id"],
        "booking_confirmation",
        "Rezervacija primljena",
        "Booking Received",
        f"Vaša rezervacija transporta za {booking.preferred_date} je primljena i čeka potvrdu.",
        f"Your transport booking for {booking.preferred_date} has been received and is pending confirmation.",
        booking_id
    )
    
    # Send confirmation email
    subject, body = get_booking_confirmation_template(
        booking.patient_name,
        f"{booking.preferred_date} {booking.preferred_time}",
        booking.pickup_address,
        booking.destination_address,
        booking_id,
        "transport",
        booking.language
    )
    await send_email(booking.contact_email, subject, body)
    
    # Send notification to transport team
    internal_body = get_internal_notification_template("new_booking", {
        "patient_name": booking.patient_name,
        "start_point": booking.pickup_address,
        "end_point": booking.destination_address,
        "booking_date": f"{booking.preferred_date} {booking.preferred_time}",
        "contact_phone": booking.contact_phone,
        "contact_email": booking.contact_email,
        "notes": f"Razlog: {booking.transport_reason}. Mobilnost: {booking.mobility_status}",
        "booking_id": booking_id
    })
    await send_email(TRANSPORT_EMAIL, f"Nova Rezervacija - {booking.patient_name}", internal_body)
    
    return PatientBookingResponse(**{k: v for k, v in booking_doc.items() if k != "_id"})

@api_router.get("/patient/bookings")
async def get_patient_bookings(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 50
):
    """Get patient's bookings"""
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    
    bookings = await db.patient_bookings.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return bookings

@api_router.get("/patient/bookings/{booking_id}")
async def get_patient_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Get a specific patient booking"""
    booking = await db.patient_bookings.find_one(
        {"id": booking_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.post("/patient/bookings/{booking_id}/cancel")
async def cancel_patient_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Cancel a patient booking (only if not yet dispatched)"""
    booking = await db.patient_bookings.find_one({"id": booking_id, "user_id": user["id"]})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Can only cancel if status is requested or confirmed
    if booking["status"] not in [BookingStatus.REQUESTED, BookingStatus.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Cannot cancel booking that is already in progress")
    
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": BookingStatus.CANCELLED, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create notification
    await create_notification(
        user["id"],
        "status_update",
        "Rezervacija otkazana",
        "Booking Cancelled",
        "Vaša rezervacija je uspešno otkazana.",
        "Your booking has been successfully cancelled.",
        booking_id
    )
    
    return {"success": True, "message": "Booking cancelled"}

@api_router.get("/patient/invoices")
async def get_patient_invoices(user: dict = Depends(get_current_user)):
    """Get patient's invoices"""
    invoices = await db.invoices.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return invoices

@api_router.get("/patient/invoices/{invoice_id}")
async def get_patient_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one(
        {"id": invoice_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@api_router.get("/patient/profile")
async def get_patient_profile(user: dict = Depends(get_current_user)):
    """Get patient profile"""
    profile = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return profile

@api_router.put("/patient/profile")
async def update_patient_profile(profile_data: PatientProfileUpdate, user: dict = Depends(get_current_user)):
    """Update patient profile"""
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    
    if profile_data.saved_addresses is not None:
        update_data["saved_addresses"] = [addr.model_dump() for addr in profile_data.saved_addresses]
    
    if profile_data.emergency_contact is not None:
        update_data["emergency_contact"] = profile_data.emergency_contact.model_dump()
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": update_data}
    )
    
    profile = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return profile

@api_router.get("/patient/notifications")
async def get_patient_notifications(user: dict = Depends(get_current_user), limit: int = 50):
    """Get patient's notifications"""
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return notifications

@api_router.post("/patient/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"success": True}

@api_router.post("/patient/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"success": True}

# Helper function to create notifications
async def create_notification(user_id: str, notification_type: str, title_sr: str, title_en: str, message_sr: str, message_en: str, booking_id: str = None):
    """Create a notification for a user"""
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title_sr": title_sr,
        "title_en": title_en,
        "message_sr": message_sr,
        "message_en": message_en,
        "notification_type": notification_type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "booking_id": booking_id
    }
    await db.notifications.insert_one(notification)
    return notification

# Admin endpoint to get all patient bookings
@api_router.get("/admin/patient-bookings")
async def get_all_patient_bookings(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER])),
    status: Optional[str] = None,
    limit: int = 100
):
    """Get all patient bookings for admin"""
    query = {}
    if status:
        query["status"] = status
    
    bookings = await db.patient_bookings.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return bookings

# Admin endpoint to get new bookings count (for polling)
@api_router.get("/admin/patient-bookings/new-count")
async def get_new_bookings_count(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER])),
    since: Optional[str] = None
):
    """Get count of new bookings since a given timestamp"""
    query = {"status": BookingStatus.REQUESTED}
    if since:
        query["created_at"] = {"$gt": since}
    
    count = await db.patient_bookings.count_documents(query)
    
    # Also get the latest booking for popup
    latest = await db.patient_bookings.find_one(
        {"status": BookingStatus.REQUESTED},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    return {
        "new_count": count,
        "latest_booking": latest
    }

# Admin endpoint to update booking status (triggers patient notification)
@api_router.put("/admin/patient-bookings/{booking_id}/status")
async def update_patient_booking_status(
    booking_id: str,
    status: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER]))
):
    """Update patient booking status (admin/driver)"""
    booking = await db.patient_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    valid_statuses = [BookingStatus.REQUESTED, BookingStatus.CONFIRMED, BookingStatus.EN_ROUTE, 
                      BookingStatus.PICKED_UP, BookingStatus.COMPLETED, BookingStatus.CANCELLED]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create notification for patient
    status_messages = {
        BookingStatus.CONFIRMED: ("Rezervacija potvrđena", "Booking Confirmed", 
                                   "Vaša rezervacija je potvrđena. Vozilo će doći u zakazano vreme.",
                                   "Your booking has been confirmed. The vehicle will arrive at the scheduled time."),
        BookingStatus.EN_ROUTE: ("Vozilo je na putu", "Vehicle En Route",
                                  "Sanitetsko vozilo je krenulo ka vašoj lokaciji.",
                                  "The ambulance is on its way to your location."),
        BookingStatus.PICKED_UP: ("Pacijent preuzet", "Patient Picked Up",
                                   "Transport je u toku.",
                                   "Transport is in progress."),
        BookingStatus.COMPLETED: ("Transport završen", "Transport Completed",
                                   "Vaš transport je uspešno završen. Hvala vam.",
                                   "Your transport has been successfully completed. Thank you.")
    }
    
    if status in status_messages:
        msg = status_messages[status]
        await create_notification(booking["user_id"], "status_update", msg[0], msg[1], msg[2], msg[3], booking_id)
    
    return {"success": True, "status": status}

# Admin endpoint to create invoice for completed booking
@api_router.post("/admin/invoices")
async def create_invoice(
    booking_id: str,
    amount: float,
    service_description: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create invoice for a completed booking"""
    booking = await db.patient_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Generate invoice number
    invoice_count = await db.invoices.count_documents({})
    invoice_number = f"PC018-{datetime.now().year}-{str(invoice_count + 1).zfill(5)}"
    
    tax = round(amount * 0.20, 2)  # 20% VAT
    total = round(amount + tax, 2)
    
    invoice = {
        "id": str(uuid.uuid4()),
        "invoice_number": invoice_number,
        "booking_id": booking_id,
        "user_id": booking["user_id"],
        "patient_name": booking["patient_name"],
        "patient_email": booking["contact_email"],
        "service_type": "medical_transport",
        "service_date": booking["preferred_date"],
        "service_description": service_description,
        "pickup_address": booking["pickup_address"],
        "destination_address": booking["destination_address"],
        "amount": amount,
        "tax": tax,
        "total": total,
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    
    await db.invoices.insert_one(invoice)
    
    # Update booking with invoice ID
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {"invoice_id": invoice["id"]}}
    )
    
    # Notify patient
    await create_notification(
        booking["user_id"],
        "admin_message",
        "Nova faktura",
        "New Invoice",
        f"Faktura {invoice_number} za vaš transport je kreirana.",
        f"Invoice {invoice_number} for your transport has been created.",
        booking_id
    )
    
    return {k: v for k, v in invoice.items() if k != "_id"}

# Admin endpoint to get all invoices
@api_router.get("/admin/invoices")
async def get_all_invoices(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN])),
    status: Optional[str] = None,
    limit: int = 100
):
    """Get all invoices for admin"""
    query = {}
    if status:
        query["payment_status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return invoices

# Admin endpoint to update invoice status
@api_router.put("/admin/invoices/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: str,
    payment_status: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Update invoice payment status"""
    if payment_status not in ["pending", "paid", "cancelled", "overdue"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "payment_status": payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "paid_at": datetime.now(timezone.utc).isoformat() if payment_status == "paid" else None
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"success": True, "status": payment_status}

# PDF Generation function
def generate_invoice_pdf(invoice: dict) -> io.BytesIO:
    """Generate PDF for an invoice"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#0f172a'), alignment=TA_CENTER)
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748b'))
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#334155'))
    bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#0f172a'), fontName='Helvetica-Bold')
    
    elements = []
    
    # Header with company info
    company_info = """
    <b>PARAMEDIC CARE 018</b><br/>
    Žarka Zrenjanina 50A, 18103 Niš, Serbia<br/>
    PIB: 115243796 | MB: 68211557<br/>
    Tel: +381 18 123 456 | Email: info@paramedic-care018.rs
    """
    elements.append(Paragraph(company_info, header_style))
    elements.append(Spacer(1, 10*mm))
    
    # Invoice title
    elements.append(Paragraph(f"FAKTURA / INVOICE", title_style))
    elements.append(Spacer(1, 5*mm))
    
    # Invoice number and dates
    invoice_date = invoice.get('created_at', '')[:10] if invoice.get('created_at') else ''
    due_date = invoice.get('due_date', '')[:10] if invoice.get('due_date') else ''
    
    invoice_info = f"""
    <b>Broj fakture / Invoice No:</b> {invoice.get('invoice_number', 'N/A')}<br/>
    <b>Datum izdavanja / Issue Date:</b> {invoice_date}<br/>
    <b>Datum dospeća / Due Date:</b> {due_date}<br/>
    <b>Status:</b> {invoice.get('payment_status', 'pending').upper()}
    """
    elements.append(Paragraph(invoice_info, normal_style))
    elements.append(Spacer(1, 10*mm))
    
    # Customer info
    customer_info = f"""
    <b>Kupac / Customer:</b><br/>
    {invoice.get('patient_name', 'N/A')}<br/>
    {invoice.get('patient_email', 'N/A')}
    """
    elements.append(Paragraph(customer_info, normal_style))
    elements.append(Spacer(1, 10*mm))
    
    # Service details table
    service_data = [
        ['Opis usluge / Service Description', 'Datum / Date', 'Iznos / Amount'],
        [
            invoice.get('service_description', 'Medical Transport'),
            invoice.get('service_date', 'N/A'),
            f"{invoice.get('amount', 0):.2f} RSD"
        ]
    ]
    
    # Route info
    route_info = f"Od / From: {invoice.get('pickup_address', 'N/A')}\nDo / To: {invoice.get('destination_address', 'N/A')}"
    
    service_table = Table(service_data, colWidths=[90*mm, 40*mm, 40*mm])
    service_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0ea5e9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(service_table)
    elements.append(Spacer(1, 3*mm))
    
    # Route details
    elements.append(Paragraph(f"<i>{route_info}</i>", ParagraphStyle('Route', parent=normal_style, fontSize=8, textColor=colors.HexColor('#64748b'))))
    elements.append(Spacer(1, 10*mm))
    
    # Totals table
    totals_data = [
        ['', 'Osnovica / Subtotal:', f"{invoice.get('amount', 0):.2f} RSD"],
        ['', 'PDV / VAT (20%):', f"{invoice.get('tax', 0):.2f} RSD"],
        ['', 'UKUPNO / TOTAL:', f"{invoice.get('total', 0):.2f} RSD"],
    ]
    
    totals_table = Table(totals_data, colWidths=[90*mm, 40*mm, 40*mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LINEABOVE', (1, -1), (-1, -1), 1, colors.HexColor('#0f172a')),
        ('BACKGROUND', (1, -1), (-1, -1), colors.HexColor('#f0f9ff')),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 15*mm))
    
    # Payment info
    payment_info = """
    <b>Instrukcije za plaćanje / Payment Instructions:</b><br/>
    Banka / Bank: Erste Bank a.d. Novi Sad<br/>
    Račun / Account: 340-11012345-67<br/>
    Poziv na broj / Reference: {}<br/><br/>
    <i>Hvala vam na poverenju! / Thank you for your trust!</i>
    """.format(invoice.get('invoice_number', ''))
    elements.append(Paragraph(payment_info, normal_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer

# Endpoint to download invoice PDF
@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, user: dict = Depends(get_current_user)):
    """Download invoice as PDF"""
    # Check if user owns the invoice or is admin
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice["user_id"] != user["id"] and user["role"] not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate PDF
    pdf_buffer = generate_invoice_pdf(invoice)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Invoice_{invoice['invoice_number']}.pdf"
        }
    )

# Admin endpoint to get completed bookings without invoices
@api_router.get("/admin/bookings-for-invoice")
async def get_bookings_for_invoice(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get completed bookings that don't have invoices yet"""
    bookings = await db.patient_bookings.find(
        {"status": "completed", "invoice_id": {"$in": [None, ""]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return bookings

# ============ STAFF AVAILABILITY ROUTES ============

@api_router.get("/staff/availability")
async def get_my_availability(
    start_date: str = None,
    end_date: str = None,
    user: dict = Depends(get_current_user)
):
    """Get current user's availability schedule"""
    query = {"user_id": user["id"]}
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    slots = await db.staff_availability.find(query, {"_id": 0}).sort("date", 1).to_list(100)
    return slots

@api_router.post("/staff/availability")
async def create_availability(
    availability: AvailabilityCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new availability slot"""
    # Validate user is staff (not regular/patient)
    if user["role"] == "regular":
        raise HTTPException(status_code=403, detail="Patients cannot create availability")
    
    slots_to_create = []
    base_slot = {
        "user_id": user["id"],
        "user_name": user.get("full_name", "Unknown"),
        "user_role": user["role"],
        "start_time": availability.start_time,
        "end_time": availability.end_time,
        "status": availability.status,
        "notes": availability.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Create the main slot
    main_slot = {
        "id": str(uuid.uuid4()),
        "date": availability.date,
        **base_slot
    }
    slots_to_create.append(main_slot)
    
    # If repeat_weekly, create slots for next 4 weeks
    if availability.repeat_weekly:
        from datetime import timedelta
        base_date = datetime.strptime(availability.date, "%Y-%m-%d")
        for week in range(1, 5):
            next_date = base_date + timedelta(weeks=week)
            repeat_slot = {
                "id": str(uuid.uuid4()),
                "date": next_date.strftime("%Y-%m-%d"),
                **base_slot
            }
            slots_to_create.append(repeat_slot)
    
    # Insert without returning _id
    await db.staff_availability.insert_many([{**slot} for slot in slots_to_create])
    
    return {"success": True, "slots_created": len(slots_to_create)}

@api_router.put("/staff/availability/{slot_id}")
async def update_availability(
    slot_id: str,
    update: AvailabilityUpdate,
    user: dict = Depends(get_current_user)
):
    """Update an availability slot"""
    # Verify ownership
    slot = await db.staff_availability.find_one({"id": slot_id, "user_id": user["id"]})
    if not slot:
        raise HTTPException(status_code=404, detail="Availability slot not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.staff_availability.update_one(
        {"id": slot_id},
        {"$set": update_data}
    )
    return {"success": True, "message": "Availability updated"}

@api_router.delete("/staff/availability/{slot_id}")
async def delete_availability(
    slot_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete an availability slot"""
    result = await db.staff_availability.delete_one({"id": slot_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Availability slot not found")
    return {"success": True, "message": "Availability deleted"}

# Admin endpoint to create availability on behalf of staff
class AdminAvailabilityCreate(BaseModel):
    user_id: str
    date: str
    start_time: str
    end_time: str
    status: str = "available"
    notes: str = None
    repeat_weekly: bool = False

@api_router.post("/admin/staff-availability/create")
async def admin_create_availability(
    availability: AdminAvailabilityCreate,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Admin can create availability for any staff member"""
    # Get the target user info
    target_user = await db.users.find_one({"id": availability.user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user["role"] == "regular":
        raise HTTPException(status_code=400, detail="Cannot create availability for patients")
    
    slots_to_create = []
    base_slot = {
        "user_id": availability.user_id,
        "user_name": target_user.get("full_name", "Unknown"),
        "user_role": target_user["role"],
        "start_time": availability.start_time,
        "end_time": availability.end_time,
        "status": availability.status,
        "notes": availability.notes,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Create the main slot
    main_slot = {
        "id": str(uuid.uuid4()),
        "date": availability.date,
        **base_slot
    }
    slots_to_create.append(main_slot)
    
    # If repeat_weekly, create slots for next 4 weeks
    if availability.repeat_weekly:
        from datetime import timedelta
        base_date = datetime.strptime(availability.date, "%Y-%m-%d")
        for week in range(1, 5):
            next_date = base_date + timedelta(weeks=week)
            repeat_slot = {
                "id": str(uuid.uuid4()),
                "date": next_date.strftime("%Y-%m-%d"),
                **base_slot
            }
            slots_to_create.append(repeat_slot)
    
    await db.staff_availability.insert_many([{**slot} for slot in slots_to_create])
    
    return {"success": True, "slots_created": len(slots_to_create), "for_user": target_user.get("full_name")}

# Admin endpoints for viewing all staff availability
@api_router.get("/admin/staff-availability")
async def get_all_staff_availability(
    start_date: str = None,
    end_date: str = None,
    role: str = None,
    user_id: str = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get all staff availability (admin only)"""
    query = {}
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    if role:
        query["user_role"] = role
    if user_id:
        query["user_id"] = user_id
    
    slots = await db.staff_availability.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return slots

@api_router.get("/admin/staff-availability/date/{date}")
async def get_staff_availability_by_date(
    date: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get all staff availability for a specific date"""
    slots = await db.staff_availability.find({"date": date}, {"_id": 0}).to_list(100)
    
    # Group by user
    by_user = {}
    for slot in slots:
        uid = slot["user_id"]
        if uid not in by_user:
            by_user[uid] = {
                "user_id": uid,
                "user_name": slot["user_name"],
                "user_role": slot["user_role"],
                "slots": []
            }
        by_user[uid]["slots"].append(slot)
    
    return {"date": date, "staff": list(by_user.values())}

@api_router.get("/admin/staff-list")
async def get_staff_list(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get list of all staff members (non-patients)"""
    staff = await db.users.find(
        {"role": {"$ne": "regular"}, "is_active": True},
        {"_id": 0, "password": 0, "verification_token": 0}
    ).to_list(100)
    return staff

# ============ MEDICAL PATIENT PROFILE ROUTES ============

def calculate_age(birth_date_str: str) -> int:
    """Calculate age from date of birth string (YYYY-MM-DD)"""
    try:
        birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except:
        return None

def calculate_bmi(height_cm: int, weight_kg: float) -> float:
    """Calculate BMI from height (cm) and weight (kg)"""
    if height_cm and weight_kg and height_cm > 0:
        height_m = height_cm / 100
        return round(weight_kg / (height_m * height_m), 1)
    return None

async def generate_patient_id() -> str:
    """Generate unique patient ID like PC018-P-00001"""
    count = await db.medical_patients.count_documents({})
    return f"PC018-P-{str(count + 1).zfill(5)}"

@api_router.post("/medical/patients")
async def create_medical_patient(
    patient: PatientMedicalProfileCreate,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create a new medical patient profile"""
    patient_id = await generate_patient_id()
    
    patient_data = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        **patient.model_dump(),
        "age": calculate_age(patient.date_of_birth) if patient.date_of_birth else None,
        "bmi": calculate_bmi(patient.height_cm, patient.weight_kg),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "created_by_name": user.get("full_name", "Unknown")
    }
    
    await db.medical_patients.insert_one(patient_data)
    
    # Return without _id
    patient_data.pop("_id", None)
    return patient_data

@api_router.get("/medical/patients")
async def list_medical_patients(
    search: str = None,
    blood_type: str = None,
    has_allergies: bool = None,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """List all medical patients with search and filters"""
    query = {}
    
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"patient_id": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    if blood_type:
        query["blood_type"] = blood_type
    
    if has_allergies is True:
        query["allergies.0"] = {"$exists": True}
    
    total = await db.medical_patients.count_documents(query)
    patients = await db.medical_patients.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    return {"total": total, "patients": patients}

@api_router.get("/medical/patients/{patient_id}")
async def get_medical_patient(
    patient_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get a medical patient profile by ID"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]},
        {"_id": 0}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@api_router.put("/medical/patients/{patient_id}")
async def update_medical_patient(
    patient_id: str,
    update: PatientMedicalProfileUpdate,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Update a medical patient profile"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Recalculate age if DOB changed
    if "date_of_birth" in update_data:
        update_data["age"] = calculate_age(update_data["date_of_birth"])
    
    # Recalculate BMI if height or weight changed
    height = update_data.get("height_cm", patient.get("height_cm"))
    weight = update_data.get("weight_kg", patient.get("weight_kg"))
    if height and weight:
        update_data["bmi"] = calculate_bmi(height, weight)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["id"]
    update_data["updated_by_name"] = user.get("full_name", "Unknown")
    
    await db.medical_patients.update_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Patient updated"}

@api_router.delete("/medical/patients/{patient_id}")
async def delete_medical_patient(
    patient_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Delete a medical patient profile (Admin only)"""
    result = await db.medical_patients.delete_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"success": True, "message": "Patient deleted"}

@api_router.post("/medical/patients/{patient_id}/photo")
async def upload_patient_photo(
    patient_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Upload patient photo"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WEBP images are allowed")
    
    # Save file
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"patient_{patient_id}_{uuid.uuid4()}.{file_ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    photo_url = f"/api/uploads/{filename}"
    
    await db.medical_patients.update_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]},
        {"$set": {"photo_url": photo_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "photo_url": photo_url}

# ============ VITAL SIGNS ROUTES ============

def check_vital_flags(vitals: dict) -> List[str]:
    """Check vitals against normal ranges and return flags"""
    flags = []
    
    # Blood Pressure
    if vitals.get("systolic_bp"):
        if vitals["systolic_bp"] > 140:
            flags.append("HIGH_BP")
        elif vitals["systolic_bp"] < 90:
            flags.append("LOW_BP")
    
    # Heart Rate
    if vitals.get("heart_rate"):
        if vitals["heart_rate"] > 100:
            flags.append("TACHYCARDIA")
        elif vitals["heart_rate"] < 60:
            flags.append("BRADYCARDIA")
    
    # Oxygen Saturation
    if vitals.get("oxygen_saturation"):
        if vitals["oxygen_saturation"] < 95:
            flags.append("LOW_SPO2")
        if vitals["oxygen_saturation"] < 90:
            flags.append("CRITICAL_SPO2")
    
    # Temperature
    if vitals.get("temperature"):
        if vitals["temperature"] > 38:
            flags.append("FEVER")
        elif vitals["temperature"] < 36:
            flags.append("HYPOTHERMIA")
    
    # Respiratory Rate
    if vitals.get("respiratory_rate"):
        if vitals["respiratory_rate"] > 20:
            flags.append("TACHYPNEA")
        elif vitals["respiratory_rate"] < 12:
            flags.append("BRADYPNEA")
    
    # Blood Glucose
    if vitals.get("blood_glucose"):
        if vitals["blood_glucose"] > 180:
            flags.append("HYPERGLYCEMIA")
        elif vitals["blood_glucose"] < 70:
            flags.append("HYPOGLYCEMIA")
    
    # GCS
    if vitals.get("gcs_score"):
        if vitals["gcs_score"] <= 8:
            flags.append("SEVERE_CONSCIOUSNESS")
        elif vitals["gcs_score"] <= 12:
            flags.append("MODERATE_CONSCIOUSNESS")
    
    return flags

@api_router.post("/medical/vitals")
async def record_vital_signs(
    vitals: VitalSignsEntry,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Record vital signs for a patient"""
    # Verify patient exists
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": vitals.patient_id}, {"patient_id": vitals.patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    vitals_data = vitals.model_dump()
    vitals_data["id"] = str(uuid.uuid4())
    vitals_data["patient_id"] = patient["id"]  # Normalize to internal ID
    vitals_data["recorded_by"] = user["id"]
    vitals_data["recorded_by_name"] = user.get("full_name", "Unknown")
    vitals_data["recorded_at"] = datetime.now(timezone.utc).isoformat()
    vitals_data["flags"] = check_vital_flags(vitals_data)
    
    await db.medical_vitals.insert_one(vitals_data)
    vitals_data.pop("_id", None)
    
    return vitals_data

@api_router.get("/medical/vitals/{patient_id}")
async def get_patient_vitals(
    patient_id: str,
    start_date: str = None,
    end_date: str = None,
    measurement_type: str = None,
    limit: int = 100,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get vital signs history for a patient"""
    # Get patient internal ID
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    query = {"patient_id": patient["id"]}
    
    if start_date or end_date:
        query["recorded_at"] = {}
        if start_date:
            query["recorded_at"]["$gte"] = start_date
        if end_date:
            query["recorded_at"]["$lte"] = end_date
    
    if measurement_type:
        query["measurement_type"] = measurement_type
    
    vitals = await db.medical_vitals.find(
        query, {"_id": 0}
    ).sort("recorded_at", -1).limit(limit).to_list(limit)
    
    return {"patient_id": patient_id, "vitals": vitals}

@api_router.get("/medical/vitals/{patient_id}/latest")
async def get_latest_vitals(
    patient_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get the latest vital signs for a patient"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    vitals = await db.medical_vitals.find_one(
        {"patient_id": patient["id"]},
        {"_id": 0},
        sort=[("recorded_at", -1)]
    )
    
    return vitals or {}

# ============ MEDICAL CHECK / EXAMINATION ROUTES ============

@api_router.post("/medical/checks")
async def create_medical_check(
    check: MedicalCheckCreate,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create a medical check/examination record"""
    # Verify patient exists
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": check.patient_id}, {"patient_id": check.patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    check_data = check.model_dump()
    check_data["id"] = str(uuid.uuid4())
    check_data["patient_id"] = patient["id"]
    check_data["patient_name"] = patient.get("full_name")
    check_data["performed_by"] = user["id"]
    check_data["performed_by_name"] = user.get("full_name", "Unknown")
    check_data["performed_at"] = datetime.now(timezone.utc).isoformat()
    
    # If vitals included, also save to vitals collection
    if check.vitals:
        vitals_data = check.vitals.model_dump()
        vitals_data["id"] = str(uuid.uuid4())
        vitals_data["patient_id"] = patient["id"]
        vitals_data["recorded_by"] = user["id"]
        vitals_data["recorded_by_name"] = user.get("full_name", "Unknown")
        vitals_data["recorded_at"] = datetime.now(timezone.utc).isoformat()
        vitals_data["measurement_type"] = check.check_type
        vitals_data["flags"] = check_vital_flags(vitals_data)
        await db.medical_vitals.insert_one(vitals_data)
        check_data["vitals"]["id"] = vitals_data["id"]
    
    await db.medical_checks.insert_one(check_data)
    check_data.pop("_id", None)
    
    return check_data

@api_router.get("/medical/checks")
async def list_medical_checks(
    patient_id: str = None,
    check_type: str = None,
    start_date: str = None,
    end_date: str = None,
    limit: int = 50,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """List medical checks with filters"""
    query = {}
    
    if patient_id:
        patient = await db.medical_patients.find_one(
            {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
        )
        if patient:
            query["patient_id"] = patient["id"]
    
    if check_type:
        query["check_type"] = check_type
    
    if start_date or end_date:
        query["performed_at"] = {}
        if start_date:
            query["performed_at"]["$gte"] = start_date
        if end_date:
            query["performed_at"]["$lte"] = end_date
    
    checks = await db.medical_checks.find(
        query, {"_id": 0}
    ).sort("performed_at", -1).limit(limit).to_list(limit)
    
    return {"checks": checks}

@api_router.get("/medical/checks/{check_id}")
async def get_medical_check(
    check_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get a specific medical check"""
    check = await db.medical_checks.find_one({"id": check_id}, {"_id": 0})
    if not check:
        raise HTTPException(status_code=404, detail="Medical check not found")
    return check

@api_router.post("/medical/checks/{check_id}/sign")
async def sign_medical_check(
    check_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR]))
):
    """Sign a medical check (Doctor only)"""
    check = await db.medical_checks.find_one({"id": check_id})
    if not check:
        raise HTTPException(status_code=404, detail="Medical check not found")
    
    await db.medical_checks.update_one(
        {"id": check_id},
        {"$set": {
            "signed_by": user["id"],
            "signed_by_name": user.get("full_name", "Unknown"),
            "signed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Medical check signed"}

# ============ EMERGENCY TRANSPORT VITALS ============

class TransportVitalsEntry(BaseModel):
    booking_id: str
    patient_name: str
    # Core Vitals
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    blood_glucose: Optional[float] = None
    pain_score: Optional[int] = None
    gcs_score: Optional[int] = None
    # Transport specific
    consciousness_level: Optional[str] = None  # alert, verbal, pain, unresponsive
    oxygen_delivery: Optional[str] = None  # room_air, nasal_cannula, mask, bvm, intubated
    iv_access: Optional[bool] = None
    notes: Optional[str] = None

def check_critical_vitals(vitals: dict) -> dict:
    """Check for life-threatening vital signs"""
    alerts = []
    severity = "normal"  # normal, warning, critical, life_threatening
    
    # Blood Pressure - Life threatening
    if vitals.get("systolic_bp"):
        if vitals["systolic_bp"] < 70 or vitals["systolic_bp"] > 200:
            alerts.append({"type": "CRITICAL_BP", "message": f"Critical BP: {vitals['systolic_bp']}/{vitals.get('diastolic_bp', '?')} mmHg", "level": "life_threatening"})
            severity = "life_threatening"
        elif vitals["systolic_bp"] < 90 or vitals["systolic_bp"] > 180:
            alerts.append({"type": "SEVERE_BP", "message": f"Severe BP: {vitals['systolic_bp']}/{vitals.get('diastolic_bp', '?')} mmHg", "level": "critical"})
            if severity != "life_threatening": severity = "critical"
        elif vitals["systolic_bp"] > 140:
            alerts.append({"type": "HIGH_BP", "message": f"High BP: {vitals['systolic_bp']}/{vitals.get('diastolic_bp', '?')} mmHg", "level": "warning"})
            if severity == "normal": severity = "warning"
    
    # Heart Rate - Life threatening
    if vitals.get("heart_rate"):
        if vitals["heart_rate"] < 30 or vitals["heart_rate"] > 180:
            alerts.append({"type": "CRITICAL_HR", "message": f"Critical HR: {vitals['heart_rate']} bpm", "level": "life_threatening"})
            severity = "life_threatening"
        elif vitals["heart_rate"] < 40 or vitals["heart_rate"] > 150:
            alerts.append({"type": "SEVERE_HR", "message": f"Severe HR: {vitals['heart_rate']} bpm", "level": "critical"})
            if severity != "life_threatening": severity = "critical"
        elif vitals["heart_rate"] < 50 or vitals["heart_rate"] > 120:
            alerts.append({"type": "ABNORMAL_HR", "message": f"Abnormal HR: {vitals['heart_rate']} bpm", "level": "warning"})
            if severity == "normal": severity = "warning"
    
    # Oxygen Saturation - Life threatening
    if vitals.get("oxygen_saturation"):
        if vitals["oxygen_saturation"] < 85:
            alerts.append({"type": "CRITICAL_SPO2", "message": f"Critical SpO₂: {vitals['oxygen_saturation']}%", "level": "life_threatening"})
            severity = "life_threatening"
        elif vitals["oxygen_saturation"] < 90:
            alerts.append({"type": "SEVERE_SPO2", "message": f"Severe SpO₂: {vitals['oxygen_saturation']}%", "level": "critical"})
            if severity != "life_threatening": severity = "critical"
        elif vitals["oxygen_saturation"] < 94:
            alerts.append({"type": "LOW_SPO2", "message": f"Low SpO₂: {vitals['oxygen_saturation']}%", "level": "warning"})
            if severity == "normal": severity = "warning"
    
    # Temperature - Life threatening
    if vitals.get("temperature"):
        if vitals["temperature"] < 32 or vitals["temperature"] > 41:
            alerts.append({"type": "CRITICAL_TEMP", "message": f"Critical Temp: {vitals['temperature']}°C", "level": "life_threatening"})
            severity = "life_threatening"
        elif vitals["temperature"] < 35 or vitals["temperature"] > 40:
            alerts.append({"type": "SEVERE_TEMP", "message": f"Severe Temp: {vitals['temperature']}°C", "level": "critical"})
            if severity != "life_threatening": severity = "critical"
        elif vitals["temperature"] < 36 or vitals["temperature"] > 38.5:
            alerts.append({"type": "ABNORMAL_TEMP", "message": f"Abnormal Temp: {vitals['temperature']}°C", "level": "warning"})
            if severity == "normal": severity = "warning"
    
    # Respiratory Rate
    if vitals.get("respiratory_rate"):
        if vitals["respiratory_rate"] < 6 or vitals["respiratory_rate"] > 40:
            alerts.append({"type": "CRITICAL_RR", "message": f"Critical RR: {vitals['respiratory_rate']}/min", "level": "life_threatening"})
            severity = "life_threatening"
        elif vitals["respiratory_rate"] < 8 or vitals["respiratory_rate"] > 30:
            alerts.append({"type": "SEVERE_RR", "message": f"Severe RR: {vitals['respiratory_rate']}/min", "level": "critical"})
            if severity != "life_threatening": severity = "critical"
    
    # GCS - Life threatening
    if vitals.get("gcs_score"):
        if vitals["gcs_score"] <= 8:
            alerts.append({"type": "CRITICAL_GCS", "message": f"Critical GCS: {vitals['gcs_score']} - Severe brain injury", "level": "life_threatening"})
            severity = "life_threatening"
        elif vitals["gcs_score"] <= 12:
            alerts.append({"type": "LOW_GCS", "message": f"Low GCS: {vitals['gcs_score']} - Moderate brain injury", "level": "critical"})
            if severity != "life_threatening": severity = "critical"
    
    # Blood Glucose
    if vitals.get("blood_glucose"):
        if vitals["blood_glucose"] < 40 or vitals["blood_glucose"] > 500:
            alerts.append({"type": "CRITICAL_GLUCOSE", "message": f"Critical Glucose: {vitals['blood_glucose']} mg/dL", "level": "life_threatening"})
            severity = "life_threatening"
        elif vitals["blood_glucose"] < 54 or vitals["blood_glucose"] > 400:
            alerts.append({"type": "SEVERE_GLUCOSE", "message": f"Severe Glucose: {vitals['blood_glucose']} mg/dL", "level": "critical"})
            if severity != "life_threatening": severity = "critical"
    
    return {"alerts": alerts, "severity": severity, "is_critical": severity in ["critical", "life_threatening"]}

@api_router.post("/transport/vitals")
async def record_transport_vitals(
    vitals: TransportVitalsEntry,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Record vitals during emergency transport - alerts admin if life-threatening"""
    # Check for critical values
    critical_check = check_critical_vitals(vitals.model_dump())
    
    vitals_data = vitals.model_dump()
    vitals_data["id"] = str(uuid.uuid4())
    vitals_data["recorded_by"] = user["id"]
    vitals_data["recorded_by_name"] = user.get("full_name", "Unknown")
    vitals_data["recorded_at"] = datetime.now(timezone.utc).isoformat()
    vitals_data["alerts"] = critical_check["alerts"]
    vitals_data["severity"] = critical_check["severity"]
    vitals_data["is_critical"] = critical_check["is_critical"]
    
    await db.transport_vitals.insert_one(vitals_data)
    vitals_data.pop("_id", None)
    
    # If critical, create an alert for admin dashboard
    if critical_check["is_critical"]:
        alert_data = {
            "id": str(uuid.uuid4()),
            "type": "transport_critical_vitals",
            "booking_id": vitals.booking_id,
            "patient_name": vitals.patient_name,
            "severity": critical_check["severity"],
            "alerts": critical_check["alerts"],
            "vitals_id": vitals_data["id"],
            "recorded_by": user.get("full_name", "Unknown"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_read": False,
            "is_acknowledged": False
        }
        await db.critical_alerts.insert_one(alert_data)
    
    return vitals_data

@api_router.get("/transport/vitals/{booking_id}")
async def get_transport_vitals(
    booking_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get all vitals recorded during a transport"""
    vitals = await db.transport_vitals.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("recorded_at", -1).to_list(100)
    return {"booking_id": booking_id, "vitals": vitals}

@api_router.get("/admin/critical-alerts")
async def get_critical_alerts(
    unread_only: bool = False,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DOCTOR]))
):
    """Get critical alerts for admin dashboard"""
    query = {}
    if unread_only:
        query["is_acknowledged"] = False
    
    alerts = await db.critical_alerts.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    unread_count = await db.critical_alerts.count_documents({"is_acknowledged": False})
    
    return {"alerts": alerts, "unread_count": unread_count}

@api_router.put("/admin/critical-alerts/{alert_id}/acknowledge")
async def acknowledge_critical_alert(
    alert_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DOCTOR]))
):
    """Acknowledge a critical alert"""
    await db.critical_alerts.update_one(
        {"id": alert_id},
        {"$set": {
            "is_acknowledged": True,
            "acknowledged_by": user["id"],
            "acknowledged_by_name": user.get("full_name", "Unknown"),
            "acknowledged_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True}

# ============ DOCTOR/NURSE DASHBOARD ROUTES ============

@api_router.get("/medical/dashboard")
async def get_medical_dashboard(
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get medical dashboard data"""
    # Get counts
    total_patients = await db.medical_patients.count_documents({})
    
    # Get recent patients (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_patients = await db.medical_patients.count_documents({"created_at": {"$gte": week_ago}})
    
    # Get patients with critical vitals (last 24 hours)
    day_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    critical_vitals = await db.medical_vitals.find(
        {
            "recorded_at": {"$gte": day_ago},
            "flags": {"$in": ["CRITICAL_SPO2", "SEVERE_CONSCIOUSNESS", "LOW_BP"]}
        },
        {"_id": 0}
    ).to_list(20)
    
    # Get active transports (bookings with status in_progress)
    active_transports = await db.bookings.find(
        {"status": {"$in": ["confirmed", "en_route", "picked_up"]}},
        {"_id": 0}
    ).to_list(20)
    
    patient_bookings = await db.patient_bookings.find(
        {"status": {"$in": ["confirmed", "en_route", "picked_up"]}},
        {"_id": 0}
    ).to_list(20)
    
    # Get recent medical checks
    recent_checks = await db.medical_checks.find(
        {}, {"_id": 0}
    ).sort("performed_at", -1).limit(10).to_list(10)
    
    # Get today's checks count
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_checks = await db.medical_checks.count_documents({"performed_at": {"$gte": today_start}})
    
    return {
        "stats": {
            "total_patients": total_patients,
            "recent_patients": recent_patients,
            "critical_alerts": len(critical_vitals),
            "active_transports": len(active_transports) + len(patient_bookings),
            "today_checks": today_checks
        },
        "critical_vitals": critical_vitals,
        "active_transports": active_transports + patient_bookings,
        "recent_checks": recent_checks
    }

@api_router.get("/medical/alerts")
async def get_medical_alerts(
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get medical alerts - critical vitals and urgent cases"""
    day_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    # Get all critical vitals from last 24 hours
    critical_vitals = await db.medical_vitals.find(
        {
            "recorded_at": {"$gte": day_ago},
            "flags.0": {"$exists": True}  # Has at least one flag
        },
        {"_id": 0}
    ).sort("recorded_at", -1).to_list(50)
    
    # Enrich with patient info
    for vital in critical_vitals:
        patient = await db.medical_patients.find_one(
            {"id": vital["patient_id"]},
            {"_id": 0, "full_name": 1, "patient_id": 1, "blood_type": 1, "allergies": 1}
        )
        if patient:
            vital["patient"] = patient
    
    return {"alerts": critical_vitals}

# ============ DRIVER APP ROUTES ============

@api_router.get("/driver/profile")
async def get_driver_profile(user: dict = Depends(require_roles([UserRole.DRIVER]))):
    """Get driver profile with current status"""
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]}, {"_id": 0})
    if not driver_status:
        # Create default status
        driver_status = {
            "driver_id": user["id"],
            "status": DriverStatus.OFFLINE,
            "vehicle_id": None,
            "current_booking_id": None,
            "last_location": None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        await db.driver_status.insert_one(driver_status)
    
    return {
        "driver": {k: v for k, v in user.items() if k != "password"},
        "status": driver_status
    }

@api_router.put("/driver/status")
async def update_driver_status(
    status_update: DriverStatusUpdate,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Update driver status"""
    valid_statuses = [DriverStatus.OFFLINE, DriverStatus.AVAILABLE, DriverStatus.ASSIGNED, 
                      DriverStatus.EN_ROUTE, DriverStatus.ON_SITE, DriverStatus.TRANSPORTING]
    
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {
        "status": status_update.status,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    if status_update.booking_id:
        update_data["current_booking_id"] = status_update.booking_id
    
    # If completing, clear current booking
    if status_update.status == DriverStatus.AVAILABLE:
        update_data["current_booking_id"] = None
    
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": update_data},
        upsert=True
    )
    
    # Also update booking status if applicable
    if status_update.booking_id and status_update.status in [DriverStatus.EN_ROUTE, DriverStatus.ON_SITE, DriverStatus.TRANSPORTING]:
        booking_status_map = {
            DriverStatus.EN_ROUTE: BookingStatus.EN_ROUTE,
            DriverStatus.ON_SITE: BookingStatus.EN_ROUTE,  # Still en route until picked up
            DriverStatus.TRANSPORTING: BookingStatus.PICKED_UP
        }
        if status_update.status in booking_status_map:
            await db.patient_bookings.update_one(
                {"id": status_update.booking_id},
                {"$set": {"status": booking_status_map[status_update.status], "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Create notification for patient
            booking = await db.patient_bookings.find_one({"id": status_update.booking_id})
            if booking:
                notification_messages = {
                    DriverStatus.EN_ROUTE: {"sr": "Vozač je krenuo ka vama", "en": "Driver is on the way"},
                    DriverStatus.ON_SITE: {"sr": "Vozač je stigao na lokaciju preuzimanja", "en": "Driver arrived at pickup location"},
                    DriverStatus.TRANSPORTING: {"sr": "Transport je započet", "en": "Transport has started"}
                }
                msg = notification_messages.get(status_update.status, {})
                await db.notifications.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": booking["user_id"],
                    "type": "booking_update",
                    "message_sr": msg.get("sr", "Status ažuriran"),
                    "message_en": msg.get("en", "Status updated"),
                    "booking_id": status_update.booking_id,
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
    
    # Broadcast to admins
    await ws_manager.broadcast_to_admins({
        "type": "driver_status_update",
        "driver_id": user["id"],
        "driver_name": user.get("full_name"),
        "status": status_update.status,
        "booking_id": status_update.booking_id
    })
    
    return {"success": True, "status": status_update.status}

@api_router.post("/driver/location")
async def update_driver_location(
    location: DriverLocationUpdate,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Update driver's current location"""
    location_data = {
        "latitude": location.latitude,
        "longitude": location.longitude,
        "speed": location.speed,
        "heading": location.heading,
        "accuracy": location.accuracy,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Update driver status with location
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "last_location": location_data,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Store location history (for tracking during active transport)
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    if driver_status and driver_status.get("current_booking_id"):
        await db.location_history.insert_one({
            "driver_id": user["id"],
            "booking_id": driver_status["current_booking_id"],
            **location_data
        })
    
    # Broadcast to admins for live map
    await ws_manager.broadcast_to_admins({
        "type": "location_update",
        "driver_id": user["id"],
        "driver_name": user.get("full_name"),
        "location": location_data,
        "status": driver_status.get("status") if driver_status else DriverStatus.AVAILABLE,
        "booking_id": driver_status.get("current_booking_id") if driver_status else None
    })
    
    return {"success": True}

@api_router.get("/driver/assignment")
async def get_driver_assignment(user: dict = Depends(require_roles([UserRole.DRIVER]))):
    """Get driver's current assignment"""
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    
    if not driver_status or not driver_status.get("current_booking_id"):
        # Check for any assigned bookings
        assigned_booking = await db.patient_bookings.find_one({
            "assigned_driver_id": user["id"],
            "status": {"$in": [BookingStatus.CONFIRMED, BookingStatus.EN_ROUTE, BookingStatus.PICKED_UP]}
        }, {"_id": 0})
        
        if assigned_booking:
            return {"assignment": assigned_booking, "has_assignment": True}
        return {"assignment": None, "has_assignment": False}
    
    booking = await db.patient_bookings.find_one(
        {"id": driver_status["current_booking_id"]},
        {"_id": 0}
    )
    
    return {"assignment": booking, "has_assignment": booking is not None}

# Driver accepts assignment
@api_router.post("/driver/accept-assignment/{booking_id}")
async def accept_assignment(
    booking_id: str,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Driver accepts an assignment"""
    # Verify this assignment belongs to this driver
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    if not driver_status or driver_status.get("current_booking_id") != booking_id:
        raise HTTPException(status_code=400, detail="No matching assignment found")
    
    # Update driver status to indicate acceptance
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "status": DriverStatus.EN_ROUTE,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update booking status
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "en_route",
            "driver_accepted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Also check public bookings
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "in_progress",
            "driver_accepted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get booking info for notification
    booking = await db.patient_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Notify patient
    if booking and booking.get("user_id"):
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": booking["user_id"],
            "type": "driver_accepted",
            "message_sr": f"Vozač {user.get('full_name')} je prihvatio vaš zahtev i kreće ka vama.",
            "message_en": f"Driver {user.get('full_name')} accepted your request and is on the way.",
            "booking_id": booking_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Broadcast to admins
    await ws_manager.broadcast_to_admins({
        "type": "driver_accepted",
        "driver_id": user["id"],
        "driver_name": user.get("full_name"),
        "booking_id": booking_id
    })
    
    return {"success": True, "message": "Assignment accepted", "new_status": "en_route"}

# Driver rejects assignment
@api_router.post("/driver/reject-assignment/{booking_id}")
async def reject_assignment(
    booking_id: str,
    reason: str = None,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Driver rejects an assignment"""
    # Verify this assignment belongs to this driver
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    if not driver_status or driver_status.get("current_booking_id") != booking_id:
        raise HTTPException(status_code=400, detail="No matching assignment found")
    
    # Update driver status back to available
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "status": DriverStatus.AVAILABLE,
            "current_booking_id": None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update booking - remove driver assignment
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "requested",
            "assigned_driver_id": None,
            "assigned_driver_name": None,
            "driver_rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Also check public bookings
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "pending",
            "assigned_driver": None,
            "assigned_driver_name": None,
            "driver_rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Broadcast to admins so they can reassign
    await ws_manager.broadcast_to_admins({
        "type": "driver_rejected",
        "driver_id": user["id"],
        "driver_name": user.get("full_name"),
        "booking_id": booking_id,
        "reason": reason
    })
    
    return {"success": True, "message": "Assignment rejected"}

@api_router.post("/driver/complete-transport/{booking_id}")
async def complete_transport(
    booking_id: str,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Mark transport as completed"""
    # Update booking status
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": BookingStatus.COMPLETED,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update driver status
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "status": DriverStatus.AVAILABLE,
            "current_booking_id": None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notification for patient
    booking = await db.patient_bookings.find_one({"id": booking_id})
    if booking:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": booking["user_id"],
            "type": "booking_completed",
            "message_sr": "Transport je uspešno završen. Hvala vam!",
            "message_en": "Transport completed successfully. Thank you!",
            "booking_id": booking_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Broadcast to admins
    await ws_manager.broadcast_to_admins({
        "type": "transport_completed",
        "driver_id": user["id"],
        "driver_name": user.get("full_name"),
        "booking_id": booking_id
    })
    
    return {"success": True, "message": "Transport completed"}

# Admin endpoint to assign driver to booking
@api_router.post("/admin/assign-driver")
async def assign_driver_to_booking(
    booking_id: str,
    driver_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Assign a driver to a booking"""
    # Verify driver exists and is available
    driver = await db.users.find_one({"id": driver_id, "role": UserRole.DRIVER})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver_status = await db.driver_status.find_one({"driver_id": driver_id})
    if driver_status and driver_status.get("status") not in [DriverStatus.OFFLINE, DriverStatus.AVAILABLE]:
        raise HTTPException(status_code=400, detail="Driver is not available")
    
    # Update booking
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "assigned_driver_id": driver_id,
            "assigned_driver_name": driver.get("full_name"),
            "status": BookingStatus.CONFIRMED,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update driver status
    await db.driver_status.update_one(
        {"driver_id": driver_id},
        {"$set": {
            "status": DriverStatus.ASSIGNED,
            "current_booking_id": booking_id,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Notify driver via WebSocket
    booking = await db.patient_bookings.find_one({"id": booking_id}, {"_id": 0})
    await ws_manager.send_to_driver(driver_id, {
        "type": "new_assignment",
        "booking": booking
    })
    
    return {"success": True, "message": "Driver assigned"}

# Admin endpoint to assign driver to public booking
@api_router.post("/admin/assign-driver-public")
async def assign_driver_to_public_booking(
    booking_id: str,
    driver_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Assign a driver to a public booking"""
    # Verify driver exists and is available
    driver = await db.users.find_one({"id": driver_id, "role": UserRole.DRIVER})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver_status = await db.driver_status.find_one({"driver_id": driver_id})
    if driver_status and driver_status.get("status") not in [DriverStatus.OFFLINE, DriverStatus.AVAILABLE]:
        raise HTTPException(status_code=400, detail="Driver is not available")
    
    # Update public booking
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "assigned_driver": driver_id,
            "assigned_driver_name": driver.get("full_name"),
            "status": "confirmed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Update driver status
    await db.driver_status.update_one(
        {"driver_id": driver_id},
        {"$set": {
            "status": DriverStatus.ASSIGNED,
            "current_booking_id": booking_id,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Get booking for WebSocket notification
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Notify driver via WebSocket
    await ws_manager.send_to_driver(driver_id, {
        "type": "new_assignment",
        "booking": booking
    })
    
    return {"success": True, "message": "Driver assigned to public booking"}

# Admin endpoint to get all drivers with their status
@api_router.get("/admin/drivers")
async def get_all_drivers(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Get all drivers with their current status and location"""
    drivers = await db.users.find({"role": UserRole.DRIVER}, {"_id": 0, "password": 0}).to_list(100)
    
    result = []
    for driver in drivers:
        status = await db.driver_status.find_one({"driver_id": driver["id"]}, {"_id": 0})
        result.append({
            **driver,
            "driver_status": status.get("status") if status else DriverStatus.OFFLINE,
            "last_location": status.get("last_location") if status else None,
            "current_booking_id": status.get("current_booking_id") if status else None,
            "last_updated": status.get("last_updated") if status else None
        })
    
    return result

# WebSocket endpoint for driver real-time connection
@app.websocket("/ws/driver/{driver_id}")
async def websocket_driver(websocket: WebSocket, driver_id: str):
    """WebSocket connection for driver app"""
    await ws_manager.connect_driver(websocket, driver_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle location updates via WebSocket
            if data.get("type") == "location":
                location_data = {
                    "latitude": data.get("latitude"),
                    "longitude": data.get("longitude"),
                    "speed": data.get("speed"),
                    "heading": data.get("heading"),
                    "accuracy": data.get("accuracy"),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                await db.driver_status.update_one(
                    {"driver_id": driver_id},
                    {"$set": {"last_location": location_data, "last_updated": datetime.now(timezone.utc).isoformat()}},
                    upsert=True
                )
                
                # Get driver info
                driver = await db.users.find_one({"id": driver_id})
                driver_status = await db.driver_status.find_one({"driver_id": driver_id})
                
                await ws_manager.broadcast_to_admins({
                    "type": "location_update",
                    "driver_id": driver_id,
                    "driver_name": driver.get("full_name") if driver else "Unknown",
                    "location": location_data,
                    "status": driver_status.get("status") if driver_status else DriverStatus.AVAILABLE,
                    "booking_id": driver_status.get("current_booking_id") if driver_status else None
                })
                
    except WebSocketDisconnect:
        ws_manager.disconnect_driver(driver_id)
        # Set driver offline
        await db.driver_status.update_one(
            {"driver_id": driver_id},
            {"$set": {"status": DriverStatus.OFFLINE, "last_updated": datetime.now(timezone.utc).isoformat()}}
        )

# WebSocket endpoint for admin live map
@app.websocket("/ws/admin/live-map")
async def websocket_admin_live_map(websocket: WebSocket):
    """WebSocket connection for admin live map"""
    await ws_manager.connect_admin(websocket)
    try:
        # Send current state of all drivers
        drivers = await db.users.find({"role": UserRole.DRIVER}, {"_id": 0, "password": 0}).to_list(100)
        for driver in drivers:
            status = await db.driver_status.find_one({"driver_id": driver["id"]}, {"_id": 0})
            if status and status.get("last_location"):
                await websocket.send_json({
                    "type": "location_update",
                    "driver_id": driver["id"],
                    "driver_name": driver.get("full_name"),
                    "location": status.get("last_location"),
                    "status": status.get("status"),
                    "booking_id": status.get("current_booking_id")
                })
        
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_admin(websocket)

# ============ CONTACT ROUTES ============

@api_router.post("/contact", response_model=ContactResponse)
async def create_contact(contact: ContactCreate):
    contact_id = str(uuid.uuid4())
    contact_doc = {
        "id": contact_id,
        **contact.model_dump(),
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact_doc)
    
    # Determine which email to send to based on inquiry type
    inquiry_labels = {
        "general": "Opšti upit / General Inquiry",
        "transport": "Transport / Transport",
        "medical": "Medicinska nega / Medical Care"
    }
    inquiry_label = inquiry_labels.get(contact.inquiry_type, "Opšti upit / General Inquiry")
    
    # Send internal notification to appropriate email
    internal_body = get_internal_notification_template("new_contact", {
        "inquiry_type": inquiry_label,
        "name": contact.name,
        "email": contact.email,
        "phone": contact.phone or "N/A",
        "message": contact.message
    })
    
    # Route to appropriate internal email based on inquiry type
    # General inquiries go to info@, medical to ambulanta@, transport to transport@
    if contact.inquiry_type == "medical":
        await send_email(MEDICAL_EMAIL, f"Medicinska nega - {contact.name}", internal_body)
    elif contact.inquiry_type == "transport":
        await send_email(TRANSPORT_EMAIL, f"Transport - {contact.name}", internal_body)
    else:
        # General inquiry goes to info@paramedic-care018.rs
        await send_email(INFO_EMAIL, f"Opšti upit - {contact.name}", internal_body)
    
    # Send auto-reply to customer in their preferred language
    subject, body = get_contact_autoreply_template(contact.name, contact.inquiry_type, contact.language)
    await send_email(contact.email, subject, body)
    
    return ContactResponse(**{k: v for k, v in contact_doc.items() if k != "_id"})

@api_router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [ContactResponse(**c) for c in contacts]

@api_router.put("/contacts/{contact_id}/read")
async def mark_contact_read(contact_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    await db.contacts.update_one({"id": contact_id}, {"$set": {"is_read": True}})
    return {"success": True}

# ============ CONTENT MANAGEMENT ============

@api_router.get("/content")
async def get_all_content():
    content = await db.content.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return content

@api_router.get("/content/{key}")
async def get_content(key: str):
    content = await db.content.find_one({"key": key}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content

@api_router.post("/content", response_model=ContentResponse)
async def create_content(content: ContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    content_id = str(uuid.uuid4())
    content_doc = {
        "id": content_id,
        **content.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.content.insert_one(content_doc)
    return ContentResponse(**{k: v for k, v in content_doc.items() if k != "_id"})

@api_router.put("/content/{content_id}", response_model=ContentResponse)
async def update_content(content_id: str, content: ContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    update_doc = {**content.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.content.update_one({"id": content_id}, {"$set": update_doc})
    updated = await db.content.find_one({"id": content_id}, {"_id": 0})
    return ContentResponse(**updated)

@api_router.delete("/content/{content_id}")
async def delete_content(content_id: str, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    await db.content.delete_one({"id": content_id})
    return {"success": True}

# ============ PAGE CONTENT MANAGEMENT (CMS) ============

@api_router.get("/pages")
async def get_all_pages():
    """Get all page content"""
    content = await db.page_content.find({}, {"_id": 0}).sort([("page", 1), ("order", 1)]).to_list(1000)
    return content

@api_router.get("/pages/{page}")
async def get_page_content(page: str):
    """Get content for a specific page"""
    content = await db.page_content.find({"page": page, "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    return content

@api_router.get("/pages/{page}/{section}")
async def get_page_section(page: str, section: str):
    """Get specific section content"""
    content = await db.page_content.find_one({"page": page, "section": section}, {"_id": 0})
    return content

@api_router.post("/pages", response_model=PageContentResponse)
async def create_page_content(content: PageContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    content_id = str(uuid.uuid4())
    content_doc = {
        "id": content_id,
        **content.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["full_name"]
    }
    await db.page_content.insert_one(content_doc)
    return PageContentResponse(**{k: v for k, v in content_doc.items() if k != "_id"})

@api_router.put("/pages/{content_id}", response_model=PageContentResponse)
async def update_page_content(content_id: str, content: PageContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    update_doc = {
        **content.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["full_name"]
    }
    await db.page_content.update_one({"id": content_id}, {"$set": update_doc})
    updated = await db.page_content.find_one({"id": content_id}, {"_id": 0})
    return PageContentResponse(**updated)

@api_router.delete("/pages/{content_id}")
async def delete_page_content(content_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    await db.page_content.delete_one({"id": content_id})
    return {"success": True}

@api_router.post("/pages/seed")
async def seed_page_content(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Seed default page content"""
    count = await db.page_content.count_documents({})
    if count > 0:
        return {"message": "Content already exists", "count": count}
    
    default_content = [
        # Home Page
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "hero",
            "title_sr": "Medicinski Transport i Hitna Pomoć",
            "title_en": "Medical Transport and Emergency Care",
            "subtitle_sr": "Dostupni 24/7",
            "subtitle_en": "Available 24/7",
            "content_sr": "Profesionalna medicinska pomoć i transport sanitetskim vozilom. Brza, sigurna i pouzdana usluga za vaše zdravlje.",
            "content_en": "Professional medical assistance and ambulance transport. Fast, safe, and reliable service for your health.",
            "image_url": "https://images.pexels.com/photos/6520105/pexels-photo-6520105.jpeg",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "services-title",
            "title_sr": "Naše Usluge",
            "title_en": "Our Services",
            "content_sr": "Pružamo širok spektar medicinskih usluga prilagođenih vašim potrebama",
            "content_en": "We provide a wide range of medical services tailored to your needs",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "cta",
            "title_sr": "Potreban vam je transport?",
            "title_en": "Need Transport?",
            "content_sr": "Zakažite medicinski transport brzo i jednostavno. Naš tim je spreman da vam pomogne.",
            "content_en": "Book medical transport quickly and easily. Our team is ready to help you.",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "emergency-phone",
            "title_sr": "Hitna linija",
            "title_en": "Emergency Line",
            "content_sr": "+381 18 123 456",
            "content_en": "+381 18 123 456",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "gallery-title",
            "title_sr": "Galerija",
            "title_en": "Gallery",
            "content_sr": "Pogledajte naš tim i opremu",
            "content_en": "See our team and equipment",
            "order": 5,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "gallery-1",
            "title_sr": "Tim medicinskih tehničara",
            "title_en": "Paramedic Team",
            "content_sr": "Naš stručni tim medicinskih tehničara",
            "content_en": "Our professional paramedic team",
            "image_url": "https://images.pexels.com/photos/6519910/pexels-photo-6519910.jpeg",
            "order": 6,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "gallery-2",
            "title_sr": "Lekar na dužnosti",
            "title_en": "Doctor on Duty",
            "content_sr": "Naši lekari su uvek spremni da pomognu",
            "content_en": "Our doctors are always ready to help",
            "image_url": "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg",
            "order": 7,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "gallery-3",
            "title_sr": "Medicinska sestra",
            "title_en": "Nurse",
            "content_sr": "Profesionalna nega pacijenata",
            "content_en": "Professional patient care",
            "image_url": "https://images.pexels.com/photos/9893525/pexels-photo-9893525.jpeg",
            "order": 8,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "gallery-4",
            "title_sr": "Moderna bolnica",
            "title_en": "Modern Hospital",
            "content_sr": "Saradnja sa vodećim zdravstvenim ustanovama",
            "content_en": "Collaboration with leading healthcare facilities",
            "image_url": "https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg",
            "order": 9,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        # Medical Care Page
        {
            "id": str(uuid.uuid4()),
            "page": "medical-care",
            "section": "hero",
            "title_sr": "Profesionalna Medicinska Pomoć",
            "title_en": "Professional Medical Assistance",
            "subtitle_sr": "Medicinska Nega",
            "subtitle_en": "Medical Care",
            "content_sr": "Pružamo vrhunsku medicinsku negu sa fokusom na bezbednost i udobnost pacijenata. Naš tim je dostupan 24 sata dnevno, 7 dana u nedelji.",
            "content_en": "We provide top-quality medical care with a focus on patient safety and comfort. Our team is available 24 hours a day, 7 days a week.",
            "image_url": "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "medical-care",
            "section": "service-1",
            "title_sr": "Hitna medicinska pomoć",
            "title_en": "Emergency Medical Assistance",
            "content_sr": "Brza i profesionalna hitna medicinska pomoć dostupna 24/7. Naš tim je obučen za sve vrste hitnih situacija.",
            "content_en": "Fast and professional emergency medical assistance available 24/7. Our team is trained for all types of emergencies.",
            "icon": "Siren",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "medical-care",
            "section": "service-2",
            "title_sr": "Medicinska stabilizacija",
            "title_en": "On-site Medical Stabilization",
            "content_sr": "Stručna medicinska stabilizacija na licu mesta pre transporta. Osiguravamo da su pacijenti stabilni pre pomeranja.",
            "content_en": "Expert on-site medical stabilization before transport. We ensure patients are stable before moving.",
            "icon": "HeartPulse",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "medical-care",
            "section": "service-3",
            "title_sr": "Profesionalno medicinsko osoblje",
            "title_en": "Professional Medical Staff",
            "content_sr": "Tim stručnih lekara i medicinskih sestara sa višegodišnjim iskustvom u hitnoj medicini.",
            "content_en": "Team of professional doctors and nurses with years of experience in emergency medicine.",
            "icon": "UserCheck",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        # Transport Page
        {
            "id": str(uuid.uuid4()),
            "page": "transport",
            "section": "hero",
            "title_sr": "Medicinski Transport",
            "title_en": "Medical Transport",
            "subtitle_sr": "Hitno",
            "subtitle_en": "Urgent",
            "content_sr": "Pružamo siguran i pouzdan medicinski transport sa profesionalnom pratnjom. Naša flota je opremljena najmodernijom medicinskom opremom.",
            "content_en": "We provide safe and reliable medical transport with professional escort. Our fleet is equipped with the most modern medical equipment.",
            "image_url": "https://images.pexels.com/photos/6520105/pexels-photo-6520105.jpeg",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "transport",
            "section": "service-1",
            "title_sr": "Transport sanitetom",
            "title_en": "Ambulance Transport",
            "content_sr": "Siguran i udoban transport specijalizovanim sanitetskim vozilom opremljenim najmodernijom medicinskom opremom.",
            "content_en": "Safe and comfortable transport in specialized ambulance vehicle equipped with the most modern medical equipment.",
            "icon": "Ambulance",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "transport",
            "section": "service-2",
            "title_sr": "Transport između bolnica",
            "title_en": "Hospital-to-Hospital Transport",
            "content_sr": "Profesionalan transport pacijenata između zdravstvenih ustanova sa punom medicinskom pratnjom.",
            "content_en": "Professional patient transport between healthcare facilities with full medical escort.",
            "icon": "Building2",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "transport",
            "section": "service-3",
            "title_sr": "Transport od kuće do bolnice",
            "title_en": "Home-to-Hospital Transport",
            "content_sr": "Bezbedna vožnja od vašeg doma do zdravstvene ustanove. Preuzimamo pacijenta na adresi i pratimo do destinacije.",
            "content_en": "Safe ride from your home to the healthcare facility. We pick up the patient at the address and accompany them to the destination.",
            "icon": "Home",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        # About Page
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "hero",
            "title_sr": "Paramedic Care 018 - Vaš partner u zdravlju",
            "title_en": "Paramedic Care 018 - Your Health Partner",
            "subtitle_sr": "O Nama",
            "subtitle_en": "About Us",
            "content_sr": "Paramedic Care 018 je vodeća kompanija za medicinski transport i hitnu pomoć u Srbiji. Sa sedištem u Nišu, pružamo profesionalne usluge širom zemlje.",
            "content_en": "Paramedic Care 018 is a leading medical transport and emergency services company in Serbia. Based in Niš, we provide professional services throughout the country.",
            "image_url": "https://images.pexels.com/photos/6519910/pexels-photo-6519910.jpeg",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "mission",
            "title_sr": "Naša Misija",
            "title_en": "Our Mission",
            "content_sr": "Pružiti najkvalitetniju medicinsku negu i transport, osiguravajući bezbednost i udobnost svakog pacijenta. Verujemo da svaka osoba zaslužuje pristup profesionalnoj medicinskoj pomoći, bez obzira na okolnosti.",
            "content_en": "To provide the highest quality medical care and transport, ensuring the safety and comfort of every patient. We believe that every person deserves access to professional medical assistance, regardless of circumstances.",
            "image_url": "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg",
            "icon": "Target",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "value-1",
            "title_sr": "Profesionalnost",
            "title_en": "Professionalism",
            "content_sr": "Najviši standardi u svemu što radimo",
            "content_en": "Highest standards in everything we do",
            "icon": "Shield",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "value-2",
            "title_sr": "Pouzdanost",
            "title_en": "Reliability",
            "content_sr": "Možete se osloniti na nas",
            "content_en": "You can count on us",
            "icon": "Heart",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "value-3",
            "title_sr": "Empatija",
            "title_en": "Empathy",
            "content_sr": "Razumemo vaše potrebe",
            "content_en": "We understand your needs",
            "icon": "Users",
            "order": 5,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "value-4",
            "title_sr": "Dostupnost 24/7",
            "title_en": "Availability 24/7",
            "content_sr": "Uvek tu kada vam zatrebamo",
            "content_en": "Always there when you need us",
            "icon": "Clock",
            "order": 6,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        # Header (Super Admin Only)
        {
            "id": str(uuid.uuid4()),
            "page": "header",
            "section": "logo",
            "title_sr": "Paramedic Care 018",
            "title_en": "Paramedic Care 018",
            "content_sr": "Logo i brend identitet u zaglavlju sajta",
            "content_en": "Logo and brand identity in the site header",
            "image_url": "https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "header",
            "section": "emergency-banner",
            "title_sr": "Hitna pomoć",
            "title_en": "Emergency Help",
            "content_sr": "+381 18 123 456",
            "content_en": "+381 18 123 456",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        # Footer (Super Admin Only)
        {
            "id": str(uuid.uuid4()),
            "page": "footer",
            "section": "company-info",
            "title_sr": "Kontakt Informacije",
            "title_en": "Contact Information",
            "content_sr": "Žarka Zrenjanina 50A, 18103 Niš (Pantelej), Srbija",
            "content_en": "Žarka Zrenjanina 50A, 18103 Niš (Pantelej), Serbia",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "footer",
            "section": "phone",
            "title_sr": "Telefon",
            "title_en": "Phone",
            "content_sr": "+381 18 123 456",
            "content_en": "+381 18 123 456",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "footer",
            "section": "legal",
            "title_sr": "Pravne informacije",
            "title_en": "Legal Information",
            "content_sr": "PIB: 115243796 | MB: 68211557",
            "content_en": "PIB: 115243796 | MB: 68211557",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "footer",
            "section": "copyright",
            "title_sr": "Autorska prava",
            "title_en": "Copyright",
            "content_sr": "© 2026 Paramedic Care 018. Sva prava zadržana.",
            "content_en": "© 2026 Paramedic Care 018. All rights reserved.",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
    ]
    
    await db.page_content.insert_many(default_content)
    return {"message": "Content seeded successfully", "count": len(default_content)}

# ============ FILE UPLOAD ============

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@api_router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Upload an image file and return the URL"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content to check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{unique_id}{file_ext}"
    
    # Save file
    file_path = UPLOADS_DIR / safe_filename
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Return the URL (with /api prefix for ingress routing)
    # The URL will be accessible via /api/uploads/filename
    image_url = f"/api/uploads/{safe_filename}"
    
    logger.info(f"Image uploaded: {safe_filename} by {user.get('email', 'unknown')}")
    
    return {
        "success": True,
        "filename": safe_filename,
        "url": image_url,
        "size": len(content),
        "type": file.content_type
    }

@api_router.delete("/upload/image/{filename}")
async def delete_image(
    filename: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Delete an uploaded image"""
    file_path = UPLOADS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Security check - ensure the file is in the uploads directory
    if not str(file_path.resolve()).startswith(str(UPLOADS_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    
    file_path.unlink()
    logger.info(f"Image deleted: {filename} by {user.get('email', 'unknown')}")
    
    return {"success": True, "message": "Image deleted"}

# ============ SERVICES MANAGEMENT ============

@api_router.get("/services")
async def get_services():
    services = await db.services.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return services

@api_router.get("/services/{category}")
async def get_services_by_category(category: str):
    services = await db.services.find({"category": category, "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    return services

@api_router.post("/services", response_model=ServiceResponse)
async def create_service(service: ServiceCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    service_id = str(uuid.uuid4())
    service_doc = {"id": service_id, **service.model_dump()}
    await db.services.insert_one(service_doc)
    return ServiceResponse(**{k: v for k, v in service_doc.items() if k != "_id"})

@api_router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, service: ServiceCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    await db.services.update_one({"id": service_id}, {"$set": service.model_dump()})
    updated = await db.services.find_one({"id": service_id}, {"_id": 0})
    return ServiceResponse(**updated)

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    await db.services.delete_one({"id": service_id})
    return {"success": True}

# ============ FILE UPLOAD ============

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        encoded = base64.b64encode(content).decode()
        file_id = str(uuid.uuid4())
        file_doc = {
            "id": file_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "data": encoded,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.files.insert_one(file_doc)
        return {"file_id": file_id, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/files/{file_id}")
async def get_file(file_id: str):
    file_doc = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    return file_doc

# ============ STATISTICS ============

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    total_users = await db.users.count_documents({})
    total_contacts = await db.contacts.count_documents({"is_read": False})
    
    return {
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "total_users": total_users,
        "unread_contacts": total_contacts
    }

# ============ SEED DATA ============

@api_router.post("/seed")
async def seed_data():
    # Create super admin if not exists
    admin_exists = await db.users.find_one({"email": "admin@paramedic-care018.rs"})
    if not admin_exists:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "email": "admin@paramedic-care018.rs",
            "password": hash_password("Admin123!"),
            "full_name": "Super Administrator",
            "phone": "+381 18 123 456",
            "role": UserRole.SUPERADMIN,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
    
    # Seed services if empty
    services_count = await db.services.count_documents({})
    if services_count == 0:
        services = [
            {"id": str(uuid.uuid4()), "name_sr": "Hitna medicinska pomoć", "name_en": "Emergency Medical Assistance", "description_sr": "Brza i profesionalna hitna medicinska pomoć dostupna 24/7.", "description_en": "Fast and professional emergency medical assistance available 24/7.", "icon": "Siren", "category": "medical", "order": 1, "is_active": True},
            {"id": str(uuid.uuid4()), "name_sr": "Medicinska stabilizacija", "name_en": "On-site Medical Stabilization", "description_sr": "Stručna medicinska stabilizacija na licu mesta pre transporta.", "description_en": "Expert on-site medical stabilization before transport.", "icon": "HeartPulse", "category": "medical", "order": 2, "is_active": True},
            {"id": str(uuid.uuid4()), "name_sr": "Profesionalno osoblje", "name_en": "Professional Medical Staff", "description_sr": "Tim stručnih lekara i medicinskih sestara.", "description_en": "Team of professional doctors and nurses.", "icon": "Stethoscope", "category": "medical", "order": 3, "is_active": True},
            {"id": str(uuid.uuid4()), "name_sr": "Transport sanitetom", "name_en": "Ambulance Transport", "description_sr": "Siguran i udoban transport specijalizovanim sanitetskim vozilom.", "description_en": "Safe and comfortable transport in specialized ambulance vehicle.", "icon": "Ambulance", "category": "transport", "order": 1, "is_active": True},
            {"id": str(uuid.uuid4()), "name_sr": "Transport između bolnica", "name_en": "Hospital-to-Hospital Transport", "description_sr": "Profesionalan transport pacijenata između zdravstvenih ustanova.", "description_en": "Professional patient transport between healthcare facilities.", "icon": "Building2", "category": "transport", "order": 2, "is_active": True},
            {"id": str(uuid.uuid4()), "name_sr": "Transport od kuće do bolnice", "name_en": "Home-to-Hospital Transport", "description_sr": "Bezbedna vožnja od vašeg doma do zdravstvene ustanove.", "description_en": "Safe ride from your home to the healthcare facility.", "icon": "Home", "category": "transport", "order": 3, "is_active": True},
        ]
        await db.services.insert_many(services)
    
    return {"success": True, "message": "Data seeded successfully"}

# Include router and middleware
app.include_router(api_router)

# Mount static files for uploads at /api/uploads (to work with ingress routing)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
