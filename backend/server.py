from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'paramedic-care-018-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Email Settings
SMTP_HOST = os.environ.get('SMTP_HOST', 'mailcluster.loopia.se')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 465))
SMTP_USER = os.environ.get('SMTP_USER', 'transport@paramedic-care018.rs')
SMTP_PASS = os.environ.get('SMTP_PASS', 'Ambulanta!SSSS2026')
TRANSPORT_EMAIL = os.environ.get('TRANSPORT_EMAIL', 'transport@paramedic-care018.rs')
MEDICAL_EMAIL = os.environ.get('MEDICAL_EMAIL', 'ambulanta@paramedic-care018.rs')
MEDICAL_PASS = os.environ.get('MEDICAL_PASS', 'Ambulanta!SSS2026')

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

async def send_email(to_email: str, subject: str, body_html: str, email_type: str = "transport"):
    """Send email using appropriate account based on type (transport or medical)"""
    try:
        if email_type == "medical":
            from_email = MEDICAL_EMAIL
            password = MEDICAL_PASS
        else:
            from_email = SMTP_USER
            password = SMTP_PASS
        
        message = MIMEMultipart("alternative")
        message["From"] = from_email
        message["To"] = to_email
        message["Subject"] = subject
        message.attach(MIMEText(body_html, "html"))
        
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=from_email,
            password=password,
            use_tls=True
        )
        logger.info(f"Email sent to {to_email} from {from_email}")
        return True
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return False

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
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
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
    
    # Send email notification
    email_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">
        <h2>Nova Rezervacija Transporta / New Transport Booking</h2>
        <p><strong>Pacijent / Patient:</strong> {booking.patient_name}</p>
        <p><strong>Polazna tačka / Start:</strong> {booking.start_point}</p>
        <p><strong>Odredište / Destination:</strong> {booking.end_point}</p>
        <p><strong>Datum / Date:</strong> {booking.booking_date}</p>
        <p><strong>Telefon / Phone:</strong> {booking.contact_phone}</p>
        <p><strong>Email:</strong> {booking.contact_email}</p>
        <p><strong>Napomene / Notes:</strong> {booking.notes or 'N/A'}</p>
        <hr>
        <p>Booking ID: {booking_id}</p>
    </body>
    </html>
    """
    await send_email(TRANSPORT_EMAIL, f"Nova Rezervacija - {booking.patient_name}", email_body)
    
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
    
    # Send notification email
    email_body = f"""
    <html>
    <body>
        <h2>Nova Kontakt Poruka / New Contact Message</h2>
        <p><strong>Tip upita / Inquiry Type:</strong> {inquiry_label}</p>
        <p><strong>Ime / Name:</strong> {contact.name}</p>
        <p><strong>Email:</strong> {contact.email}</p>
        <p><strong>Telefon / Phone:</strong> {contact.phone or 'N/A'}</p>
        <p><strong>Poruka / Message:</strong></p>
        <p>{contact.message}</p>
    </body>
    </html>
    """
    
    # Route to appropriate email based on inquiry type
    if contact.inquiry_type == "medical":
        await send_email(MEDICAL_EMAIL, f"Medicinska nega - {contact.name}", email_body, "medical")
    else:
        await send_email(TRANSPORT_EMAIL, f"Kontakt: {contact.name}", email_body, "transport")
    
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
