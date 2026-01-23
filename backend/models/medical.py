"""
Medical-related Pydantic models
"""
from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class MedicalCondition(BaseModel):
    name: str
    diagnosed_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    prescribed_by: Optional[str] = None
    notes: Optional[str] = None


class Allergy(BaseModel):
    allergen: str
    reaction: Optional[str] = None
    severity: str = "moderate"
    notes: Optional[str] = None


class MedicalEmergencyContact(BaseModel):
    name: str
    relationship: str
    phone: str
    is_primary: bool = False


class PatientMedicalProfileCreate(BaseModel):
    full_name: str
    date_of_birth: str
    gender: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    blood_type: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    allergies: List[Allergy] = []
    chronic_conditions: List[MedicalCondition] = []
    current_medications: List[Medication] = []
    emergency_contacts: List[MedicalEmergencyContact] = []
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None


class PatientMedicalProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    blood_type: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    allergies: Optional[List[Allergy]] = None
    chronic_conditions: Optional[List[MedicalCondition]] = None
    current_medications: Optional[List[Medication]] = None
    emergency_contacts: Optional[List[MedicalEmergencyContact]] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None


class PatientMedicalProfileResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    full_name: str
    date_of_birth: str
    gender: str
    age: Optional[int] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    blood_type: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    bmi: Optional[float] = None
    allergies: List[dict] = []
    chronic_conditions: List[dict] = []
    current_medications: List[dict] = []
    emergency_contacts: List[dict] = []
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: str
    created_by: str
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class VitalSignsEntry(BaseModel):
    patient_id: str
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    blood_glucose: Optional[float] = None
    pain_score: Optional[int] = None
    gcs_score: Optional[int] = None
    measurement_type: str = "routine"
    notes: Optional[str] = None
    recorded_by: Optional[str] = None
    recorded_at: Optional[str] = None


class VitalSignsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    blood_glucose: Optional[float] = None
    pain_score: Optional[int] = None
    gcs_score: Optional[int] = None
    measurement_type: str
    notes: Optional[str] = None
    recorded_by: str
    recorded_by_name: Optional[str] = None
    recorded_at: str
    flags: Optional[List[str]] = []


class MedicalCheckCreate(BaseModel):
    patient_id: str
    check_type: str = "routine"
    location: Optional[str] = None
    vitals: Optional[VitalSignsEntry] = None
    symptoms: Optional[str] = None
    physical_findings: Optional[str] = None
    provisional_diagnosis: Optional[str] = None
    recommendations: Optional[str] = None
    prescriptions: List[Medication] = []
    smoking_status: Optional[str] = None
    alcohol_use: Optional[str] = None
    physical_activity: Optional[str] = None
    attachments: List[str] = []


class MedicalCheckResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    patient_id: str
    patient_name: Optional[str] = None
    check_type: str
    location: Optional[str] = None
    vitals: Optional[dict] = None
    symptoms: Optional[str] = None
    physical_findings: Optional[str] = None
    provisional_diagnosis: Optional[str] = None
    recommendations: Optional[str] = None
    prescriptions: List[dict] = []
    smoking_status: Optional[str] = None
    alcohol_use: Optional[str] = None
    physical_activity: Optional[str] = None
    attachments: List[str] = []
    performed_by: str
    performed_by_name: Optional[str] = None
    performed_at: str
    signed_by: Optional[str] = None
    signed_at: Optional[str] = None


class AvailabilityStatus:
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    ON_LEAVE = "on_leave"
    SICK = "sick"


class AvailabilityCreate(BaseModel):
    date: str
    start_time: str
    end_time: str
    status: str = AvailabilityStatus.AVAILABLE
    notes: Optional[str] = None
    repeat_weekly: bool = False


class AvailabilityUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AvailabilityResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    user_role: str
    date: str
    start_time: str
    end_time: str
    status: str
    notes: Optional[str] = None
    created_at: str
