"""
Medical routes - /medical/*
Handles: Patient profiles, vital signs, medical checks, medications, diagnoses, dashboard
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
import uuid

from config import db, logger
from models import UserRole
from utils.auth import require_roles, get_current_user

router = APIRouter(tags=["Medical"])


# ============ PYDANTIC MODELS ============

class PatientMedicalProfileCreate(BaseModel):
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    allergies: Optional[List[str]] = []
    chronic_conditions: Optional[List[str]] = []
    current_medications: Optional[List[str]] = []
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None


class PatientMedicalProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    current_medications: Optional[List[str]] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None


class VitalSignsEntry(BaseModel):
    patient_id: str
    booking_id: Optional[str] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    blood_glucose: Optional[int] = None
    pain_level: Optional[int] = None
    gcs_eye: Optional[int] = None
    gcs_verbal: Optional[int] = None
    gcs_motor: Optional[int] = None
    gcs_score: Optional[int] = None
    notes: Optional[str] = None
    location: Optional[str] = None


class MedicalCheckCreate(BaseModel):
    patient_id: str
    booking_id: Optional[str] = None
    check_type: str  # pre_transport, during_transport, post_transport, routine
    consciousness: Optional[str] = None
    airway: Optional[str] = None
    breathing: Optional[str] = None
    circulation: Optional[str] = None
    disability: Optional[str] = None
    exposure_notes: Optional[str] = None
    pupil_response: Optional[str] = None
    skin_condition: Optional[str] = None
    mobility_status: Optional[str] = None
    iv_access: Optional[bool] = None
    iv_notes: Optional[str] = None
    oxygen_therapy: Optional[bool] = None
    oxygen_flow_rate: Optional[float] = None
    monitoring_equipment: Optional[List[str]] = []
    medications_given: Optional[List[Dict]] = []
    doctor_notes: Optional[str] = None
    nurse_notes: Optional[str] = None
    attachments: Optional[List[str]] = []


class MedicationEntry(BaseModel):
    patient_id: str
    medication_name: str
    dosage: str
    frequency: str
    route: Optional[str] = None  # oral, iv, im, etc.
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    prescribing_doctor: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class DiagnosisEntry(BaseModel):
    patient_id: str
    icd_code: str
    name_sr: str
    name_en: str
    category_sr: Optional[str] = None
    category_en: Optional[str] = None
    notes: Optional[str] = None


# ============ HELPER FUNCTIONS ============

def calculate_age(birth_date_str: str) -> int:
    """Calculate age from date of birth string (YYYY-MM-DD)"""
    try:
        birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except (ValueError, TypeError):
        return None


def calculate_bmi(height_cm: int, weight_kg: float) -> float:
    """Calculate BMI from height (cm) and weight (kg)"""
    if height_cm and weight_kg and height_cm > 0:
        height_m = height_cm / 100
        return round(weight_kg / (height_m * height_m), 1)
    return None


async def generate_patient_id() -> str:
    """Generate unique patient ID like PC018-P-00001"""
    count = await db.medical_patients.count_documents({})
    return f"PC018-P-{str(count + 1).zfill(5)}"


def check_vital_flags(vitals: dict) -> List[str]:
    """Check vitals against normal ranges and return flags"""
    flags = []
    
    # Blood Pressure
    if vitals.get("systolic_bp") or vitals.get("blood_pressure_systolic"):
        bp = vitals.get("systolic_bp") or vitals.get("blood_pressure_systolic")
        if bp > 140:
            flags.append("HIGH_BP")
        elif bp < 90:
            flags.append("LOW_BP")
    
    # Heart Rate
    if vitals.get("heart_rate"):
        if vitals["heart_rate"] > 100:
            flags.append("TACHYCARDIA")
        elif vitals["heart_rate"] < 60:
            flags.append("BRADYCARDIA")
    
    # Oxygen Saturation
    if vitals.get("oxygen_saturation"):
        if vitals["oxygen_saturation"] < 95:
            flags.append("LOW_SPO2")
        if vitals["oxygen_saturation"] < 90:
            flags.append("CRITICAL_SPO2")
    
    # Temperature
    if vitals.get("temperature"):
        if vitals["temperature"] > 38:
            flags.append("FEVER")
        elif vitals["temperature"] < 36:
            flags.append("HYPOTHERMIA")
    
    # Respiratory Rate
    if vitals.get("respiratory_rate"):
        if vitals["respiratory_rate"] > 20:
            flags.append("TACHYPNEA")
        elif vitals["respiratory_rate"] < 12:
            flags.append("BRADYPNEA")
    
    # Blood Glucose
    if vitals.get("blood_glucose"):
        if vitals["blood_glucose"] > 180:
            flags.append("HYPERGLYCEMIA")
        elif vitals["blood_glucose"] < 70:
            flags.append("HYPOGLYCEMIA")
    
    # GCS
    if vitals.get("gcs_score"):
        if vitals["gcs_score"] <= 8:
            flags.append("SEVERE_CONSCIOUSNESS")
        elif vitals["gcs_score"] <= 12:
            flags.append("MODERATE_CONSCIOUSNESS")
    
    return flags


# ============ MEDICAL PATIENT PROFILE ROUTES ============

@router.post("/medical/patients")
async def create_medical_patient(
    patient: PatientMedicalProfileCreate,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create a new medical patient profile"""
    patient_id = await generate_patient_id()
    
    patient_data = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        **patient.model_dump(),
        "age": calculate_age(patient.date_of_birth) if patient.date_of_birth else None,
        "bmi": calculate_bmi(patient.height_cm, patient.weight_kg),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "created_by_name": user.get("full_name", "Unknown")
    }
    
    await db.medical_patients.insert_one(patient_data)
    patient_data.pop("_id", None)
    return patient_data


@router.get("/medical/patients")
async def list_medical_patients(
    search: str = None,
    blood_type: str = None,
    has_allergies: bool = None,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """List all medical patients with search and filters"""
    query = {}
    
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"patient_id": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    if blood_type:
        query["blood_type"] = blood_type
    
    if has_allergies is not None:
        if has_allergies:
            query["allergies"] = {"$ne": [], "$exists": True}
        else:
            query["$or"] = [{"allergies": []}, {"allergies": {"$exists": False}}]
    
    patients = await db.medical_patients.find(query, {"_id": 0}).skip(offset).limit(limit).to_list(limit)
    total = await db.medical_patients.count_documents(query)
    
    return {"patients": patients, "total": total}


@router.get("/medical/patients/{patient_id}")
async def get_medical_patient(
    patient_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get a specific medical patient profile"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]},
        {"_id": 0}
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get recent vitals
    recent_vitals = await db.medical_vitals.find(
        {"patient_id": patient["id"]},
        {"_id": 0}
    ).sort("recorded_at", -1).limit(10).to_list(10)
    
    # Get recent checks
    recent_checks = await db.medical_checks.find(
        {"patient_id": patient["id"]},
        {"_id": 0}
    ).sort("performed_at", -1).limit(5).to_list(5)
    
    # Get medications
    medications = await db.patient_medications.find(
        {"patient_id": patient["id"], "is_active": True},
        {"_id": 0}
    ).to_list(50)
    
    # Get diagnoses
    diagnoses = await db.patient_diagnoses.find(
        {"patient_id": patient["id"]},
        {"_id": 0}
    ).to_list(50)
    
    return {
        **patient,
        "recent_vitals": recent_vitals,
        "recent_checks": recent_checks,
        "active_medications": medications,
        "diagnoses": diagnoses
    }


@router.put("/medical/patients/{patient_id}")
async def update_medical_patient(
    patient_id: str,
    update: PatientMedicalProfileUpdate,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Update a medical patient profile"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Recalculate age and BMI if relevant fields updated
    if "date_of_birth" in update_data:
        update_data["age"] = calculate_age(update_data["date_of_birth"])
    
    if "height_cm" in update_data or "weight_kg" in update_data:
        height = update_data.get("height_cm", patient.get("height_cm"))
        weight = update_data.get("weight_kg", patient.get("weight_kg"))
        update_data["bmi"] = calculate_bmi(height, weight)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["id"]
    
    await db.medical_patients.update_one(
        {"id": patient["id"]},
        {"$set": update_data}
    )
    
    updated = await db.medical_patients.find_one({"id": patient["id"]}, {"_id": 0})
    return updated


# ============ VITAL SIGNS ROUTES ============

@router.post("/medical/vitals")
async def record_vital_signs(
    vitals: VitalSignsEntry,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Record vital signs for a patient"""
    vitals_data = {
        "id": str(uuid.uuid4()),
        **vitals.model_dump(),
        "systolic_bp": vitals.blood_pressure_systolic,
        "diastolic_bp": vitals.blood_pressure_diastolic,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "recorded_by": user["id"],
        "recorded_by_name": user.get("full_name", "Unknown")
    }
    
    # Calculate GCS if components provided
    if vitals.gcs_eye and vitals.gcs_verbal and vitals.gcs_motor:
        vitals_data["gcs_score"] = vitals.gcs_eye + vitals.gcs_verbal + vitals.gcs_motor
    
    # Check for abnormal values
    vitals_data["flags"] = check_vital_flags(vitals_data)
    
    await db.medical_vitals.insert_one(vitals_data)
    vitals_data.pop("_id", None)
    
    return vitals_data


@router.get("/medical/vitals/{patient_id}")
async def get_patient_vitals(
    patient_id: str,
    limit: int = 20,
    start_date: str = None,
    end_date: str = None,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get vital signs history for a patient"""
    query = {"patient_id": patient_id}
    
    if start_date:
        query["recorded_at"] = {"$gte": start_date}
    if end_date:
        if "recorded_at" in query:
            query["recorded_at"]["$lte"] = end_date
        else:
            query["recorded_at"] = {"$lte": end_date}
    
    vitals = await db.medical_vitals.find(query, {"_id": 0}).sort("recorded_at", -1).limit(limit).to_list(limit)
    return vitals


@router.get("/medical/vitals/latest/{patient_id}")
async def get_latest_vitals(
    patient_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get the most recent vital signs for a patient"""
    vitals = await db.medical_vitals.find_one(
        {"patient_id": patient_id},
        {"_id": 0},
        sort=[("recorded_at", -1)]
    )
    return vitals or {}


# ============ MEDICAL CHECK / EXAMINATION ROUTES ============

@router.post("/medical/checks")
async def create_medical_check(
    check: MedicalCheckCreate,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create a medical check/examination record"""
    check_data = {
        "id": str(uuid.uuid4()),
        **check.model_dump(),
        "performed_at": datetime.now(timezone.utc).isoformat(),
        "performed_by": user["id"],
        "performed_by_name": user.get("full_name", "Unknown"),
        "performed_by_role": user.get("role", "unknown")
    }
    
    await db.medical_checks.insert_one(check_data)
    check_data.pop("_id", None)
    
    return check_data


@router.get("/medical/checks/{patient_id}")
async def get_patient_checks(
    patient_id: str,
    check_type: str = None,
    limit: int = 10,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get medical checks for a patient"""
    query = {"patient_id": patient_id}
    if check_type:
        query["check_type"] = check_type
    
    checks = await db.medical_checks.find(query, {"_id": 0}).sort("performed_at", -1).limit(limit).to_list(limit)
    return checks


# ============ DOCTOR/NURSE DASHBOARD ROUTES ============

@router.get("/medical/dashboard")
async def get_medical_dashboard(
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get medical dashboard data"""
    total_patients = await db.medical_patients.count_documents({})
    
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_patients = await db.medical_patients.count_documents({"created_at": {"$gte": week_ago}})
    
    day_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    critical_vitals = await db.medical_vitals.find(
        {
            "recorded_at": {"$gte": day_ago},
            "flags": {"$in": ["CRITICAL_SPO2", "SEVERE_CONSCIOUSNESS", "LOW_BP"]}
        },
        {"_id": 0}
    ).to_list(20)
    
    active_transports = await db.bookings.find(
        {"status": {"$in": ["confirmed", "en_route", "picked_up"]}},
        {"_id": 0}
    ).to_list(20)
    
    patient_bookings = await db.patient_bookings.find(
        {"status": {"$in": ["confirmed", "en_route", "picked_up"]}},
        {"_id": 0}
    ).to_list(20)
    
    recent_checks = await db.medical_checks.find(
        {}, {"_id": 0}
    ).sort("performed_at", -1).limit(10).to_list(10)
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_checks = await db.medical_checks.count_documents({"performed_at": {"$gte": today_start}})
    
    return {
        "stats": {
            "total_patients": total_patients,
            "recent_patients": recent_patients,
            "critical_alerts": len(critical_vitals),
            "active_transports": len(active_transports) + len(patient_bookings),
            "today_checks": today_checks
        },
        "critical_vitals": critical_vitals,
        "active_transports": active_transports + patient_bookings,
        "recent_checks": recent_checks
    }


@router.get("/transport/timeline/{booking_id}")
async def get_transport_timeline(
    booking_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER]))
):
    """Get chronological timeline of events for a transport"""
    events = []
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        booking = await db.patient_bookings.find_one({"id": booking_id}, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    events.append({
        "type": "booking_created",
        "timestamp": booking.get("created_at"),
        "title": "Rezervacija kreirana",
        "title_en": "Booking Created",
        "details": f"Pacijent: {booking.get('patient_name')}"
    })
    
    if booking.get("assigned_driver"):
        events.append({
            "type": "driver_assigned",
            "timestamp": booking.get("driver_assigned_at", booking.get("updated_at")),
            "title": "Vozač dodeljen",
            "title_en": "Driver Assigned",
            "details": booking.get("assigned_driver_name", "Unknown")
        })
    
    vitals = await db.medical_vitals.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("recorded_at", 1).to_list(50)
    
    for v in vitals:
        events.append({
            "type": "vitals_recorded",
            "timestamp": v.get("recorded_at"),
            "title": "Vitalni znaci",
            "title_en": "Vitals Recorded",
            "details": f"BP: {v.get('systolic_bp', '-')}/{v.get('diastolic_bp', '-')}, HR: {v.get('heart_rate', '-')}, SpO2: {v.get('oxygen_saturation', '-')}%",
            "flags": v.get("flags", [])
        })
    
    checks = await db.medical_checks.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("performed_at", 1).to_list(50)
    
    for c in checks:
        events.append({
            "type": "medical_check",
            "timestamp": c.get("performed_at"),
            "title": f"Pregled ({c.get('check_type', 'routine')})",
            "title_en": f"Medical Check ({c.get('check_type', 'routine')})",
            "details": c.get("doctor_notes") or c.get("nurse_notes") or "No notes"
        })
    
    events.sort(key=lambda x: x.get("timestamp") or "")
    
    return {
        "booking": booking,
        "events": events
    }


# ============ MEDICATIONS MANAGEMENT ============

@router.post("/medical/medications")
async def add_medication(
    medication: MedicationEntry,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Add a medication to a patient's profile"""
    med_data = {
        "id": str(uuid.uuid4()),
        **medication.model_dump(),
        "added_at": datetime.now(timezone.utc).isoformat(),
        "added_by": user["id"],
        "added_by_name": user.get("full_name", "Unknown")
    }
    
    await db.patient_medications.insert_one(med_data)
    med_data.pop("_id", None)
    
    return med_data


@router.get("/medical/medications/{patient_id}")
async def get_patient_medications(
    patient_id: str,
    active_only: bool = True,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get medications for a patient"""
    query = {"patient_id": patient_id}
    if active_only:
        query["is_active"] = True
    
    medications = await db.patient_medications.find(query, {"_id": 0}).to_list(100)
    return medications


@router.put("/medical/medications/{medication_id}")
async def update_medication(
    medication_id: str,
    update: dict,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Update a medication"""
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = user["id"]
    
    result = await db.patient_medications.update_one(
        {"id": medication_id},
        {"$set": update}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    return {"success": True}


@router.delete("/medical/medications/{medication_id}")
async def delete_medication(
    medication_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Delete a medication (soft delete - set is_active to False)"""
    result = await db.patient_medications.update_one(
        {"id": medication_id},
        {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc).isoformat(), "deactivated_by": user["id"]}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    return {"success": True}


# ============ PATIENT DIAGNOSES ROUTES ============

@router.get("/patients/{patient_id}/diagnoses")
async def get_patient_diagnoses(
    patient_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get all diagnoses for a patient"""
    diagnoses = await db.patient_diagnoses.find(
        {"patient_id": patient_id},
        {"_id": 0}
    ).sort("added_at", -1).to_list(100)
    
    return diagnoses


@router.post("/patients/{patient_id}/diagnoses")
async def add_patient_diagnosis(
    patient_id: str,
    diagnosis: DiagnosisEntry,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Add a diagnosis to a patient"""
    # Check if diagnosis already exists for this patient
    existing = await db.patient_diagnoses.find_one({
        "patient_id": patient_id,
        "icd_code": diagnosis.icd_code
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Diagnosis already exists for this patient")
    
    diagnosis_data = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "icd_code": diagnosis.icd_code,
        "name_sr": diagnosis.name_sr,
        "name_en": diagnosis.name_en,
        "category_sr": diagnosis.category_sr,
        "category_en": diagnosis.category_en,
        "notes": diagnosis.notes,
        "added_at": datetime.now(timezone.utc).isoformat(),
        "added_by_id": user["id"],
        "added_by_name": user.get("full_name", "Unknown")
    }
    
    await db.patient_diagnoses.insert_one(diagnosis_data)
    diagnosis_data.pop("_id", None)
    
    return diagnosis_data


@router.delete("/patients/{patient_id}/diagnoses/{diagnosis_id}")
async def delete_patient_diagnosis(
    patient_id: str,
    diagnosis_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Delete a diagnosis from a patient"""
    result = await db.patient_diagnoses.delete_one({
        "id": diagnosis_id,
        "patient_id": patient_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    
    return {"success": True, "message": "Diagnosis deleted"}


# ============ DOCTOR DECISION PANEL ============

class DoctorDecision(BaseModel):
    booking_id: str
    decision_type: str  # instruction, medication_order, status_change, alert
    instruction: Optional[str] = None
    priority: str = "normal"  # low, normal, high, urgent
    target_role: Optional[str] = None  # driver, nurse, all
    medication_name: Optional[str] = None
    medication_dosage: Optional[str] = None
    medication_route: Optional[str] = None
    valid_until: Optional[str] = None


@router.post("/medical/decisions")
async def create_doctor_decision(
    decision: DoctorDecision,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create a doctor decision/instruction for a transport"""
    decision_data = {
        "id": str(uuid.uuid4()),
        **decision.model_dump(),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "created_by_name": user.get("full_name", "Unknown"),
        "acknowledged_by": [],
        "executed": False
    }
    
    await db.doctor_decisions.insert_one(decision_data)
    decision_data.pop("_id", None)
    
    # Log event
    logger.info(f"Doctor decision created: {decision.decision_type} for booking {decision.booking_id} by {user.get('full_name')}")
    
    return decision_data


@router.get("/medical/decisions/{booking_id}")
async def get_booking_decisions(
    booking_id: str,
    status: str = None,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get all doctor decisions for a booking"""
    query = {"booking_id": booking_id}
    if status:
        query["status"] = status
    
    decisions = await db.doctor_decisions.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return decisions


@router.put("/medical/decisions/{decision_id}/acknowledge")
async def acknowledge_decision(
    decision_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Acknowledge a doctor decision"""
    decision = await db.doctor_decisions.find_one({"id": decision_id})
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    acknowledged_by = decision.get("acknowledged_by", [])
    if user["id"] not in [a.get("user_id") for a in acknowledged_by]:
        acknowledged_by.append({
            "user_id": user["id"],
            "user_name": user.get("full_name", "Unknown"),
            "role": user.get("role"),
            "acknowledged_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.doctor_decisions.update_one(
        {"id": decision_id},
        {"$set": {"acknowledged_by": acknowledged_by}}
    )
    
    return {"success": True, "message": "Decision acknowledged"}


@router.put("/medical/decisions/{decision_id}/execute")
async def execute_decision(
    decision_id: str,
    notes: str = None,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Mark a doctor decision as executed"""
    result = await db.doctor_decisions.update_one(
        {"id": decision_id},
        {"$set": {
            "executed": True,
            "executed_at": datetime.now(timezone.utc).isoformat(),
            "executed_by": user["id"],
            "executed_by_name": user.get("full_name", "Unknown"),
            "execution_notes": notes,
            "status": "completed"
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    return {"success": True, "message": "Decision executed"}


@router.put("/medical/decisions/{decision_id}/cancel")
async def cancel_decision(
    decision_id: str,
    reason: str = None,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Cancel a doctor decision"""
    result = await db.doctor_decisions.update_one(
        {"id": decision_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancelled_by": user["id"],
            "cancelled_by_name": user.get("full_name", "Unknown"),
            "cancellation_reason": reason
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    return {"success": True, "message": "Decision cancelled"}


@router.get("/medical/active-decisions")
async def get_active_decisions(
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get all active decisions (for dashboard/notifications)"""
    # Filter by target_role if user is driver or nurse
    query = {"status": "active"}
    
    if user.get("role") == "driver":
        query["$or"] = [{"target_role": "driver"}, {"target_role": "all"}, {"target_role": None}]
    elif user.get("role") == "nurse":
        query["$or"] = [{"target_role": "nurse"}, {"target_role": "all"}, {"target_role": None}]
    
    decisions = await db.doctor_decisions.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Add booking info
    for decision in decisions:
        booking = await db.bookings.find_one({"id": decision.get("booking_id")}, {"_id": 0, "patient_name": 1, "status": 1})
        if not booking:
            booking = await db.patient_bookings.find_one({"id": decision.get("booking_id")}, {"_id": 0, "patient_name": 1, "status": 1})
        decision["booking_info"] = booking
    
    return decisions
