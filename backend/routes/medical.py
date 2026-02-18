"""
Medical routes - /medical/*, /patients/*, /transport/*
Handles: Medical patient profiles, vitals, checks, medications, diagnoses, dashboard, reports
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel
import uuid

from config import db, logger
from models import (
    UserRole,
    PatientMedicalProfileCreate, VitalSignsEntry, MedicalCheckCreate
)
from utils.auth import get_current_user, require_roles

router = APIRouter(tags=["Medical"])


# ============ PYDANTIC MODELS ============

class TransportVitalsEntry(BaseModel):
    booking_id: str
    patient_name: str
    # Core Vitals
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None
    temperature: Optional[float] = None
    blood_glucose: Optional[int] = None
    # GCS
    gcs_eye: Optional[int] = None
    gcs_verbal: Optional[int] = None
    gcs_motor: Optional[int] = None
    gcs_score: Optional[int] = None
    # Pain
    pain_level: Optional[int] = None
    pain_location: Optional[str] = None
    # Status
    consciousness_level: Optional[str] = None
    pupil_response: Optional[str] = None
    skin_condition: Optional[str] = None
    # Notes
    notes: Optional[str] = None
    interventions: Optional[List[str]] = []


class TransportNote(BaseModel):
    booking_id: str
    note_type: str  # observation, intervention, communication, handover
    content: str
    priority: str = "normal"  # low, normal, high, critical


class PatientDiagnosisCreate(BaseModel):
    code: str
    name_en: str
    name_sr: str
    category_en: str
    category_sr: str
    notes: Optional[str] = None


# ============ HELPER FUNCTIONS ============

def calculate_age(birth_date_str: str) -> int:
    """Calculate age from date of birth string (YYYY-MM-DD)"""
    try:
        birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d")
        today = datetime.now()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except:
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
    if vitals.get("systolic_bp"):
        if vitals["systolic_bp"] > 140:
            flags.append("HIGH_BP")
        elif vitals["systolic_bp"] < 90:
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
            {"jmbg": {"$regex": search, "$options": "i"}},
            {"contact_phone": {"$regex": search, "$options": "i"}}
        ]
    
    if blood_type:
        query["blood_type"] = blood_type
    
    if has_allergies is not None:
        if has_allergies:
            query["allergies"] = {"$exists": True, "$ne": []}
        else:
            query["$or"] = [{"allergies": {"$exists": False}}, {"allergies": []}]
    
    patients = await db.medical_patients.find(query, {"_id": 0}).skip(offset).limit(limit).sort("created_at", -1).to_list(limit)
    total = await db.medical_patients.count_documents(query)
    
    return {
        "patients": patients,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/medical/patients/{patient_id}")
async def get_medical_patient(
    patient_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get a specific patient profile"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]},
        {"_id": 0}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/medical/patients/{patient_id}")
async def update_medical_patient(
    patient_id: str,
    patient_update: PatientMedicalProfileCreate,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Update a patient profile"""
    existing = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    update_data = patient_update.model_dump(exclude_unset=True)
    
    if "date_of_birth" in update_data:
        update_data["age"] = calculate_age(update_data["date_of_birth"])
    
    if "height_cm" in update_data or "weight_kg" in update_data:
        height = update_data.get("height_cm", existing.get("height_cm"))
        weight = update_data.get("weight_kg", existing.get("weight_kg"))
        update_data["bmi"] = calculate_bmi(height, weight)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["id"]
    update_data["updated_by_name"] = user.get("full_name", "Unknown")
    
    await db.medical_patients.update_one(
        {"id": existing["id"]},
        {"$set": update_data}
    )
    
    updated = await db.medical_patients.find_one({"id": existing["id"]}, {"_id": 0})
    return updated


@router.delete("/medical/patients/{patient_id}")
async def delete_medical_patient(
    patient_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Delete a patient profile (Admin only)"""
    result = await db.medical_patients.delete_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"success": True, "message": "Patient deleted"}


@router.post("/medical/patients/{patient_id}/photo")
async def update_patient_photo(
    patient_id: str,
    photo_url: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Update patient photo URL"""
    result = await db.medical_patients.update_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]},
        {"$set": {
            "photo_url": photo_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"success": True}


# ============ VITAL SIGNS ROUTES ============

@router.post("/medical/vitals")
async def record_vital_signs(
    vitals: VitalSignsEntry,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Record vital signs for a patient"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": vitals.patient_id}, {"patient_id": vitals.patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    vitals_data = vitals.model_dump()
    vitals_data["id"] = str(uuid.uuid4())
    vitals_data["patient_id"] = patient["id"]
    vitals_data["recorded_by"] = user["id"]
    vitals_data["recorded_by_name"] = user.get("full_name", "Unknown")
    vitals_data["recorded_at"] = datetime.now(timezone.utc).isoformat()
    vitals_data["flags"] = check_vital_flags(vitals_data)
    
    await db.medical_vitals.insert_one(vitals_data)
    vitals_data.pop("_id", None)
    return vitals_data


@router.get("/medical/vitals/{patient_id}")
async def get_patient_vitals(
    patient_id: str,
    measurement_type: str = None,
    start_date: str = None,
    end_date: str = None,
    limit: int = 50,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get vital signs history for a patient"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    query = {"patient_id": patient["id"]}
    
    if measurement_type:
        query["measurement_type"] = measurement_type
    
    if start_date or end_date:
        query["recorded_at"] = {}
        if start_date:
            query["recorded_at"]["$gte"] = start_date
        if end_date:
            query["recorded_at"]["$lte"] = end_date
    
    vitals = await db.medical_vitals.find(query, {"_id": 0}).sort("recorded_at", -1).limit(limit).to_list(limit)
    return {"vitals": vitals}


@router.get("/medical/vitals/{patient_id}/latest")
async def get_latest_vitals(
    patient_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get the most recent vital signs for a patient"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    vitals = await db.medical_vitals.find_one(
        {"patient_id": patient["id"]},
        {"_id": 0},
        sort=[("recorded_at", -1)]
    )
    return vitals


# ============ MEDICAL CHECK / EXAMINATION ROUTES ============

@router.post("/medical/checks")
async def create_medical_check(
    check: MedicalCheckCreate,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create a medical check/examination record"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": check.patient_id}, {"patient_id": check.patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    check_data = check.model_dump()
    check_data["id"] = str(uuid.uuid4())
    check_data["patient_id"] = patient["id"]
    check_data["patient_name"] = patient.get("full_name")
    check_data["performed_by"] = user["id"]
    check_data["performed_by_name"] = user.get("full_name", "Unknown")
    check_data["performed_at"] = datetime.now(timezone.utc).isoformat()
    
    # If vitals included, also save to vitals collection
    if check.vitals:
        vitals_data = check.vitals.model_dump()
        vitals_data["id"] = str(uuid.uuid4())
        vitals_data["patient_id"] = patient["id"]
        vitals_data["recorded_by"] = user["id"]
        vitals_data["recorded_by_name"] = user.get("full_name", "Unknown")
        vitals_data["recorded_at"] = datetime.now(timezone.utc).isoformat()
        vitals_data["measurement_type"] = check.check_type
        vitals_data["flags"] = check_vital_flags(vitals_data)
        await db.medical_vitals.insert_one(vitals_data)
        check_data["vitals"]["id"] = vitals_data["id"]
    
    await db.medical_checks.insert_one(check_data)
    check_data.pop("_id", None)
    return check_data


@router.get("/medical/checks")
async def list_medical_checks(
    patient_id: str = None,
    check_type: str = None,
    start_date: str = None,
    end_date: str = None,
    limit: int = 50,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """List medical checks with filters"""
    query = {}
    
    if patient_id:
        patient = await db.medical_patients.find_one(
            {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
        )
        if patient:
            query["patient_id"] = patient["id"]
    
    if check_type:
        query["check_type"] = check_type
    
    if start_date or end_date:
        query["performed_at"] = {}
        if start_date:
            query["performed_at"]["$gte"] = start_date
        if end_date:
            query["performed_at"]["$lte"] = end_date
    
    checks = await db.medical_checks.find(query, {"_id": 0}).sort("performed_at", -1).limit(limit).to_list(limit)
    return {"checks": checks}


@router.get("/medical/checks/{check_id}")
async def get_medical_check(
    check_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get a specific medical check"""
    check = await db.medical_checks.find_one({"id": check_id}, {"_id": 0})
    if not check:
        raise HTTPException(status_code=404, detail="Medical check not found")
    return check


@router.post("/medical/checks/{check_id}/sign")
async def sign_medical_check(
    check_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR]))
):
    """Sign a medical check (Doctor only)"""
    check = await db.medical_checks.find_one({"id": check_id})
    if not check:
        raise HTTPException(status_code=404, detail="Medical check not found")
    
    await db.medical_checks.update_one(
        {"id": check_id},
        {"$set": {
            "signed_by": user["id"],
            "signed_by_name": user.get("full_name", "Unknown"),
            "signed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "message": "Medical check signed"}


# ============ EMERGENCY TRANSPORT VITALS ============

@router.post("/transport/vitals")
async def record_transport_vitals(
    vitals: TransportVitalsEntry,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Record vitals during emergency transport"""
    booking = await db.bookings.find_one({"id": vitals.booking_id})
    if not booking:
        booking = await db.patient_bookings.find_one({"id": vitals.booking_id})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    vitals_data = vitals.model_dump()
    vitals_data["id"] = str(uuid.uuid4())
    vitals_data["recorded_by"] = user["id"]
    vitals_data["recorded_by_name"] = user.get("full_name", "Unknown")
    vitals_data["recorded_at"] = datetime.now(timezone.utc).isoformat()
    vitals_data["flags"] = check_vital_flags(vitals_data)
    
    await db.transport_vitals.insert_one(vitals_data)
    vitals_data.pop("_id", None)
    
    # Broadcast to medical staff
    from routes.driver import manager
    if manager:
        await manager.broadcast_to_admins({
            "type": "transport_vitals_update",
            "booking_id": vitals.booking_id,
            "vitals": vitals_data,
            "has_critical": any(f in vitals_data.get("flags", []) for f in ["CRITICAL_SPO2", "SEVERE_CONSCIOUSNESS", "LOW_BP"])
        })
    
    return vitals_data


@router.get("/transport/vitals/{booking_id}")
async def get_transport_vitals(
    booking_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get all vitals recorded during a transport"""
    vitals = await db.transport_vitals.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("recorded_at", -1).to_list(100)
    
    # Get latest vitals with trend analysis
    latest = vitals[0] if vitals else None
    
    trend = None
    if len(vitals) >= 2:
        current = vitals[0]
        previous = vitals[1]
        trend = {
            "bp": "stable",
            "hr": "stable",
            "spo2": "stable"
        }
        
        if current.get("systolic_bp") and previous.get("systolic_bp"):
            diff = current["systolic_bp"] - previous["systolic_bp"]
            if diff > 10:
                trend["bp"] = "increasing"
            elif diff < -10:
                trend["bp"] = "decreasing"
        
        if current.get("heart_rate") and previous.get("heart_rate"):
            diff = current["heart_rate"] - previous["heart_rate"]
            if diff > 10:
                trend["hr"] = "increasing"
            elif diff < -10:
                trend["hr"] = "decreasing"
        
        if current.get("oxygen_saturation") and previous.get("oxygen_saturation"):
            diff = current["oxygen_saturation"] - previous["oxygen_saturation"]
            if diff > 2:
                trend["spo2"] = "improving"
            elif diff < -2:
                trend["spo2"] = "deteriorating"
    
    return {
        "vitals": vitals,
        "latest": latest,
        "trend": trend,
        "count": len(vitals)
    }


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


@router.get("/medical/alerts")
async def get_medical_alerts(
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get medical alerts for dashboard"""
    alerts = []
    
    # Critical vitals in last 24 hours
    day_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    critical_vitals = await db.medical_vitals.find(
        {
            "recorded_at": {"$gte": day_ago},
            "flags": {"$exists": True, "$ne": []}
        },
        {"_id": 0}
    ).sort("recorded_at", -1).to_list(50)
    
    for vital in critical_vitals:
        flags = vital.get("flags", [])
        for flag in flags:
            priority = "high" if flag in ["CRITICAL_SPO2", "SEVERE_CONSCIOUSNESS", "LOW_BP"] else "medium"
            
            patient = await db.medical_patients.find_one({"id": vital.get("patient_id")}, {"_id": 0})
            
            alerts.append({
                "id": f"{vital['id']}-{flag}",
                "type": "vital_flag",
                "flag": flag,
                "patient_id": vital.get("patient_id"),
                "patient_name": patient.get("full_name") if patient else vital.get("patient_name", "Unknown"),
                "priority": priority,
                "timestamp": vital.get("recorded_at"),
                "vital_id": vital.get("id")
            })
    
    # Active transports with critical vitals
    active_bookings = await db.bookings.find(
        {"status": {"$in": ["en_route", "picked_up"]}},
        {"_id": 0}
    ).to_list(20)
    
    for booking in active_bookings:
        transport_vitals = await db.transport_vitals.find_one(
            {"booking_id": booking["id"], "flags": {"$in": ["CRITICAL_SPO2", "SEVERE_CONSCIOUSNESS"]}},
            {"_id": 0},
            sort=[("recorded_at", -1)]
        )
        
        if transport_vitals:
            alerts.append({
                "id": f"transport-{booking['id']}",
                "type": "transport_critical",
                "booking_id": booking["id"],
                "patient_name": booking.get("patient_name"),
                "flags": transport_vitals.get("flags"),
                "priority": "critical",
                "timestamp": transport_vitals.get("recorded_at")
            })
    
    # Sort by priority and timestamp
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda x: (priority_order.get(x.get("priority"), 4), x.get("timestamp") or ""))
    
    return {"alerts": alerts[:50]}


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
    
    # Event 1: Booking created
    events.append({
        "id": f"{booking_id}-created",
        "type": "booking_created",
        "title": "Transport Created",
        "title_sr": "Transport kreiran",
        "description": f"Patient: {booking.get('patient_name', 'N/A')}",
        "description_sr": f"Pacijent: {booking.get('patient_name', 'N/A')}",
        "timestamp": booking.get("created_at") or booking.get("booking_time"),
        "icon": "plus",
        "color": "blue"
    })
    
    # Event 2: Driver assigned
    if booking.get("assigned_driver") or booking.get("assigned_driver_id"):
        events.append({
            "id": f"{booking_id}-driver",
            "type": "driver_assigned",
            "title": "Driver Assigned",
            "title_sr": "Vozač dodeljen",
            "description": f"Driver: {booking.get('assigned_driver_name', 'N/A')}",
            "description_sr": f"Vozač: {booking.get('assigned_driver_name', 'N/A')}",
            "timestamp": booking.get("driver_accepted_at") or booking.get("updated_at"),
            "icon": "user",
            "color": "green"
        })
    
    # Event 3: Status changes
    status_events = {
        "en_route": ("En Route", "Na putu", "truck", "orange"),
        "picked_up": ("Patient Picked Up", "Pacijent preuzet", "user-check", "teal"),
        "on_site": ("On Site", "Na lokaciji", "map-pin", "purple"),
        "completed": ("Completed", "Završeno", "check-circle", "green"),
        "cancelled": ("Cancelled", "Otkazano", "x-circle", "red")
    }
    
    current_status = booking.get("status")
    if current_status in status_events:
        title, title_sr, icon, color = status_events[current_status]
        events.append({
            "id": f"{booking_id}-status-{current_status}",
            "type": f"status_{current_status}",
            "title": title,
            "title_sr": title_sr,
            "description": f"Status changed to {current_status}",
            "description_sr": f"Status promenjen u {current_status}",
            "timestamp": booking.get("updated_at"),
            "icon": icon,
            "color": color
        })
    
    # Event 4: Vitals recorded
    transport_vitals = await db.transport_vitals.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("recorded_at", 1).to_list(50)
    
    for idx, vital in enumerate(transport_vitals):
        has_critical = any(f in vital.get("flags", []) for f in ["CRITICAL_SPO2", "SEVERE_CONSCIOUSNESS", "LOW_BP"])
        events.append({
            "id": f"{booking_id}-vitals-{idx}",
            "type": "vitals_recorded",
            "title": "Vitals Recorded",
            "title_sr": "Vitalni znaci zabeleženi",
            "description": f"BP: {vital.get('systolic_bp', '-')}/{vital.get('diastolic_bp', '-')}, HR: {vital.get('heart_rate', '-')}, SpO2: {vital.get('oxygen_saturation', '-')}%",
            "description_sr": f"TA: {vital.get('systolic_bp', '-')}/{vital.get('diastolic_bp', '-')}, Puls: {vital.get('heart_rate', '-')}, SpO2: {vital.get('oxygen_saturation', '-')}%",
            "timestamp": vital.get("recorded_at"),
            "icon": "heart",
            "color": "red" if has_critical else "blue",
            "flags": vital.get("flags", []),
            "recorded_by": vital.get("recorded_by_name")
        })
    
    # Event 5: Notes
    transport_notes = await db.transport_notes.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    for note in transport_notes:
        events.append({
            "id": note.get("id"),
            "type": f"note_{note.get('note_type')}",
            "title": f"Note: {note.get('note_type', 'General').title()}",
            "title_sr": f"Napomena: {note.get('note_type', 'opšta').title()}",
            "description": note.get("content"),
            "description_sr": note.get("content"),
            "timestamp": note.get("created_at"),
            "icon": "file-text",
            "color": "gray",
            "priority": note.get("priority"),
            "created_by": note.get("created_by_name")
        })
    
    # Sort by timestamp
    events.sort(key=lambda x: x.get("timestamp") or "")
    
    return {"timeline": events, "booking": booking}


@router.post("/transport/notes")
async def add_transport_note(
    note: TransportNote,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Add a note during transport"""
    booking = await db.bookings.find_one({"id": note.booking_id})
    if not booking:
        booking = await db.patient_bookings.find_one({"id": note.booking_id})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    note_data = note.model_dump()
    note_data["id"] = str(uuid.uuid4())
    note_data["created_by"] = user["id"]
    note_data["created_by_name"] = user.get("full_name", "Unknown")
    note_data["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.transport_notes.insert_one(note_data)
    note_data.pop("_id", None)
    
    return note_data


# ============ MEDICATIONS MANAGEMENT ============

@router.get("/medications/library")
async def get_medications_library(
    search: str = None,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get the medication library"""
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    medications = await db.medications_library.find(query, {"_id": 0}).sort("usage_count", -1).to_list(100)
    return medications


@router.post("/medications/library")
async def add_medication_to_library(
    name: str,
    default_dosage_mg: float = None,
    dosage_unit: str = "mg",
    category: str = None,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Add a new medication to the library"""
    existing = await db.medications_library.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
    if existing:
        await db.medications_library.update_one(
            {"id": existing["id"]},
            {"$inc": {"usage_count": 1}}
        )
        return existing
    
    medication = {
        "id": str(uuid.uuid4()),
        "name": name,
        "default_dosage_mg": default_dosage_mg,
        "dosage_unit": dosage_unit or "mg",
        "category": category,
        "usage_count": 1,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.medications_library.insert_one(medication)
    return {k: v for k, v in medication.items() if k != "_id"}


@router.post("/patients/{patient_id}/medications")
async def administer_medication(
    patient_id: str,
    medication_name: str,
    dosage: float,
    dosage_unit: str = "mg",
    route: str = "oral",
    notes: str = None,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Record medication administration for a patient"""
    patient = await db.medical_patients.find_one({"id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    administration = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "medication_name": medication_name,
        "dosage": dosage,
        "dosage_unit": dosage_unit,
        "route": route,
        "administered_at": now,
        "administered_by": user["id"],
        "administered_by_name": user["full_name"],
        "notes": notes
    }
    await db.patient_medications.insert_one(administration)
    
    # Update medication library
    existing_med = await db.medications_library.find_one(
        {"name": {"$regex": f"^{medication_name}$", "$options": "i"}}
    )
    if existing_med:
        await db.medications_library.update_one(
            {"id": existing_med["id"]},
            {"$inc": {"usage_count": 1}}
        )
    else:
        new_med = {
            "id": str(uuid.uuid4()),
            "name": medication_name,
            "default_dosage_mg": dosage if dosage_unit == "mg" else None,
            "dosage_unit": dosage_unit,
            "category": None,
            "usage_count": 1,
            "created_by": user["id"],
            "created_at": now
        }
        await db.medications_library.insert_one(new_med)
    
    return {k: v for k, v in administration.items() if k != "_id"}


@router.get("/patients/{patient_id}/medications")
async def get_patient_medications(
    patient_id: str,
    from_date: str = None,
    to_date: str = None,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get medication history for a patient"""
    query = {"patient_id": patient_id}
    
    if from_date:
        query["administered_at"] = {"$gte": from_date}
    if to_date:
        if "administered_at" in query:
            query["administered_at"]["$lte"] = to_date
        else:
            query["administered_at"] = {"$lte": to_date}
    
    medications = await db.patient_medications.find(query, {"_id": 0}).sort("administered_at", -1).to_list(500)
    return medications


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
    diagnosis: PatientDiagnosisCreate,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Add a diagnosis to a patient's record"""
    patient = await db.medical_patients.find_one(
        {"$or": [{"id": patient_id}, {"patient_id": patient_id}]}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    existing = await db.patient_diagnoses.find_one({
        "patient_id": patient_id,
        "code": diagnosis.code
    })
    if existing:
        raise HTTPException(status_code=400, detail="Diagnosis already recorded for this patient")
    
    diagnosis_doc = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "code": diagnosis.code,
        "name_en": diagnosis.name_en,
        "name_sr": diagnosis.name_sr,
        "category_en": diagnosis.category_en,
        "category_sr": diagnosis.category_sr,
        "notes": diagnosis.notes,
        "added_by": user["id"],
        "added_by_name": user["full_name"],
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.patient_diagnoses.insert_one(diagnosis_doc)
    return {k: v for k, v in diagnosis_doc.items() if k != "_id"}


@router.delete("/patients/{patient_id}/diagnoses/{diagnosis_id}")
async def remove_patient_diagnosis(
    patient_id: str,
    diagnosis_id: str,
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Remove a diagnosis from a patient's record"""
    result = await db.patient_diagnoses.delete_one({
        "id": diagnosis_id,
        "patient_id": patient_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    return {"success": True, "message": "Diagnosis removed"}


# ============ PATIENT REPORT GENERATION ============

@router.get("/patients/{patient_id}/report")
async def generate_patient_report(
    patient_id: str,
    from_date: str = None,
    to_date: str = None,
    format: str = "json",
    user: dict = Depends(require_roles([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Generate a comprehensive patient report"""
    patient = await db.medical_patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    date_filter = {}
    if from_date:
        date_filter["$gte"] = from_date
    if to_date:
        date_filter["$lte"] = to_date
    
    # Get vitals
    vitals_query = {"patient_id": patient_id}
    if date_filter:
        vitals_query["recorded_at"] = date_filter
    vitals = await db.medical_vitals.find(vitals_query, {"_id": 0}).sort("recorded_at", -1).to_list(100)
    
    # Get checks
    checks_query = {"patient_id": patient_id}
    if date_filter:
        checks_query["performed_at"] = date_filter
    checks = await db.medical_checks.find(checks_query, {"_id": 0}).sort("performed_at", -1).to_list(50)
    
    # Get medications
    meds_query = {"patient_id": patient_id}
    if date_filter:
        meds_query["administered_at"] = date_filter
    medications = await db.patient_medications.find(meds_query, {"_id": 0}).sort("administered_at", -1).to_list(100)
    
    # Get diagnoses
    diagnoses = await db.patient_diagnoses.find({"patient_id": patient_id}, {"_id": 0}).sort("added_at", -1).to_list(50)
    
    report_data = {
        "patient": patient,
        "period": {
            "from": from_date or "All time",
            "to": to_date or "Present"
        },
        "vitals": {
            "records": vitals,
            "count": len(vitals),
            "latest": vitals[0] if vitals else None
        },
        "examinations": {
            "records": checks,
            "count": len(checks)
        },
        "medications": {
            "records": medications,
            "count": len(medications)
        },
        "diagnoses": {
            "records": diagnoses,
            "count": len(diagnoses)
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": user.get("full_name", "Unknown")
    }
    
    if format == "pdf":
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from io import BytesIO
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#0ea5e9'))
        story.append(Paragraph(f"Izveštaj Pacijenta: {patient.get('full_name', 'N/A')}", title_style))
        story.append(Spacer(1, 12))
        
        # Patient Info
        story.append(Paragraph("Podaci o pacijentu", styles['Heading2']))
        patient_info = [
            ["ID Pacijenta:", patient.get("patient_id", "N/A")],
            ["Datum rođenja:", patient.get("date_of_birth", "N/A")],
            ["Krvna grupa:", patient.get("blood_type", "N/A")],
            ["Alergije:", ", ".join(patient.get("allergies", [])) or "Nema"]
        ]
        t = Table(patient_info, colWidths=[150, 300])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
        ]))
        story.append(t)
        story.append(Spacer(1, 20))
        
        # Diagnoses
        if diagnoses:
            story.append(Paragraph("Dijagnoze", styles['Heading2']))
            for diag in diagnoses[:10]:
                story.append(Paragraph(f"• {diag.get('code')}: {diag.get('name_sr', diag.get('name_en', 'N/A'))}", styles['Normal']))
            story.append(Spacer(1, 20))
        
        # Latest Vitals
        if vitals:
            story.append(Paragraph("Poslednji Vitalni Znaci", styles['Heading2']))
            latest = vitals[0]
            vitals_info = [
                ["Krvni pritisak:", f"{latest.get('systolic_bp', '-')}/{latest.get('diastolic_bp', '-')} mmHg"],
                ["Puls:", f"{latest.get('heart_rate', '-')} bpm"],
                ["SpO2:", f"{latest.get('oxygen_saturation', '-')}%"],
                ["Temperatura:", f"{latest.get('temperature', '-')} °C"],
                ["Zabeleženo:", latest.get('recorded_at', 'N/A')[:10]]
            ]
            t = Table(vitals_info, colWidths=[150, 300])
            t.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
            ]))
            story.append(t)
        
        doc.build(story)
        buffer.seek(0)
        
        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=patient_report_{patient_id[:8]}.pdf"}
        )
    
    return report_data
