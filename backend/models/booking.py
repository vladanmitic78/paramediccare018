"""
Booking-related Pydantic models
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional


class BookingStatus:
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    EN_ROUTE = "en_route"
    PICKED_UP = "picked_up"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MobilityStatus:
    WALKING = "walking"
    WHEELCHAIR = "wheelchair"
    STRETCHER = "stretcher"


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
    booking_type: str = "transport"
    language: str = "sr"


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


class BookingFullUpdate(BaseModel):
    patient_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    start_point: Optional[str] = None
    end_point: Optional[str] = None
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    booking_date: Optional[str] = None
    booking_time: Optional[str] = None
    mobility_status: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    assigned_driver: Optional[str] = None
    assigned_driver_name: Optional[str] = None
    assigned_medical: Optional[str] = None


class PatientBookingCreate(BaseModel):
    patient_name: str
    patient_age: int
    contact_phone: str
    contact_email: EmailStr
    transport_reason: str
    transport_reason_details: Optional[str] = None
    mobility_status: str = MobilityStatus.WALKING
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    destination_address: str
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    preferred_date: str
    preferred_time: str
    consent_given: bool = False
    language: str = "sr"


class PatientBookingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_name: str
    patient_age: int
    contact_phone: str
    contact_email: str
    transport_reason: str
    transport_reason_details: Optional[str] = None
    mobility_status: str
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    destination_address: str
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    preferred_date: str
    preferred_time: str
    status: str
    assigned_driver: Optional[str] = None
    assigned_vehicle: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    user_id: str
    invoice_id: Optional[str] = None


class SavedAddress(BaseModel):
    label: str
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class EmergencyContact(BaseModel):
    name: str
    phone: str
    relationship: str


class PatientProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    saved_addresses: Optional[List[SavedAddress]] = None
    emergency_contact: Optional[EmergencyContact] = None
    preferred_language: Optional[str] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    invoice_number: str
    booking_id: str
    patient_name: str
    patient_email: str
    service_type: str
    service_date: str
    service_description: str
    amount: float
    tax: float
    total: float
    payment_status: str
    created_at: str
    due_date: str


class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title_sr: str
    title_en: str
    message_sr: str
    message_en: str
    notification_type: str
    is_read: bool
    created_at: str
    booking_id: Optional[str] = None


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    inquiry_type: str = "general"
    language: str = "sr"


class ContactResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    message: str
    is_read: bool = False
    created_at: str
