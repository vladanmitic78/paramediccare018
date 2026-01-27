"""
Vehicle Schedule routes - /fleet/schedules/*
Timeline-Based Vehicle Scheduling System - Phase 1
Handles: Schedule CRUD, Availability queries, Conflict detection
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import uuid

from config import db, logger
from models import (
    UserRole, ScheduleStatus,
    VehicleScheduleCreate, VehicleScheduleUpdate, VehicleScheduleResponse,
    AvailabilityQuery, TimeSlot, VehicleAvailability, ScheduleConflict
)
from utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/fleet/schedules", tags=["Vehicle Schedules"])

# Default schedule duration in hours
DEFAULT_SCHEDULE_DURATION_HOURS = 2


# ============ HELPER FUNCTIONS ============

def parse_datetime(dt_string: str) -> datetime:
    """Parse ISO datetime string to datetime object"""
    try:
        # Handle various formats
        if 'T' in dt_string:
            if dt_string.endswith('Z'):
                return datetime.fromisoformat(dt_string.replace('Z', '+00:00'))
            return datetime.fromisoformat(dt_string)
        # If just a date, assume start of day
        return datetime.fromisoformat(f"{dt_string}T00:00:00+00:00")
    except Exception as e:
        logger.error(f"Error parsing datetime {dt_string}: {e}")
        raise ValueError(f"Invalid datetime format: {dt_string}")


def datetime_to_iso(dt: datetime) -> str:
    """Convert datetime to ISO string"""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


async def enrich_schedule(schedule: dict) -> dict:
    """Enrich schedule with vehicle, driver, and booking details"""
    result = {**schedule}
    
    # Get vehicle name
    if schedule.get("vehicle_id"):
        vehicle = await db.vehicles.find_one(
            {"id": schedule["vehicle_id"]},
            {"_id": 0, "name": 1}
        )
        result["vehicle_name"] = vehicle.get("name") if vehicle else None
    
    # Get driver name
    if schedule.get("driver_id"):
        driver = await db.users.find_one(
            {"id": schedule["driver_id"]},
            {"_id": 0, "full_name": 1}
        )
        result["driver_name"] = driver.get("full_name") if driver else None
    
    # Get booking details
    if schedule.get("booking_id"):
        booking_type = schedule.get("booking_type", "patient_booking")
        collection = db.patient_bookings if booking_type == "patient_booking" else db.bookings
        
        booking = await collection.find_one(
            {"id": schedule["booking_id"]},
            {"_id": 0, "patient_name": 1, "pickup_address": 1, "destination_address": 1,
             "start_point": 1, "end_point": 1}
        )
        if booking:
            result["patient_name"] = booking.get("patient_name")
            result["pickup_address"] = booking.get("pickup_address") or booking.get("start_point")
            result["destination_address"] = booking.get("destination_address") or booking.get("end_point")
    
    return result


async def check_conflicts(
    vehicle_id: str,
    start_time: datetime,
    end_time: datetime,
    exclude_schedule_id: Optional[str] = None,
    driver_id: Optional[str] = None
) -> ScheduleConflict:
    """Check for scheduling conflicts for a vehicle and optionally a driver"""
    conflicts = []
    
    # Build query for vehicle conflicts
    query = {
        "vehicle_id": vehicle_id,
        "status": {"$in": [ScheduleStatus.SCHEDULED, ScheduleStatus.IN_PROGRESS]},
        "$or": [
            # New schedule starts during existing schedule
            {"start_time": {"$lte": datetime_to_iso(start_time)}, 
             "end_time": {"$gt": datetime_to_iso(start_time)}},
            # New schedule ends during existing schedule
            {"start_time": {"$lt": datetime_to_iso(end_time)}, 
             "end_time": {"$gte": datetime_to_iso(end_time)}},
            # New schedule completely contains existing schedule
            {"start_time": {"$gte": datetime_to_iso(start_time)}, 
             "end_time": {"$lte": datetime_to_iso(end_time)}}
        ]
    }
    
    if exclude_schedule_id:
        query["id"] = {"$ne": exclude_schedule_id}
    
    vehicle_conflicts = await db.vehicle_schedules.find(query, {"_id": 0}).to_list(100)
    
    for conflict in vehicle_conflicts:
        enriched = await enrich_schedule(conflict)
        conflicts.append(VehicleScheduleResponse(**enriched))
    
    # Check driver conflicts if driver_id provided
    if driver_id:
        driver_query = {
            "driver_id": driver_id,
            "status": {"$in": [ScheduleStatus.SCHEDULED, ScheduleStatus.IN_PROGRESS]},
            "$or": [
                {"start_time": {"$lte": datetime_to_iso(start_time)}, 
                 "end_time": {"$gt": datetime_to_iso(start_time)}},
                {"start_time": {"$lt": datetime_to_iso(end_time)}, 
                 "end_time": {"$gte": datetime_to_iso(end_time)}},
                {"start_time": {"$gte": datetime_to_iso(start_time)}, 
                 "end_time": {"$lte": datetime_to_iso(end_time)}}
            ]
        }
        
        if exclude_schedule_id:
            driver_query["id"] = {"$ne": exclude_schedule_id}
        
        driver_conflicts = await db.vehicle_schedules.find(driver_query, {"_id": 0}).to_list(100)
        
        for conflict in driver_conflicts:
            # Avoid duplicates (same schedule already in vehicle conflicts)
            if not any(c.id == conflict["id"] for c in conflicts):
                enriched = await enrich_schedule(conflict)
                conflicts.append(VehicleScheduleResponse(**enriched))
    
    has_conflict = len(conflicts) > 0
    message = None
    if has_conflict:
        message = f"Found {len(conflicts)} conflicting schedule(s)"
    
    return ScheduleConflict(
        has_conflict=has_conflict,
        conflicting_schedules=conflicts,
        message=message
    )


# ============ CRUD ENDPOINTS ============

@router.get("")
async def get_schedules(
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    vehicle_id: Optional[str] = Query(None, description="Filter by vehicle"),
    driver_id: Optional[str] = Query(None, description="Filter by driver"),
    status: Optional[str] = Query(None, description="Filter by status"),
    user: dict = Depends(get_current_user)
) -> List[VehicleScheduleResponse]:
    """Get all schedules with optional filters"""
    query = {}
    
    if date:
        # Filter schedules that overlap with the given date
        day_start = f"{date}T00:00:00"
        day_end = f"{date}T23:59:59"
        query["$or"] = [
            {"start_time": {"$gte": day_start, "$lte": day_end}},
            {"end_time": {"$gte": day_start, "$lte": day_end}},
            {"start_time": {"$lte": day_start}, "end_time": {"$gte": day_end}}
        ]
    
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    
    if driver_id:
        query["driver_id"] = driver_id
    
    if status:
        query["status"] = status
    else:
        # By default, exclude cancelled
        query["status"] = {"$ne": ScheduleStatus.CANCELLED}
    
    schedules = await db.vehicle_schedules.find(query, {"_id": 0}).sort("start_time", 1).to_list(500)
    
    result = []
    for schedule in schedules:
        enriched = await enrich_schedule(schedule)
        result.append(VehicleScheduleResponse(**enriched))
    
    return result


@router.get("/vehicle/{vehicle_id}")
async def get_vehicle_schedules(
    vehicle_id: str,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    include_cancelled: bool = Query(False, description="Include cancelled schedules"),
    user: dict = Depends(get_current_user)
) -> List[VehicleScheduleResponse]:
    """Get all schedules for a specific vehicle"""
    # Verify vehicle exists
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    query = {"vehicle_id": vehicle_id}
    
    if date:
        day_start = f"{date}T00:00:00"
        day_end = f"{date}T23:59:59"
        query["$or"] = [
            {"start_time": {"$gte": day_start, "$lte": day_end}},
            {"end_time": {"$gte": day_start, "$lte": day_end}},
            {"start_time": {"$lte": day_start}, "end_time": {"$gte": day_end}}
        ]
    
    if not include_cancelled:
        query["status"] = {"$ne": ScheduleStatus.CANCELLED}
    
    schedules = await db.vehicle_schedules.find(query, {"_id": 0}).sort("start_time", 1).to_list(100)
    
    result = []
    for schedule in schedules:
        enriched = await enrich_schedule(schedule)
        result.append(VehicleScheduleResponse(**enriched))
    
    return result


@router.get("/driver/{driver_id}")
async def get_driver_schedules(
    driver_id: str,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    include_cancelled: bool = Query(False, description="Include cancelled schedules"),
    user: dict = Depends(get_current_user)
) -> List[VehicleScheduleResponse]:
    """Get all schedules for a specific driver"""
    # Verify driver exists
    driver = await db.users.find_one({"id": driver_id, "role": "driver"})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    query = {"driver_id": driver_id}
    
    if date:
        day_start = f"{date}T00:00:00"
        day_end = f"{date}T23:59:59"
        query["$or"] = [
            {"start_time": {"$gte": day_start, "$lte": day_end}},
            {"end_time": {"$gte": day_start, "$lte": day_end}},
            {"start_time": {"$lte": day_start}, "end_time": {"$gte": day_end}}
        ]
    
    if not include_cancelled:
        query["status"] = {"$ne": ScheduleStatus.CANCELLED}
    
    schedules = await db.vehicle_schedules.find(query, {"_id": 0}).sort("start_time", 1).to_list(100)
    
    result = []
    for schedule in schedules:
        enriched = await enrich_schedule(schedule)
        result.append(VehicleScheduleResponse(**enriched))
    
    return result


@router.get("/availability")
async def check_availability(
    date: str = Query(..., description="Date to check (YYYY-MM-DD)"),
    start_time: Optional[str] = Query(None, description="Start time (HH:MM)"),
    end_time: Optional[str] = Query(None, description="End time (HH:MM)"),
    vehicle_id: Optional[str] = Query(None, description="Check specific vehicle"),
    user: dict = Depends(get_current_user)
) -> List[VehicleAvailability]:
    """Check vehicle availability for a given date/time range"""
    
    # Parse time range
    if start_time:
        range_start = parse_datetime(f"{date}T{start_time}:00")
    else:
        range_start = parse_datetime(f"{date}T06:00:00")  # Default 6 AM
    
    if end_time:
        range_end = parse_datetime(f"{date}T{end_time}:00")
    else:
        range_end = parse_datetime(f"{date}T22:00:00")  # Default 10 PM
    
    # Get vehicles to check
    vehicle_query = {}
    if vehicle_id:
        vehicle_query["id"] = vehicle_id
    
    vehicles = await db.vehicles.find(vehicle_query, {"_id": 0, "id": 1, "name": 1, "status": 1}).to_list(50)
    
    result = []
    
    for vehicle in vehicles:
        # Skip out-of-service vehicles
        if vehicle.get("status") == "out_of_service":
            continue
        
        # Get schedules for this vehicle on this date
        day_start = f"{date}T00:00:00"
        day_end = f"{date}T23:59:59"
        
        schedules = await db.vehicle_schedules.find({
            "vehicle_id": vehicle["id"],
            "status": {"$in": [ScheduleStatus.SCHEDULED, ScheduleStatus.IN_PROGRESS]},
            "$or": [
                {"start_time": {"$gte": day_start, "$lte": day_end}},
                {"end_time": {"$gte": day_start, "$lte": day_end}},
                {"start_time": {"$lte": day_start}, "end_time": {"$gte": day_end}}
            ]
        }, {"_id": 0}).sort("start_time", 1).to_list(50)
        
        enriched_schedules = []
        for s in schedules:
            enriched = await enrich_schedule(s)
            enriched_schedules.append(VehicleScheduleResponse(**enriched))
        
        # Calculate available slots
        available_slots = []
        is_available_all_day = len(schedules) == 0
        
        if not is_available_all_day:
            # Find gaps between schedules
            current_time = range_start
            
            for schedule in schedules:
                sched_start = parse_datetime(schedule["start_time"])
                sched_end = parse_datetime(schedule["end_time"])
                
                # If there's a gap before this schedule
                if current_time < sched_start:
                    available_slots.append(TimeSlot(
                        start_time=datetime_to_iso(current_time),
                        end_time=datetime_to_iso(sched_start),
                        is_available=True
                    ))
                
                # Add the busy slot
                available_slots.append(TimeSlot(
                    start_time=schedule["start_time"],
                    end_time=schedule["end_time"],
                    is_available=False,
                    booking_id=schedule.get("booking_id"),
                    patient_name=enriched_schedules[schedules.index(schedule)].patient_name
                ))
                
                current_time = max(current_time, sched_end)
            
            # Add remaining time after last schedule
            if current_time < range_end:
                available_slots.append(TimeSlot(
                    start_time=datetime_to_iso(current_time),
                    end_time=datetime_to_iso(range_end),
                    is_available=True
                ))
        else:
            # Entire range is available
            available_slots.append(TimeSlot(
                start_time=datetime_to_iso(range_start),
                end_time=datetime_to_iso(range_end),
                is_available=True
            ))
        
        result.append(VehicleAvailability(
            vehicle_id=vehicle["id"],
            vehicle_name=vehicle["name"],
            date=date,
            schedules=enriched_schedules,
            available_slots=available_slots,
            is_available_all_day=is_available_all_day
        ))
    
    return result


@router.get("/conflicts")
async def check_schedule_conflicts(
    vehicle_id: str = Query(..., description="Vehicle ID"),
    start_time: str = Query(..., description="Start time (ISO format)"),
    end_time: str = Query(..., description="End time (ISO format)"),
    driver_id: Optional[str] = Query(None, description="Driver ID to also check"),
    exclude_schedule_id: Optional[str] = Query(None, description="Exclude this schedule from check"),
    user: dict = Depends(get_current_user)
) -> ScheduleConflict:
    """Check if a proposed schedule conflicts with existing schedules"""
    start = parse_datetime(start_time)
    end = parse_datetime(end_time)
    
    return await check_conflicts(
        vehicle_id=vehicle_id,
        start_time=start,
        end_time=end,
        exclude_schedule_id=exclude_schedule_id,
        driver_id=driver_id
    )


@router.post("")
async def create_schedule(
    schedule: VehicleScheduleCreate,
    force: bool = Query(False, description="Force creation even with conflicts"),
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
) -> VehicleScheduleResponse:
    """Create a new vehicle schedule entry"""
    
    # Verify vehicle exists
    vehicle = await db.vehicles.find_one({"id": schedule.vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Verify booking exists
    collection = db.patient_bookings if schedule.booking_type == "patient_booking" else db.bookings
    booking = await collection.find_one({"id": schedule.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Parse times
    start_time = parse_datetime(schedule.start_time)
    end_time = parse_datetime(schedule.end_time)
    
    if end_time <= start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    
    # Check for conflicts
    conflicts = await check_conflicts(
        vehicle_id=schedule.vehicle_id,
        start_time=start_time,
        end_time=end_time,
        driver_id=schedule.driver_id
    )
    
    if conflicts.has_conflict and not force:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Schedule conflicts detected",
                "conflicts": [c.dict() for c in conflicts.conflicting_schedules]
            }
        )
    
    # Create schedule entry
    now = datetime.now(timezone.utc).isoformat()
    schedule_id = str(uuid.uuid4())
    
    schedule_doc = {
        "id": schedule_id,
        "vehicle_id": schedule.vehicle_id,
        "booking_id": schedule.booking_id,
        "booking_type": schedule.booking_type,
        "driver_id": schedule.driver_id,
        "start_time": datetime_to_iso(start_time),
        "end_time": datetime_to_iso(end_time),
        "status": ScheduleStatus.SCHEDULED,
        "notes": schedule.notes,
        "created_at": now,
        "created_by": user["id"],
        "updated_at": now
    }
    
    await db.vehicle_schedules.insert_one(schedule_doc)
    
    # Update the booking with assigned vehicle
    update_data = {
        "assigned_vehicle_id": schedule.vehicle_id,
        "schedule_id": schedule_id
    }
    if schedule.driver_id:
        update_data["assigned_driver"] = schedule.driver_id
    
    await collection.update_one(
        {"id": schedule.booking_id},
        {"$set": update_data}
    )
    
    logger.info(f"Created schedule {schedule_id} for vehicle {schedule.vehicle_id}, booking {schedule.booking_id}")
    
    # Return enriched response
    enriched = await enrich_schedule(schedule_doc)
    return VehicleScheduleResponse(**enriched)


@router.get("/{schedule_id}")
async def get_schedule(
    schedule_id: str,
    user: dict = Depends(get_current_user)
) -> VehicleScheduleResponse:
    """Get a specific schedule by ID"""
    schedule = await db.vehicle_schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    enriched = await enrich_schedule(schedule)
    return VehicleScheduleResponse(**enriched)


@router.put("/{schedule_id}")
async def update_schedule(
    schedule_id: str,
    update: VehicleScheduleUpdate,
    force: bool = Query(False, description="Force update even with conflicts"),
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
) -> VehicleScheduleResponse:
    """Update a schedule entry"""
    
    schedule = await db.vehicle_schedules.find_one({"id": schedule_id})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Build update data
    update_data = {}
    
    if update.vehicle_id is not None:
        vehicle = await db.vehicles.find_one({"id": update.vehicle_id})
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        update_data["vehicle_id"] = update.vehicle_id
    
    if update.driver_id is not None:
        if update.driver_id != "":
            driver = await db.users.find_one({"id": update.driver_id})
            if not driver:
                raise HTTPException(status_code=404, detail="Driver not found")
        update_data["driver_id"] = update.driver_id if update.driver_id else None
    
    if update.start_time is not None:
        update_data["start_time"] = datetime_to_iso(parse_datetime(update.start_time))
    
    if update.end_time is not None:
        update_data["end_time"] = datetime_to_iso(parse_datetime(update.end_time))
    
    if update.status is not None:
        update_data["status"] = update.status
    
    if update.notes is not None:
        update_data["notes"] = update.notes
    
    # Check for conflicts if time or vehicle changed
    if "start_time" in update_data or "end_time" in update_data or "vehicle_id" in update_data:
        check_vehicle = update_data.get("vehicle_id", schedule["vehicle_id"])
        check_start = parse_datetime(update_data.get("start_time", schedule["start_time"]))
        check_end = parse_datetime(update_data.get("end_time", schedule["end_time"]))
        check_driver = update_data.get("driver_id", schedule.get("driver_id"))
        
        conflicts = await check_conflicts(
            vehicle_id=check_vehicle,
            start_time=check_start,
            end_time=check_end,
            exclude_schedule_id=schedule_id,
            driver_id=check_driver
        )
        
        if conflicts.has_conflict and not force:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Schedule conflicts detected",
                    "conflicts": [c.dict() for c in conflicts.conflicting_schedules]
                }
            )
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vehicle_schedules.update_one(
        {"id": schedule_id},
        {"$set": update_data}
    )
    
    # Update booking if vehicle or driver changed
    if "vehicle_id" in update_data or "driver_id" in update_data:
        booking_type = schedule.get("booking_type", "patient_booking")
        collection = db.patient_bookings if booking_type == "patient_booking" else db.bookings
        
        booking_update = {}
        if "vehicle_id" in update_data:
            booking_update["assigned_vehicle_id"] = update_data["vehicle_id"]
        if "driver_id" in update_data:
            booking_update["assigned_driver"] = update_data["driver_id"]
        
        if booking_update:
            await collection.update_one(
                {"id": schedule["booking_id"]},
                {"$set": booking_update}
            )
    
    logger.info(f"Updated schedule {schedule_id}")
    
    updated_schedule = await db.vehicle_schedules.find_one({"id": schedule_id}, {"_id": 0})
    enriched = await enrich_schedule(updated_schedule)
    return VehicleScheduleResponse(**enriched)


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Cancel/delete a schedule entry"""
    
    schedule = await db.vehicle_schedules.find_one({"id": schedule_id})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Soft delete - mark as cancelled
    await db.vehicle_schedules.update_one(
        {"id": schedule_id},
        {"$set": {
            "status": ScheduleStatus.CANCELLED,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Clear booking assignment
    booking_type = schedule.get("booking_type", "patient_booking")
    collection = db.patient_bookings if booking_type == "patient_booking" else db.bookings
    
    await collection.update_one(
        {"id": schedule["booking_id"]},
        {"$unset": {"schedule_id": 1}}
    )
    
    logger.info(f"Cancelled schedule {schedule_id}")
    
    return {"message": "Schedule cancelled", "schedule_id": schedule_id}


@router.post("/{schedule_id}/start")
async def start_schedule(
    schedule_id: str,
    user: dict = Depends(get_current_user)
) -> VehicleScheduleResponse:
    """Mark a schedule as in progress"""
    
    schedule = await db.vehicle_schedules.find_one({"id": schedule_id})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if schedule["status"] != ScheduleStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Schedule is not in scheduled status")
    
    await db.vehicle_schedules.update_one(
        {"id": schedule_id},
        {"$set": {
            "status": ScheduleStatus.IN_PROGRESS,
            "actual_start_time": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.vehicle_schedules.find_one({"id": schedule_id}, {"_id": 0})
    enriched = await enrich_schedule(updated)
    return VehicleScheduleResponse(**enriched)


@router.post("/{schedule_id}/complete")
async def complete_schedule(
    schedule_id: str,
    user: dict = Depends(get_current_user)
) -> VehicleScheduleResponse:
    """Mark a schedule as completed"""
    
    schedule = await db.vehicle_schedules.find_one({"id": schedule_id})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if schedule["status"] not in [ScheduleStatus.SCHEDULED, ScheduleStatus.IN_PROGRESS]:
        raise HTTPException(status_code=400, detail="Schedule cannot be completed from current status")
    
    await db.vehicle_schedules.update_one(
        {"id": schedule_id},
        {"$set": {
            "status": ScheduleStatus.COMPLETED,
            "actual_end_time": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.vehicle_schedules.find_one({"id": schedule_id}, {"_id": 0})
    enriched = await enrich_schedule(updated)
    return VehicleScheduleResponse(**enriched)


# ============ BULK OPERATIONS ============

@router.post("/bulk/from-bookings")
async def create_schedules_from_bookings(
    date: str = Query(..., description="Date to create schedules for (YYYY-MM-DD)"),
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create schedule entries from existing bookings that have assigned vehicles but no schedules"""
    
    # Find patient_bookings with assigned vehicles but no schedule_id
    bookings = await db.patient_bookings.find({
        "preferred_date": date,
        "assigned_vehicle_id": {"$exists": True, "$ne": None},
        "schedule_id": {"$exists": False},
        "status": {"$nin": ["completed", "cancelled"]}
    }, {"_id": 0}).to_list(100)
    
    created = []
    errors = []
    
    for booking in bookings:
        try:
            # Parse preferred time or default to 09:00
            preferred_time = booking.get("preferred_time", "09:00")
            start_datetime = parse_datetime(f"{date}T{preferred_time}:00")
            end_datetime = start_datetime + timedelta(hours=DEFAULT_SCHEDULE_DURATION_HOURS)
            
            schedule_create = VehicleScheduleCreate(
                vehicle_id=booking["assigned_vehicle_id"],
                booking_id=booking["id"],
                booking_type="patient_booking",
                driver_id=booking.get("assigned_driver"),
                start_time=datetime_to_iso(start_datetime),
                end_time=datetime_to_iso(end_datetime)
            )
            
            # Create the schedule (force=True to allow overlaps for migration)
            result = await create_schedule(schedule_create, force=True, user=user)
            created.append(result)
            
        except Exception as e:
            errors.append({
                "booking_id": booking["id"],
                "error": str(e)
            })
    
    return {
        "message": f"Created {len(created)} schedules, {len(errors)} errors",
        "created_count": len(created),
        "error_count": len(errors),
        "errors": errors
    }
