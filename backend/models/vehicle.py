"""
Vehicle and Team Assignment Pydantic models
"""
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class VehicleStatus:
    AVAILABLE = "available"
    ON_MISSION = "on_mission"
    MAINTENANCE = "maintenance"
    OUT_OF_SERVICE = "out_of_service"


class VehicleType:
    AMBULANCE = "ambulance"
    MEDICAL_TRANSPORT = "medical_transport"
    EMERGENCY = "emergency"


class TeamRole:
    DRIVER = "driver"
    NURSE = "nurse"
    PARAMEDIC = "paramedic"
    DOCTOR = "doctor"
    REMOTE_DOCTOR = "remote_doctor"


class TeamMemberAssignment(BaseModel):
    """Individual team member assignment"""
    user_id: str
    role: str  # driver, nurse, paramedic, doctor, remote_doctor
    assigned_at: Optional[str] = None
    assigned_by: Optional[str] = None
    is_primary: bool = True  # Primary role holder vs backup
    is_remote: bool = False  # For telemedicine doctors


class ShiftSchedule(BaseModel):
    """Shift schedule for a vehicle"""
    shift_name: str  # e.g., "Morning", "Night", "Custom"
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    days: List[str] = []  # ["monday", "tuesday", ...] or empty for all days
    default_team: List[TeamMemberAssignment] = []


class VehicleCreate(BaseModel):
    """Create a new vehicle"""
    name: str  # e.g., "Ambulance 1", "EMS-018"
    registration_plate: str
    vehicle_type: str = VehicleType.AMBULANCE
    capacity: int = 1  # Patient capacity
    equipment: List[str] = []  # ["LIFEPAK", "Oxygen", "Stretcher"]
    notes: Optional[str] = None
    
    # Team requirements for this vehicle
    required_roles: List[str] = ["driver", "nurse"]  # Minimum required roles
    optional_roles: List[str] = ["doctor"]  # Optional roles


class VehicleUpdate(BaseModel):
    """Update vehicle details"""
    name: Optional[str] = None
    registration_plate: Optional[str] = None
    vehicle_type: Optional[str] = None
    status: Optional[str] = None
    capacity: Optional[int] = None
    equipment: Optional[List[str]] = None
    notes: Optional[str] = None
    required_roles: Optional[List[str]] = None
    optional_roles: Optional[List[str]] = None


class VehicleResponse(BaseModel):
    """Vehicle response with team info"""
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    registration_plate: str
    vehicle_type: str
    status: str
    capacity: int
    equipment: List[str] = []
    notes: Optional[str] = None
    required_roles: List[str] = []
    optional_roles: List[str] = []
    current_team: List[dict] = []
    current_mission_id: Optional[str] = None
    shift_schedules: List[dict] = []
    created_at: str
    updated_at: Optional[str] = None


class TeamAssignmentCreate(BaseModel):
    """Assign team to vehicle"""
    vehicle_id: str
    team_members: List[TeamMemberAssignment]
    shift_id: Optional[str] = None  # If assigning to a specific shift
    mission_id: Optional[str] = None  # If assigning for a specific mission
    notes: Optional[str] = None


class TeamAssignmentUpdate(BaseModel):
    """Update team assignment"""
    add_members: Optional[List[TeamMemberAssignment]] = None
    remove_member_ids: Optional[List[str]] = None
    handover_notes: Optional[str] = None
    reason: Optional[str] = None  # Reason for change


class MissionTeamLock(BaseModel):
    """Lock team for active mission"""
    mission_id: str
    vehicle_id: str
    locked_team: List[TeamMemberAssignment]
    locked_at: str
    locked_by: str
    unlock_reason: Optional[str] = None


class TeamAuditEntry(BaseModel):
    """Audit trail entry for team changes"""
    model_config = ConfigDict(extra="ignore")
    id: str
    vehicle_id: str
    mission_id: Optional[str] = None
    action: str  # assigned, removed, replaced, shift_change, locked, unlocked
    user_id: str  # Who was affected
    user_name: str
    role: str
    performed_by: str
    performed_by_name: str
    reason: Optional[str] = None
    handover_notes: Optional[str] = None
    timestamp: str
    previous_state: Optional[dict] = None
    new_state: Optional[dict] = None


class MissionTeamValidation(BaseModel):
    """Validation result for mission team"""
    is_valid: bool
    missing_roles: List[str] = []
    warnings: List[str] = []
    team_summary: List[dict] = []
