from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
import shutil

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

def get_registration_email_template(full_name: str, email: str, language: str = "sr"):
    """Email template for successful registration"""
    if language == "en":
        subject = "Welcome to Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f172a; margin-bottom: 20px;">Welcome to Paramedic Care 018!</h2>
                <p style="color: #334155; line-height: 1.6;">Dear <strong>{full_name}</strong>,</p>
                <p style="color: #334155; line-height: 1.6;">Thank you for registering with Paramedic Care 018. Your account has been successfully created.</p>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>Account Details:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Email: {email}</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">With your account, you can:</p>
                <ul style="color: #334155; line-height: 1.8;">
                    <li>Book medical transport services</li>
                    <li>Track your booking status</li>
                    <li>Access your booking history</li>
                    <li>Contact our support team directly</li>
                </ul>
                
                <p style="color: #334155; line-height: 1.6;">If you have any questions, please don't hesitate to contact us.</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Paramedic Care 018 Team</strong></p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "Dobrodošli u Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f172a; margin-bottom: 20px;">Dobrodošli u Paramedic Care 018!</h2>
                <p style="color: #334155; line-height: 1.6;">Poštovani/a <strong>{full_name}</strong>,</p>
                <p style="color: #334155; line-height: 1.6;">Hvala vam što ste se registrovali na Paramedic Care 018. Vaš nalog je uspešno kreiran.</p>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>Podaci o nalogu:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Email: {email}</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">Sa vašim nalogom možete:</p>
                <ul style="color: #334155; line-height: 1.8;">
                    <li>Rezervisati usluge medicinskog transporta</li>
                    <li>Pratiti status vaše rezervacije</li>
                    <li>Pristupiti istoriji rezervacija</li>
                    <li>Kontaktirati naš tim za podršku direktno</li>
                </ul>
                
                <p style="color: #334155; line-height: 1.6;">Ako imate bilo kakvih pitanja, slobodno nas kontaktirajte.</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 30px;">Srdačan pozdrav,<br><strong>Tim Paramedic Care 018</strong></p>
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

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": user_data.role if user_data.role in [UserRole.REGULAR] else UserRole.REGULAR,
        "language": user_data.language,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Send welcome email
    subject, body = get_registration_email_template(user_data.full_name, user_data.email, user_data.language)
    await send_email(user_data.email, subject, body)
    
    token = create_token(user_id, user_doc["role"])
    user_response = {k: v for k, v in user_doc.items() if k != "password" and k != "_id"}
    return TokenResponse(access_token=token, user=UserResponse(**user_response))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account deactivated")
    
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

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

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
