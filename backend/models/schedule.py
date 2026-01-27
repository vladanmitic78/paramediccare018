"""
Vehicle Schedule models for Timeline-Based Scheduling System
Phase 1: Data Model & Backend APIs
"""
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class ScheduleStatus:
    """Status of a vehicle schedule entry"""
    SCHEDULED = "scheduled"      # Future booking
    IN_PROGRESS = "in_progress"  # Currently active
    COMPLETED = "completed"      # Finished
    CANCELLED = "cancelled"      # Cancelled


class VehicleScheduleCreate(BaseModel):
    """Create a new vehicle schedule entry"""
    vehicle_id: str
    booking_id: str
    booking_type: str = "patient_booking"  # "patient_booking" or "booking"
    driver_id: Optional[str] = None
    start_time: str  # ISO datetime string
    end_time: str    # ISO datetime string
    notes: Optional[str] = None


class VehicleScheduleUpdate(BaseModel):
    """Update a vehicle schedule entry"""
    vehicle_id: Optional[str] = None
    driver_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class VehicleScheduleResponse(BaseModel):
    """Vehicle schedule response"""
    model_config = ConfigDict(extra="ignore")
    id: str
    vehicle_id: str
    vehicle_name: Optional[str] = None
    booking_id: str
    booking_type: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    patient_name: Optional[str] = None
    pickup_address: Optional[str] = None
    destination_address: Optional[str] = None
    start_time: str
    end_time: str
    status: str
    notes: Optional[str] = None
    created_at: str
    created_by: Optional[str] = None
    updated_at: Optional[str] = None


class AvailabilityQuery(BaseModel):
    """Query for checking availability"""
    date: str  # YYYY-MM-DD
    start_time: Optional[str] = None  # HH:MM (optional, defaults to start of day)
    end_time: Optional[str] = None    # HH:MM (optional, defaults to end of day)
    vehicle_id: Optional[str] = None  # Filter by specific vehicle
    driver_id: Optional[str] = None   # Filter by specific driver


class TimeSlot(BaseModel):
    """A time slot for availability"""
    start_time: str  # ISO datetime
    end_time: str    # ISO datetime
    is_available: bool
    booking_id: Optional[str] = None
    patient_name: Optional[str] = None


class VehicleAvailability(BaseModel):
    """Vehicle availability for a day"""
    vehicle_id: str
    vehicle_name: str
    date: str
    schedules: List[VehicleScheduleResponse] = []
    available_slots: List[TimeSlot] = []
    is_available_all_day: bool = False


class StaffUnavailability(BaseModel):
    """Staff unavailability information"""
    user_id: str
    user_name: str
    date: str
    start_time: str
    end_time: str
    status: str  # unavailable, on_leave, sick
    notes: Optional[str] = None


class ScheduleConflict(BaseModel):
    """Conflict information when scheduling overlaps"""
    has_conflict: bool
    conflicting_schedules: List[VehicleScheduleResponse] = []
    staff_unavailable: List[StaffUnavailability] = []
    message: Optional[str] = None
