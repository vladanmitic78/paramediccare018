"""
Models package - All Pydantic models for Paramedic Care 018
"""
from .user import (
    UserRole, UserCreate, UserLogin, UserResponse, TokenResponse,
    RoleUpdate, StatusUpdate
)
from .booking import (
    BookingStatus, MobilityStatus, BookingCreate, BookingResponse,
    BookingStatusUpdate, PatientBookingCreate, PatientBookingResponse,
    SavedAddress, EmergencyContact, PatientProfileUpdate,
    InvoiceResponse, NotificationResponse, ContactCreate, ContactResponse
)
from .medical import (
    MedicalCondition, Medication, Allergy, MedicalEmergencyContact,
    PatientMedicalProfileCreate, PatientMedicalProfileUpdate,
    PatientMedicalProfileResponse, VitalSignsEntry, VitalSignsResponse,
    MedicalCheckCreate, MedicalCheckResponse,
    AvailabilityStatus, AvailabilityCreate, AvailabilityUpdate, AvailabilityResponse
)
from .driver import (
    DriverStatus, DriverLocationUpdate, DriverStatusUpdate,
    DriverAssignment, ConnectionManager
)
from .vehicle import (
    VehicleStatus, VehicleType, TeamRole, TeamMemberAssignment,
    ShiftSchedule, VehicleCreate, VehicleUpdate, VehicleResponse,
    TeamAssignmentCreate, TeamAssignmentUpdate, MissionTeamLock,
    TeamAuditEntry, MissionTeamValidation
)

__all__ = [
    # User models
    'UserRole', 'UserCreate', 'UserLogin', 'UserResponse', 'TokenResponse',
    'RoleUpdate', 'StatusUpdate',
    # Booking models
    'BookingStatus', 'MobilityStatus', 'BookingCreate', 'BookingResponse',
    'BookingStatusUpdate', 'PatientBookingCreate', 'PatientBookingResponse',
    'SavedAddress', 'EmergencyContact', 'PatientProfileUpdate',
    'InvoiceResponse', 'NotificationResponse', 'ContactCreate', 'ContactResponse',
    # Medical models
    'MedicalCondition', 'Medication', 'Allergy', 'MedicalEmergencyContact',
    'PatientMedicalProfileCreate', 'PatientMedicalProfileUpdate',
    'PatientMedicalProfileResponse', 'VitalSignsEntry', 'VitalSignsResponse',
    'MedicalCheckCreate', 'MedicalCheckResponse',
    'AvailabilityStatus', 'AvailabilityCreate', 'AvailabilityUpdate', 'AvailabilityResponse',
    # Driver models
    'DriverStatus', 'DriverLocationUpdate', 'DriverStatusUpdate',
    'DriverAssignment', 'ConnectionManager',
    # Vehicle & Team models
    'VehicleStatus', 'VehicleType', 'TeamRole', 'TeamMemberAssignment',
    'ShiftSchedule', 'VehicleCreate', 'VehicleUpdate', 'VehicleResponse',
    'TeamAssignmentCreate', 'TeamAssignmentUpdate', 'MissionTeamLock',
    'TeamAuditEntry', 'MissionTeamValidation'
]
