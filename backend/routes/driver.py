"""
Driver App routes - /driver/*, /admin/drivers, /admin/assign-driver*
Handles: Driver profile, status, location, assignments, WebSocket connections
"""
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
from typing import List, Optional, Tuple
import uuid

from config import db, logger
from models import (
    UserRole, BookingStatus, DriverStatus,
    DriverLocationUpdate, DriverStatusUpdate
)
from utils.auth import get_current_user, require_roles

router = APIRouter(tags=["Driver"])


# ============ HELPER FUNCTIONS ============

async def is_driver_available_for_booking(driver_id: str, target_booking_id: str = None) -> Tuple[bool, str, list]:
    """
    Check if driver is available for assignment.
    Returns (is_available, reason, conflicting_bookings)
    """
    driver_status = await db.driver_status.find_one({"driver_id": driver_id})
    
    if not driver_status:
        return True, "No status entry", []
    
    status = driver_status.get("status")
    
    if status in [DriverStatus.OFFLINE, DriverStatus.AVAILABLE, None]:
        return True, "Status is available", []
    
    if status in [DriverStatus.EN_ROUTE, DriverStatus.ON_SITE, DriverStatus.TRANSPORTING]:
        return False, "Driver is actively on a transport", []
    
    if status == DriverStatus.ASSIGNED:
        current_booking_id = driver_status.get("current_booking_id")
        
        if not current_booking_id:
            return True, "Assigned but no booking ID", []
        
        assigned_booking = await db.bookings.find_one({"id": current_booking_id})
        if not assigned_booking:
            assigned_booking = await db.patient_bookings.find_one({"id": current_booking_id})
        
        if not assigned_booking:
            return True, "Assigned booking not found", []
        
        booking_status = assigned_booking.get("status")
        
        if booking_status in ["en_route", "on_site", "transporting"]:
            return False, f"Driver is on active transport (status: {booking_status})", []
        
        if booking_status == "confirmed":
            booking_date = assigned_booking.get("booking_date") or assigned_booking.get("preferred_date")
            
            if booking_date:
                from datetime import date
                today = date.today().isoformat()
                
                if booking_date != today:
                    return True, f"Assigned booking is for {booking_date}, not today", []
                
                return True, "Assigned to confirmed booking, allowing new assignment", []
        
        if booking_status in ["completed", "cancelled", "pending"]:
            return True, f"Assigned booking status is {booking_status}", []
    
    return True, f"Default allow for status: {status}", []


async def get_driver_conflicts(driver_id: str, target_date: str, target_time: str = None) -> list:
    """Get all bookings that may conflict with a new assignment."""
    conflicts = []
    
    query = {
        "$or": [
            {"assigned_driver": driver_id},
            {"assigned_driver_id": driver_id}
        ],
        "status": {"$in": ["confirmed", "en_route", "on_site", "transporting"]}
    }
    
    public_bookings = await db.bookings.find(query, {"_id": 0}).to_list(100)
    for b in public_bookings:
        booking_date = b.get("booking_date") or b.get("preferred_date")
        if booking_date == target_date:
            conflicts.append({
                "id": b.get("id"),
                "patient_name": b.get("patient_name"),
                "booking_date": booking_date,
                "booking_time": b.get("booking_time") or b.get("preferred_time"),
                "status": b.get("status"),
                "pickup": b.get("start_point") or b.get("pickup_address")
            })
    
    patient_bookings = await db.patient_bookings.find(query, {"_id": 0}).to_list(100)
    for b in patient_bookings:
        booking_date = b.get("preferred_date") or b.get("booking_date")
        if booking_date == target_date:
            conflicts.append({
                "id": b.get("id"),
                "patient_name": b.get("patient_name"),
                "booking_date": booking_date,
                "booking_time": b.get("preferred_time") or b.get("booking_time"),
                "status": b.get("status"),
                "pickup": b.get("pickup_address") or b.get("start_point")
            })
    
    return conflicts


# Import WebSocket manager (will be set from server.py)
manager = None

def set_websocket_manager(ws_manager):
    """Set the WebSocket manager from main server"""
    global manager
    manager = ws_manager


# ============ DRIVER PROFILE & STATUS ============

@router.get("/driver/profile")
async def get_driver_profile(user: dict = Depends(require_roles([UserRole.DRIVER]))):
    """Get driver profile with current status"""
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]}, {"_id": 0})
    if not driver_status:
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


@router.put("/driver/status")
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
    
    if status_update.status == DriverStatus.AVAILABLE:
        update_data["current_booking_id"] = None
    
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": update_data},
        upsert=True
    )
    
    # Update booking status if applicable
    if status_update.booking_id and status_update.status in [DriverStatus.EN_ROUTE, DriverStatus.ON_SITE, DriverStatus.TRANSPORTING]:
        booking_status_map = {
            DriverStatus.EN_ROUTE: "en_route",
            DriverStatus.ON_SITE: "on_site",
            DriverStatus.TRANSPORTING: "transporting"
        }
        new_booking_status = booking_status_map.get(status_update.status)
        if new_booking_status:
            await db.bookings.update_one(
                {"id": status_update.booking_id},
                {"$set": {"status": new_booking_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            await db.patient_bookings.update_one(
                {"id": status_update.booking_id},
                {"$set": {"status": new_booking_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
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
    if manager:
        await manager.broadcast_to_admins({
            "type": "driver_status_update",
            "driver_id": user["id"],
            "driver_name": user.get("full_name"),
            "status": status_update.status,
            "booking_id": status_update.booking_id
        })
    
    return {"success": True, "status": status_update.status}


@router.post("/driver/location")
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
    
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "last_location": location_data,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    if driver_status and driver_status.get("current_booking_id"):
        await db.location_history.insert_one({
            "driver_id": user["id"],
            "booking_id": driver_status["current_booking_id"],
            **location_data
        })
    
    if manager:
        await manager.broadcast_to_admins({
            "type": "location_update",
            "driver_id": user["id"],
            "driver_name": user.get("full_name"),
            "location": location_data,
            "status": driver_status.get("status") if driver_status else DriverStatus.AVAILABLE,
            "booking_id": driver_status.get("current_booking_id") if driver_status else None
        })
    
    return {"success": True}


# ============ DRIVER ASSIGNMENTS ============

@router.get("/driver/assignment")
async def get_driver_assignment(user: dict = Depends(require_roles([UserRole.DRIVER]))):
    """Get driver's current assignment"""
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    
    if not driver_status or not driver_status.get("current_booking_id"):
        assigned_booking = await db.patient_bookings.find_one({
            "assigned_driver_id": user["id"],
            "status": {"$in": [BookingStatus.CONFIRMED, BookingStatus.EN_ROUTE, BookingStatus.PICKED_UP]}
        }, {"_id": 0})
        
        if not assigned_booking:
            assigned_booking = await db.bookings.find_one({
                "assigned_driver": user["id"],
                "status": {"$in": ["confirmed", "en_route", "picked_up"]}
            }, {"_id": 0})
        
        if assigned_booking:
            return {"assignment": assigned_booking, "has_assignment": True}
        return {"assignment": None, "has_assignment": False}
    
    booking = await db.patient_bookings.find_one(
        {"id": driver_status["current_booking_id"]},
        {"_id": 0}
    )
    
    if not booking:
        booking = await db.bookings.find_one(
            {"id": driver_status["current_booking_id"]},
            {"_id": 0}
        )
    
    return {"assignment": booking, "has_assignment": booking is not None}


@router.post("/driver/accept-assignment/{booking_id}")
async def accept_assignment(
    booking_id: str,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Driver accepts an assignment"""
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    if not driver_status or driver_status.get("current_booking_id") != booking_id:
        raise HTTPException(status_code=400, detail="No matching assignment found")
    
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "status": DriverStatus.EN_ROUTE,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "en_route",
            "driver_accepted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "en_route",
            "driver_accepted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    booking = await db.patient_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
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
    
    if manager:
        await manager.broadcast_to_admins({
            "type": "driver_accepted",
            "driver_id": user["id"],
            "driver_name": user.get("full_name"),
            "booking_id": booking_id
        })
    
    return {"success": True, "message": "Assignment accepted", "new_status": "en_route"}


@router.post("/driver/reject-assignment/{booking_id}")
async def reject_assignment(
    booking_id: str,
    reason: str = None,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Driver rejects an assignment"""
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    if not driver_status or driver_status.get("current_booking_id") != booking_id:
        raise HTTPException(status_code=400, detail="No matching assignment found")
    
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "status": DriverStatus.AVAILABLE,
            "current_booking_id": None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
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
    
    if manager:
        await manager.broadcast_to_admins({
            "type": "driver_rejected",
            "driver_id": user["id"],
            "driver_name": user.get("full_name"),
            "booking_id": booking_id,
            "reason": reason
        })
    
    return {"success": True, "message": "Assignment rejected"}


@router.post("/driver/complete-transport/{booking_id}")
async def complete_transport(
    booking_id: str,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Mark transport as completed"""
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "status": DriverStatus.AVAILABLE,
            "current_booking_id": None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
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
    
    if manager:
        await manager.broadcast_to_admins({
            "type": "transport_completed",
            "driver_id": user["id"],
            "driver_name": user.get("full_name"),
            "booking_id": booking_id
        })
    
    return {"success": True, "message": "Transport completed"}


# ============ ADMIN DRIVER MANAGEMENT ============

@router.post("/admin/assign-driver")
async def assign_driver_to_booking(
    booking_id: str,
    driver_id: str,
    force: bool = False,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Assign a driver to a patient booking"""
    # First check if user has driver role in users collection
    driver = await db.users.find_one({"id": driver_id, "role": UserRole.DRIVER})
    
    # If not found as driver, check if they're assigned as driver in any vehicle team
    if not driver:
        team_assignment = await db.vehicle_teams.find_one({
            "user_id": driver_id, 
            "role": "driver",
            "is_active": True
        })
        if team_assignment:
            # User is assigned as driver in a vehicle team, get their user record
            driver = await db.users.find_one({"id": driver_id})
    
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    is_available, reason, _ = await is_driver_available_for_booking(driver_id, booking_id)
    if not is_available:
        raise HTTPException(status_code=400, detail=f"Driver is not available: {reason}")
    
    target_booking = await db.patient_bookings.find_one({"id": booking_id})
    if not target_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    target_date = target_booking.get("preferred_date") or target_booking.get("booking_date")
    target_time = target_booking.get("preferred_time") or target_booking.get("booking_time")
    
    if not force and target_date:
        conflicts = await get_driver_conflicts(driver_id, target_date, target_time)
        conflicts = [c for c in conflicts if c["id"] != booking_id]
        
        if conflicts:
            return {
                "success": False,
                "warning": True,
                "message": f"Driver has {len(conflicts)} other booking(s) on {target_date}",
                "conflicts": conflicts,
                "require_confirmation": True
            }
    
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "assigned_driver_id": driver_id,
            "assigned_driver_name": driver.get("full_name"),
            "status": BookingStatus.CONFIRMED,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.driver_status.update_one(
        {"driver_id": driver_id},
        {"$set": {
            "status": DriverStatus.ASSIGNED,
            "current_booking_id": booking_id,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    booking = await db.patient_bookings.find_one({"id": booking_id}, {"_id": 0})
    if manager:
        await manager.send_to_driver(driver_id, {
            "type": "new_assignment",
            "booking": booking
        })
    
    return {"success": True, "message": "Driver assigned"}


@router.post("/admin/assign-driver-public")
async def assign_driver_to_public_booking(
    booking_id: str,
    driver_id: str,
    force: bool = False,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Assign a driver to a public booking"""
    # First check if user has driver role in users collection
    driver = await db.users.find_one({"id": driver_id, "role": UserRole.DRIVER})
    
    # If not found as driver, check if they're assigned as driver in any vehicle team
    if not driver:
        team_assignment = await db.vehicle_teams.find_one({
            "user_id": driver_id, 
            "role": "driver",
            "is_active": True
        })
        if team_assignment:
            # User is assigned as driver in a vehicle team, get their user record
            driver = await db.users.find_one({"id": driver_id})
    
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    is_available, reason, _ = await is_driver_available_for_booking(driver_id, booking_id)
    if not is_available:
        raise HTTPException(status_code=400, detail=f"Driver is not available: {reason}")
    
    target_booking = await db.bookings.find_one({"id": booking_id})
    if not target_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    target_date = target_booking.get("booking_date") or target_booking.get("preferred_date")
    target_time = target_booking.get("booking_time") or target_booking.get("preferred_time")
    
    if not force and target_date:
        conflicts = await get_driver_conflicts(driver_id, target_date, target_time)
        conflicts = [c for c in conflicts if c["id"] != booking_id]
        
        if conflicts:
            return {
                "success": False,
                "warning": True,
                "message": f"Driver has {len(conflicts)} other booking(s) on {target_date}",
                "conflicts": conflicts,
                "require_confirmation": True
            }
    
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
    
    await db.driver_status.update_one(
        {"driver_id": driver_id},
        {"$set": {
            "status": DriverStatus.ASSIGNED,
            "current_booking_id": booking_id,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    if manager:
        await manager.send_to_driver(driver_id, {
            "type": "new_assignment",
            "booking": booking
        })
    
    return {"success": True, "message": "Driver assigned to public booking"}


@router.get("/admin/drivers")
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
