"""
Notification routes - /settings/sms, /settings/email
Handles: SMS Gateway configuration, Email settings, notification logs
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional, Dict
import uuid

from config import db, logger, SMTP_HOST, SMTP_PORT, INFO_EMAIL, INFO_PASS
from models import UserRole
from utils.auth import require_roles
from utils.email import send_email, get_email_header, get_email_footer, get_transport_email_template
from services.sms_service import SMSService, SMSConfig, SMSProvider, SMSResult

router = APIRouter(tags=["Notifications"])


# ============ PYDANTIC MODELS ============

class SMSSettingsUpdate(BaseModel):
    provider: str = "textbelt"
    api_key: Optional[str] = "textbelt"
    api_secret: Optional[str] = None
    sender_id: Optional[str] = None
    custom_endpoint: Optional[str] = None
    custom_headers: Optional[Dict[str, str]] = None
    custom_payload_template: Optional[str] = None
    enabled: bool = True


class SMSSendRequest(BaseModel):
    phone: str
    message: str


class EmailSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 465
    sender_email: Optional[str] = None
    sender_password: Optional[str] = None
    sender_name: Optional[str] = "Paramedic Care 018"
    enabled: bool = True
    notify_booking_created: bool = True
    notify_driver_assigned: bool = True
    notify_driver_arriving: bool = True
    notify_transport_completed: bool = True
    notify_pickup_reminder: bool = True


class EmailTestRequest(BaseModel):
    to_email: str
    subject: Optional[str] = "Test Email - Paramedic Care 018"
    message: Optional[str] = None


# ============ SMS PROVIDERS LIST ============

SMS_PROVIDERS = [
    {"id": "textbelt", "name": "Textbelt (Free)", "description": "Free tier: 1 SMS/day per phone number"},
    {"id": "twilio", "name": "Twilio", "description": "Requires Account SID, Auth Token, and From number"},
    {"id": "infobip", "name": "Infobip", "description": "Requires API Key"},
    {"id": "custom", "name": "Custom HTTP", "description": "Custom HTTP endpoint with JSON payload"}
]


# ============ SMS SETTINGS ROUTES ============

@router.get("/settings/sms")
async def get_sms_settings(user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Get SMS gateway settings (Super Admin only)"""
    settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
    if not settings:
        return {
            "type": "sms",
            "provider": "textbelt",
            "api_key": "textbelt",
            "api_secret": None,
            "sender_id": None,
            "custom_endpoint": None,
            "custom_headers": None,
            "custom_payload_template": None,
            "enabled": True,
            "providers_available": SMS_PROVIDERS
        }
    
    settings["providers_available"] = SMS_PROVIDERS
    return settings


@router.put("/settings/sms")
async def update_sms_settings(
    settings: SMSSettingsUpdate,
    user: dict = Depends(require_roles([UserRole.SUPERADMIN]))
):
    """Update SMS gateway settings (Super Admin only)"""
    settings_doc = {
        "type": "sms",
        "provider": settings.provider,
        "api_key": settings.api_key,
        "api_secret": settings.api_secret,
        "sender_id": settings.sender_id,
        "custom_endpoint": settings.custom_endpoint,
        "custom_headers": settings.custom_headers,
        "custom_payload_template": settings.custom_payload_template,
        "enabled": settings.enabled,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["id"]
    }
    
    await db.system_settings.update_one(
        {"type": "sms"},
        {"$set": settings_doc},
        upsert=True
    )
    
    return {"success": True, "message": "SMS settings updated"}


@router.post("/settings/sms/test")
async def test_sms_settings(
    request: SMSSendRequest,
    user: dict = Depends(require_roles([UserRole.SUPERADMIN]))
):
    """Test SMS settings by sending a test message (Super Admin only)"""
    settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
    
    if not settings:
        settings = {"provider": "textbelt", "api_key": "textbelt", "enabled": True}
    
    if not settings.get("enabled"):
        return {"success": False, "error": "SMS service is disabled"}
    
    config = SMSConfig(
        provider=SMSProvider(settings.get("provider", "textbelt")),
        api_key=settings.get("api_key", "textbelt"),
        api_secret=settings.get("api_secret"),
        sender_id=settings.get("sender_id"),
        custom_endpoint=settings.get("custom_endpoint"),
        custom_headers=settings.get("custom_headers"),
        custom_payload_template=settings.get("custom_payload_template"),
        enabled=True
    )
    
    sms_service = SMSService(config)
    result = await sms_service.send_sms(request.phone, request.message)
    
    # Log the test
    await db.sms_logs.insert_one({
        "id": str(uuid.uuid4()),
        "phone": request.phone,
        "message": request.message,
        "provider": result.provider,
        "success": result.success,
        "message_id": result.message_id,
        "error": result.error,
        "is_test": True,
        "sent_by": user["id"],
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": result.success,
        "message_id": result.message_id,
        "error": result.error,
        "provider": result.provider,
        "quota_remaining": result.quota_remaining
    }


@router.get("/settings/sms/logs")
async def get_sms_logs(
    limit: int = 50,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get SMS send logs"""
    logs = await db.sms_logs.find({}, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    return logs


# ============ EMAIL SETTINGS ROUTES ============

@router.get("/settings/email")
async def get_email_settings(user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Get email settings (Super Admin only)"""
    settings = await db.system_settings.find_one({"type": "email"}, {"_id": 0})
    if not settings:
        return {
            "type": "email",
            "smtp_host": SMTP_HOST,
            "smtp_port": SMTP_PORT,
            "sender_email": INFO_EMAIL,
            "sender_password": "********",
            "sender_name": "Paramedic Care 018",
            "enabled": True,
            "notify_booking_created": True,
            "notify_driver_assigned": True,
            "notify_driver_arriving": True,
            "notify_transport_completed": True,
            "notify_pickup_reminder": True
        }
    
    if settings.get("sender_password"):
        settings["sender_password"] = "********"
    
    return settings


@router.put("/settings/email")
async def update_email_settings(
    settings: EmailSettingsUpdate,
    user: dict = Depends(require_roles([UserRole.SUPERADMIN]))
):
    """Update email settings (Super Admin only)"""
    existing = await db.system_settings.find_one({"type": "email"}, {"_id": 0})
    
    settings_doc = {
        "type": "email",
        "smtp_host": settings.smtp_host or SMTP_HOST,
        "smtp_port": settings.smtp_port or SMTP_PORT,
        "sender_email": settings.sender_email or INFO_EMAIL,
        "sender_name": settings.sender_name or "Paramedic Care 018",
        "enabled": settings.enabled,
        "notify_booking_created": settings.notify_booking_created,
        "notify_driver_assigned": settings.notify_driver_assigned,
        "notify_driver_arriving": settings.notify_driver_arriving,
        "notify_transport_completed": settings.notify_transport_completed,
        "notify_pickup_reminder": settings.notify_pickup_reminder,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["id"]
    }
    
    if settings.sender_password and settings.sender_password != "********":
        settings_doc["sender_password"] = settings.sender_password
    elif existing and existing.get("sender_password"):
        settings_doc["sender_password"] = existing.get("sender_password")
    else:
        settings_doc["sender_password"] = INFO_PASS
    
    await db.system_settings.update_one(
        {"type": "email"},
        {"$set": settings_doc},
        upsert=True
    )
    
    return {"success": True, "message": "Email settings updated"}


@router.post("/settings/email/test")
async def test_email_settings(
    request: EmailTestRequest,
    user: dict = Depends(require_roles([UserRole.SUPERADMIN]))
):
    """Test email settings by sending a test email (Super Admin only)"""
    settings = await db.system_settings.find_one({"type": "email"}, {"_id": 0})
    
    smtp_host = settings.get("smtp_host", SMTP_HOST) if settings else SMTP_HOST
    smtp_port = settings.get("smtp_port", SMTP_PORT) if settings else SMTP_PORT
    sender_email = settings.get("sender_email", INFO_EMAIL) if settings else INFO_EMAIL
    sender_pass = settings.get("sender_password", INFO_PASS) if settings else INFO_PASS
    sender_name = settings.get("sender_name", "Paramedic Care 018") if settings else "Paramedic Care 018"
    
    test_body = f"""
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
        {get_email_header()}
        <div style="padding: 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <h1 style="color: #1e293b; margin-bottom: 10px;">✅ Test Email - Uspešno!</h1>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                {request.message or "Ovo je test email za proveru email konfiguracije. Ako vidite ovu poruku, vaše email podešavanja su ispravna!"}
            </p>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #0ea5e9; margin-top: 0;">📧 Detalji konfiguracije</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">SMTP Server:</td>
                        <td style="padding: 8px 0; color: #1e293b;">{smtp_host}:{smtp_port}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Pošiljalac:</td>
                        <td style="padding: 8px 0; color: #1e293b;">{sender_email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Vreme slanja:</td>
                        <td style="padding: 8px 0; color: #1e293b;">{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #64748b; font-size: 13px; margin-top: 30px;">
                Sent by: {user.get('full_name', 'Super Admin')}
            </p>
        </div>
        {get_email_footer('sr')}
    </body>
    </html>
    """
    
    try:
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        import aiosmtplib
        
        message = MIMEMultipart("alternative")
        message["From"] = f"{sender_name} <{sender_email}>"
        message["To"] = request.to_email
        message["Subject"] = request.subject or "Test Email - Paramedic Care 018"
        message.attach(MIMEText(test_body, "html"))
        
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=sender_email,
            password=sender_pass,
            use_tls=True
        )
        
        await db.email_logs.insert_one({
            "id": str(uuid.uuid4()),
            "to_email": request.to_email,
            "subject": request.subject or "Test Email - Paramedic Care 018",
            "success": True,
            "is_test": True,
            "sent_by": user["id"],
            "sent_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"success": True, "message": "Test email sent successfully"}
        
    except Exception as e:
        await db.email_logs.insert_one({
            "id": str(uuid.uuid4()),
            "to_email": request.to_email,
            "subject": request.subject or "Test Email - Paramedic Care 018",
            "success": False,
            "error": str(e),
            "is_test": True,
            "sent_by": user["id"],
            "sent_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"success": False, "error": str(e)}


@router.get("/settings/email/logs")
async def get_email_logs(
    limit: int = 50,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get email send logs"""
    logs = await db.email_logs.find({}, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    return logs


# ============ HELPER FUNCTIONS ============

async def send_sms_notification(phone: str, message: str, booking_id: str = None) -> SMSResult:
    """Send SMS using configured provider"""
    settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
    
    if not settings or not settings.get("enabled", True):
        return SMSResult(success=False, error="SMS service is disabled", provider="none")
    
    config = SMSConfig(
        provider=SMSProvider(settings.get("provider", "textbelt")),
        api_key=settings.get("api_key", "textbelt"),
        api_secret=settings.get("api_secret"),
        sender_id=settings.get("sender_id"),
        custom_endpoint=settings.get("custom_endpoint"),
        custom_headers=settings.get("custom_headers"),
        custom_payload_template=settings.get("custom_payload_template"),
        enabled=True
    )
    
    sms_service = SMSService(config)
    result = await sms_service.send_sms(phone, message)
    
    await db.sms_logs.insert_one({
        "id": str(uuid.uuid4()),
        "phone": phone,
        "message": message,
        "booking_id": booking_id,
        "provider": result.provider,
        "success": result.success,
        "message_id": result.message_id,
        "error": result.error,
        "is_test": False,
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    
    return result


async def send_booking_email_notification(
    booking: dict,
    notification_type: str,
    extra_data: dict = None
) -> bool:
    """
    Send email notification for booking events.
    
    notification_type can be:
    - booking_confirmation: New booking created
    - driver_assigned: Driver assigned to booking
    - driver_arriving: Driver is on the way
    - transport_completed: Transport finished
    - pickup_reminder: Reminder before pickup
    """
    settings = await db.system_settings.find_one({"type": "email"}, {"_id": 0})
    
    if settings:
        if not settings.get("enabled", True):
            logger.info(f"Email notifications disabled, skipping {notification_type}")
            return False
        
        type_setting_map = {
            "booking_confirmation": "notify_booking_created",
            "driver_assigned": "notify_driver_assigned",
            "driver_arriving": "notify_driver_arriving",
            "transport_completed": "notify_transport_completed",
            "pickup_reminder": "notify_pickup_reminder"
        }
        
        setting_key = type_setting_map.get(notification_type)
        if setting_key and not settings.get(setting_key, True):
            logger.info(f"Email notification {notification_type} disabled, skipping")
            return False
    
    contact_email = booking.get("contact_email")
    if not contact_email:
        logger.warning(f"No contact email for booking {booking.get('id')}, skipping email")
        return False
    
    language = booking.get("language", "sr")
    
    data = {
        "patient_name": booking.get("patient_name", ""),
        "booking_date": booking.get("booking_date") or booking.get("preferred_date", ""),
        "pickup_time": booking.get("pickup_time") or booking.get("preferred_time", "TBD"),
        "start_point": booking.get("start_point") or booking.get("pickup_address", ""),
        "end_point": booking.get("end_point") or booking.get("destination_address", ""),
        "booking_id": booking.get("id", "")
    }
    
    if extra_data:
        data.update(extra_data)
    
    try:
        subject, body = get_transport_email_template(notification_type, data, language)
        
        if not subject or not body:
            logger.warning(f"No email template for {notification_type}")
            return False
        
        success = await send_email(contact_email, subject, body)
        
        await db.email_logs.insert_one({
            "id": str(uuid.uuid4()),
            "to_email": contact_email,
            "subject": subject,
            "notification_type": notification_type,
            "booking_id": booking.get("id"),
            "success": success,
            "is_test": False,
            "sent_at": datetime.now(timezone.utc).isoformat()
        })
        
        return success
        
    except Exception as e:
        logger.error(f"Failed to send email notification: {e}")
        await db.email_logs.insert_one({
            "id": str(uuid.uuid4()),
            "to_email": contact_email,
            "notification_type": notification_type,
            "booking_id": booking.get("id"),
            "success": False,
            "error": str(e),
            "is_test": False,
            "sent_at": datetime.now(timezone.utc).isoformat()
        })
        return False
