"""
Booking routes - /bookings/*, /admin/patient-bookings/*
Handles: Public bookings, Patient portal bookings, Admin booking management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import List, Optional
import uuid

from config import db, TRANSPORT_EMAIL, MEDICAL_EMAIL, logger
from models import (
    UserRole, BookingStatus, DriverStatus,
    BookingCreate, BookingResponse, BookingFullUpdate,
    PatientBookingCreate, PatientBookingResponse
)
from utils.auth import get_current_user, get_optional_user, require_roles
from utils.email import send_email, get_internal_notification_template
from services.sms_service import SMSTemplates

router = APIRouter(tags=["Bookings"])


# ============ HELPER FUNCTIONS ============

async def send_sms_notification(phone: str, message: str, booking_id: str = None):
    """Send SMS notification using configured provider"""
    from services.sms_service import SMSService, SMSConfig, SMSProvider, SMSResult
    
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
    
    # Log the SMS
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


def get_booking_confirmation_template(patient_name: str, booking_date: str, start_point: str, end_point: str, booking_id: str, booking_type: str = "transport", language: str = "sr"):
    """Email template for booking confirmation"""
    from utils.email import get_email_header, get_email_footer
    
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
                    <p style="margin: 10px 0 0 0; color: #334155;">Our team will review your booking and contact you to confirm the details.</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">For any questions, please contact us:</p>
                <p style="color: #0ea5e9; font-size: 18px; font-weight: bold; margin: 10px 0;">+381 66 81 01 007</p>
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
                    <p style="margin: 10px 0 0 0; color: #334155;">Naš tim će pregledati vašu rezervaciju i kontaktirati vas radi potvrde detalja.</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">Za sva pitanja, kontaktirajte nas:</p>
                <p style="color: #0ea5e9; font-size: 18px; font-weight: bold; margin: 10px 0;">+381 66 81 01 007</p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body


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


# ============ PUBLIC BOOKING ROUTES ============

@router.post("/bookings", response_model=BookingResponse)
async def create_booking(booking: BookingCreate, user: dict = Depends(get_optional_user)):
    """Create a new public booking"""
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
    
    # Send SMS confirmation to customer
    if booking.contact_phone:
        sms_message = SMSTemplates.booking_confirmation(
            booking.patient_name,
            booking.booking_date,
            booking.booking_time or "TBD",
            booking.language or 'sr'
        )
        await send_sms_notification(booking.contact_phone, sms_message, booking_id)
    
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


@router.get("/bookings", response_model=List[BookingResponse])
async def get_bookings(user: dict = Depends(get_current_user)):
    """Get bookings based on user role"""
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


@router.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str):
    """Get a specific booking"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse(**booking)


@router.put("/bookings/{booking_id}", response_model=BookingResponse)
async def update_booking(booking_id: str, update: BookingFullUpdate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER, UserRole.DOCTOR, UserRole.NURSE]))):
    """Update a booking"""
    existing_booking = await db.bookings.find_one({"id": booking_id})
    if not existing_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update_doc = {}
    update_dict = update.model_dump(exclude_unset=True)
    
    # Fields that can be explicitly set to None
    nullable_fields = ['assigned_driver', 'assigned_driver_name', 'assigned_medical']
    
    for key, value in update_dict.items():
        if key in nullable_fields:
            update_doc[key] = value
        elif value is not None:
            update_doc[key] = value
    
    if not update_doc:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Reset driver status if driver is being removed or booking is cancelled/completed
    old_driver = existing_booking.get("assigned_driver")
    new_driver = update_dict.get("assigned_driver", old_driver)
    
    if old_driver and (new_driver is None or update.status in ["cancelled", "completed"]):
        await db.driver_status.update_one(
            {"driver_id": old_driver, "current_booking_id": booking_id},
            {"$set": {
                "status": DriverStatus.AVAILABLE,
                "current_booking_id": None,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_doc})
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Send SMS notifications based on changes
    contact_phone = booking.get("contact_phone")
    language = booking.get("language", "sr")
    
    if contact_phone:
        # SMS for driver assignment
        if "assigned_driver" in update_dict and update_dict["assigned_driver"] and not old_driver:
            driver_name = update_dict.get("assigned_driver_name", "")
            vehicle_info = ""
            if new_driver:
                driver_status = await db.driver_status.find_one({"driver_id": new_driver})
                if driver_status and driver_status.get("vehicle_info"):
                    vehicle_info = driver_status.get("vehicle_info", {}).get("registration", "")
            
            sms_message = SMSTemplates.driver_assigned(
                booking.get("patient_name", ""),
                driver_name,
                vehicle_info,
                language
            )
            await send_sms_notification(contact_phone, sms_message, booking_id)
        
        # SMS for status changes
        if "status" in update_dict:
            new_status = update_dict["status"]
            if new_status == "confirmed":
                pickup_time = booking.get("pickup_time", booking.get("pickup_datetime", ""))
                if pickup_time and isinstance(pickup_time, str):
                    pickup_time = pickup_time.split("T")[-1][:5] if "T" in pickup_time else pickup_time
                sms_message = SMSTemplates.booking_confirmation(
                    booking.get("patient_name", ""),
                    booking.get("booking_date", ""),
                    pickup_time or "TBD",
                    language
                )
                await send_sms_notification(contact_phone, sms_message, booking_id)
            
            elif new_status == "in_transit":
                sms_message = SMSTemplates.driver_arriving(15, language)
                await send_sms_notification(contact_phone, sms_message, booking_id)
            
            elif new_status == "completed":
                sms_message = SMSTemplates.transport_completed(language)
                await send_sms_notification(contact_phone, sms_message, booking_id)
    
    return BookingResponse(**booking)


@router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Delete a booking"""
    await db.bookings.delete_one({"id": booking_id})
    return {"success": True}


# ============ PATIENT PORTAL ROUTES ============

@router.get("/patient/transport-reasons")
async def get_transport_reasons(language: str = "sr"):
    """Get transport reasons for booking form dropdown"""
    return TRANSPORT_REASONS.get(language, TRANSPORT_REASONS["sr"])


@router.get("/patient/dashboard")
async def get_patient_dashboard(user: dict = Depends(get_current_user)):
    """Get patient dashboard data"""
    user_id = user["id"]
    
    profile = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    active_booking = await db.patient_bookings.find_one(
        {"user_id": user_id, "status": {"$nin": ["completed", "cancelled"]}},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    total_bookings = await db.patient_bookings.count_documents({"user_id": user_id})
    unread_notifications = await db.notifications.count_documents({"user_id": user_id, "is_read": False})
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


@router.post("/patient/bookings", response_model=PatientBookingResponse)
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


@router.get("/patient/bookings")
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


@router.get("/patient/bookings/{booking_id}")
async def get_patient_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Get a specific patient booking"""
    booking = await db.patient_bookings.find_one(
        {"id": booking_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.post("/patient/bookings/{booking_id}/cancel")
async def cancel_patient_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Cancel a patient booking"""
    booking = await db.patient_bookings.find_one({"id": booking_id, "user_id": user["id"]})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] not in [BookingStatus.REQUESTED, BookingStatus.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Cannot cancel booking that is already in progress")
    
    # Reset driver status if assigned
    assigned_driver_id = booking.get("assigned_driver_id")
    if assigned_driver_id:
        await db.driver_status.update_one(
            {"driver_id": assigned_driver_id, "current_booking_id": booking_id},
            {"$set": {
                "status": DriverStatus.AVAILABLE,
                "current_booking_id": None,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": BookingStatus.CANCELLED, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
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


@router.get("/patient/invoices")
async def get_patient_invoices(user: dict = Depends(get_current_user)):
    """Get patient's invoices"""
    invoices = await db.invoices.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return invoices


@router.get("/patient/invoices/{invoice_id}")
async def get_patient_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one(
        {"id": invoice_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.get("/patient/profile")
async def get_patient_profile(user: dict = Depends(get_current_user)):
    """Get patient profile"""
    from models import PatientProfileUpdate
    profile = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return profile


@router.put("/patient/profile")
async def update_patient_profile(profile_data, user: dict = Depends(get_current_user)):
    """Update patient profile"""
    from models import PatientProfileUpdate
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


@router.get("/patient/notifications")
async def get_patient_notifications(user: dict = Depends(get_current_user), limit: int = 50):
    """Get patient's notifications"""
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return notifications


@router.post("/patient/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"success": True}


@router.post("/patient/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"success": True}


# ============ ADMIN PATIENT BOOKINGS ============

@router.get("/admin/patient-bookings")
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


@router.get("/admin/patient-bookings/new-count")
async def get_new_bookings_count(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER])),
    since: Optional[str] = None
):
    """Get count of new bookings since a given timestamp"""
    query = {"status": BookingStatus.REQUESTED}
    if since:
        query["created_at"] = {"$gt": since}
    
    count = await db.patient_bookings.count_documents(query)
    
    latest = await db.patient_bookings.find_one(
        {"status": BookingStatus.REQUESTED},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    return {
        "count": count,
        "latest": latest
    }


@router.put("/admin/patient-bookings/{booking_id}/status")
async def update_patient_booking_status(
    booking_id: str,
    status: str = Query(..., description="New status"),
    driver_id: Optional[str] = Query(None, description="Driver ID"),
    vehicle_id: Optional[str] = Query(None, description="Vehicle ID"),
    notes: Optional[str] = Query(None, description="Notes"),
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Update patient booking status"""
    booking = await db.patient_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    old_driver = booking.get("assigned_driver_id")
    
    # Reset old driver status if changing driver or cancelling
    if old_driver and (status in ["cancelled", "completed"] or (driver_id and driver_id != old_driver)):
        await db.driver_status.update_one(
            {"driver_id": old_driver, "current_booking_id": booking_id},
            {"$set": {
                "status": DriverStatus.AVAILABLE,
                "current_booking_id": None,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    if driver_id:
        driver = await db.users.find_one({"id": driver_id})
        update_data["assigned_driver_id"] = driver_id
        update_data["assigned_driver_name"] = driver.get("full_name") if driver else None
    
    if vehicle_id:
        vehicle = await db.vehicles.find_one({"id": vehicle_id})
        update_data["assigned_vehicle_id"] = vehicle_id
        update_data["assigned_vehicle_name"] = vehicle.get("name") if vehicle else None
    
    if notes:
        update_data["admin_notes"] = notes
    
    await db.patient_bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    # Create notification for patient
    patient_user_id = booking.get("user_id")
    if patient_user_id:
        status_messages = {
            "confirmed": ("Rezervacija potvrđena", "Booking Confirmed", "Vaša rezervacija je potvrđena.", "Your booking has been confirmed."),
            "en_route": ("Vozilo na putu", "Vehicle En Route", "Naše vozilo je krenulo po vas.", "Our vehicle is on its way to pick you up."),
            "completed": ("Transport završen", "Transport Completed", "Vaš transport je uspešno završen.", "Your transport has been completed successfully."),
            "cancelled": ("Rezervacija otkazana", "Booking Cancelled", "Vaša rezervacija je otkazana.", "Your booking has been cancelled.")
        }
        
        if status in status_messages:
            msg = status_messages[status]
            await create_notification(patient_user_id, "status_update", msg[0], msg[1], msg[2], msg[3], booking_id)
    
    updated = await db.patient_bookings.find_one({"id": booking_id}, {"_id": 0})
    return updated


@router.get("/admin/bookings-for-invoice")
async def get_bookings_for_invoice(
    patient_name: Optional[str] = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get completed bookings without invoices for invoice creation"""
    query = {
        "status": "completed",
        "invoice_id": {"$exists": False}
    }
    
    if patient_name:
        query["patient_name"] = {"$regex": patient_name, "$options": "i"}
    
    bookings = await db.patient_bookings.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return bookings



# ============ ADMIN INVOICES ============

@router.post("/admin/invoices")
async def create_invoice(
    booking_id: str,
    amount: float,
    service_description: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create invoice for a completed booking"""
    from datetime import timedelta
    
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
        "user_id": booking.get("user_id"),
        "patient_name": booking.get("patient_name"),
        "patient_email": booking.get("contact_email"),
        "service_type": "medical_transport",
        "service_date": booking.get("preferred_date"),
        "service_description": service_description,
        "pickup_address": booking.get("pickup_address"),
        "destination_address": booking.get("destination_address"),
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
    
    # Notify patient if user_id exists
    if booking.get("user_id"):
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


@router.get("/admin/invoices")
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


@router.put("/admin/invoices/{invoice_id}/status")
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
