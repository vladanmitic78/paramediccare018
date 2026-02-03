"""
Booking routes for Paramedic Care 018
Handles public bookings, SMS/email notifications, rejections, ETA updates
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from config import db, TRANSPORT_EMAIL, MEDICAL_EMAIL, logger
from models import (
    UserRole, BookingCreate, BookingResponse, BookingFullUpdate, DriverStatus
)
from utils.auth import get_current_user, get_optional_user, require_roles
from utils.email import send_email, get_internal_notification_template
from services.sms_service import SMSTemplates
from routes.notifications import send_sms_notification, send_booking_email_notification

router = APIRouter(tags=["Bookings"])


# ============ PYDANTIC MODELS ============

class BookingRejectionRequest(BaseModel):
    reason_code: str
    reason_label: str
    notes: Optional[str] = None


# ============ BOOKING CRUD ============

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
    
    # Send confirmation email to customer using new template system
    await send_booking_email_notification(booking_doc, "booking_confirmation")
    
    # Send SMS confirmation to customer
    if booking.contact_phone:
        sms_message = SMSTemplates.booking_confirmation(
            booking.patient_name,
            booking.booking_date,
            booking.pickup_time or "TBD",
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
    """Get a specific booking by ID"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse(**booking)


@router.put("/bookings/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: str, 
    update: BookingFullUpdate, 
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER, UserRole.DOCTOR, UserRole.NURSE]))
):
    """Update a booking - handles driver assignment, status changes, and notifications"""
    # Get booking to check for assigned driver
    existing_booking = await db.bookings.find_one({"id": booking_id})
    if not existing_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Build update document with only provided fields
    update_doc = {}
    update_dict = update.model_dump(exclude_unset=True)
    
    # Fields that can be explicitly set to None (for detaching driver)
    nullable_fields = ['assigned_driver', 'assigned_driver_name', 'assigned_medical']
    
    for key, value in update_dict.items():
        if key in nullable_fields:
            update_doc[key] = value
        elif value is not None:
            update_doc[key] = value
    
    if not update_doc:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Add update timestamp
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Reset driver status if driver is being removed or booking is cancelled/completed
    old_driver = existing_booking.get("assigned_driver")
    new_driver = update_dict.get("assigned_driver", old_driver)
    
    # If driver is being detached (set to None) or booking is cancelled/completed
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
    
    # Send SMS and EMAIL notifications based on changes
    contact_phone = booking.get("contact_phone")
    language = booking.get("language", "sr")
    
    if contact_phone:
        # SMS for driver assignment
        if "assigned_driver" in update_dict and update_dict["assigned_driver"] and not old_driver:
            driver_name = update_dict.get("assigned_driver_name", "")
            # Get vehicle info if available
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
            
            # Also send email notification for driver assignment
            await send_booking_email_notification(booking, "driver_assigned", {
                "driver_name": driver_name,
                "vehicle_info": vehicle_info
            })
        
        # SMS for status changes
        if "status" in update_dict:
            new_status = update_dict["status"]
            if new_status == "confirmed":
                # Booking confirmed SMS
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
                # Driver is on the way - SMS and Email
                sms_message = SMSTemplates.driver_arriving(15, language)
                await send_sms_notification(contact_phone, sms_message, booking_id)
                
                # Get driver info for email
                driver_name = booking.get("assigned_driver_name", "")
                vehicle_info = ""
                if booking.get("assigned_driver"):
                    ds = await db.driver_status.find_one({"driver_id": booking.get("assigned_driver")})
                    if ds and ds.get("vehicle_info"):
                        vehicle_info = ds.get("vehicle_info", {}).get("registration", "")
                
                await send_booking_email_notification(booking, "driver_arriving", {
                    "eta_minutes": 15,
                    "driver_name": driver_name,
                    "vehicle_info": vehicle_info
                })
            
            elif new_status == "completed":
                # Transport completed - SMS and Email
                sms_message = SMSTemplates.transport_completed(language)
                await send_sms_notification(contact_phone, sms_message, booking_id)
                
                await send_booking_email_notification(booking, "transport_completed")
    
    return BookingResponse(**booking)


@router.delete("/bookings/{booking_id}")
async def delete_booking(
    booking_id: str, 
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Delete a booking"""
    await db.bookings.delete_one({"id": booking_id})
    return {"success": True}


# ============ BOOKING SMS ============

@router.post("/bookings/{booking_id}/send-sms")
async def send_booking_sms(
    booking_id: str,
    message_type: str = "reminder",
    custom_message: str = None,
    eta_minutes: int = 15,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER]))
):
    """Send SMS to booking contact"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    contact_phone = booking.get("contact_phone")
    if not contact_phone:
        raise HTTPException(status_code=400, detail="No contact phone number")
    
    language = booking.get("language", "sr")
    patient_name = booking.get("patient_name", "")
    pickup_time = booking.get("pickup_time", booking.get("pickup_datetime", ""))
    if pickup_time and isinstance(pickup_time, str) and "T" in pickup_time:
        pickup_time = pickup_time.split("T")[-1][:5]
    
    # Determine message based on type
    if message_type == "reminder":
        message = SMSTemplates.pickup_reminder(patient_name, pickup_time or "uskoro", language)
    elif message_type == "driver_arriving":
        message = SMSTemplates.driver_arriving(eta_minutes, language)
    elif message_type == "custom" and custom_message:
        message = custom_message
    else:
        raise HTTPException(status_code=400, detail="Invalid message type or missing custom message")
    
    result = await send_sms_notification(contact_phone, message, booking_id)
    
    return {
        "success": result.success,
        "message_id": result.message_id,
        "error": result.error,
        "phone": contact_phone,
        "message_sent": message
    }


# ============ BOOKING REJECTION ============

@router.post("/bookings/{booking_id}/reject")
async def reject_booking_assignment(
    booking_id: str,
    rejection: BookingRejectionRequest,
    user: dict = Depends(require_roles([UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Driver rejects/declines a booking assignment - returns it to unassigned"""
    # Find booking
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        booking = await db.patient_bookings.find_one({"id": booking_id})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Only assigned bookings can be rejected by drivers
    if user.get("role") == "driver":
        if booking.get("assigned_driver") != user["id"]:
            raise HTTPException(status_code=403, detail="You are not assigned to this booking")
    
    # Store rejection record
    rejection_record = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "rejected_by": user["id"],
        "rejected_by_name": user.get("full_name", "Unknown"),
        "rejected_at": datetime.now(timezone.utc).isoformat(),
        "reason_code": rejection.reason_code,
        "reason_label": rejection.reason_label,
        "notes": rejection.notes,
        "previous_driver": booking.get("assigned_driver"),
        "previous_driver_name": booking.get("assigned_driver_name")
    }
    await db.booking_rejections.insert_one(rejection_record)
    
    # Update booking - remove driver assignment and revert to pending/confirmed
    collection = db.bookings if await db.bookings.find_one({"id": booking_id}) else db.patient_bookings
    
    update_data = {
        "assigned_driver": None,
        "assigned_driver_name": None,
        "vehicle_id": None,
        "status": "pending" if booking.get("status") in ["assigned", "confirmed"] else booking.get("status"),
        "rejection_count": (booking.get("rejection_count", 0) or 0) + 1,
        "last_rejection": rejection_record,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await collection.update_one({"id": booking_id}, {"$set": update_data})
    
    # Log the rejection
    logger.info(f"Booking {booking_id} rejected by {user.get('full_name')} - Reason: {rejection.reason_label}")
    
    # Notify admin about rejection
    internal_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #dc2626;">⚠️ Vožnja odbijena od strane vozača</h2>
        <table style="border-collapse: collapse; margin-top: 20px;">
            <tr>
                <td style="padding: 8px; font-weight: bold;">Pacijent:</td>
                <td style="padding: 8px;">{booking.get('patient_name')}</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold;">Datum:</td>
                <td style="padding: 8px;">{booking.get('booking_date')} {booking.get('pickup_time', '')}</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold;">Vozač:</td>
                <td style="padding: 8px;">{user.get('full_name')}</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold;">Razlog:</td>
                <td style="padding: 8px; color: #dc2626;">{rejection.reason_label}</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold;">Napomena:</td>
                <td style="padding: 8px;">{rejection.notes or '-'}</td>
            </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">
            Rezervacija je vraćena na listu nedodeljenih i čeka novog vozača.
        </p>
    </body>
    </html>
    """
    await send_email(TRANSPORT_EMAIL, f"⚠️ Vožnja odbijena - {booking.get('patient_name')}", internal_body)
    
    return {
        "success": True,
        "message": "Booking rejected successfully",
        "booking_id": booking_id,
        "rejection_id": rejection_record["id"]
    }


@router.get("/bookings/{booking_id}/rejections")
async def get_booking_rejections(
    booking_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get rejection history for a booking"""
    rejections = await db.booking_rejections.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("rejected_at", -1).to_list(50)
    
    return rejections
