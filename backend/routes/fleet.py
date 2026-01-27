"""
Fleet Management routes - /fleet/*
Extracted from server.py for modular backend architecture
Handles: Vehicles, Teams, Missions, History, Audit
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import List, Optional
import uuid

from config import db, logger
from models import (
    UserRole, VehicleStatus, TeamRole,
    VehicleCreate, VehicleUpdate,
    TeamMemberAssignment
)
from utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/fleet", tags=["Fleet Management"])


# ============ AUDIT HELPER ============

async def log_team_audit(
    vehicle_id: str,
    action: str,
    performed_by: str,
    performed_by_name: str,
    user_id: str = None,
    user_name: str = None,
    role: str = None,
    mission_id: str = None,
    reason: str = None,
    handover_notes: str = None,
    previous_state: dict = None,
    new_state: dict = None
):
    """Log team assignment changes for audit trail"""
    audit_entry = {
        "id": str(uuid.uuid4()),
        "vehicle_id": vehicle_id,
        "mission_id": mission_id,
        "action": action,
        "user_id": user_id,
        "user_name": user_name,
        "role": role,
        "performed_by": performed_by,
        "performed_by_name": performed_by_name,
        "reason": reason,
        "handover_notes": handover_notes,
        "previous_state": previous_state,
        "new_state": new_state,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.team_audit.insert_one(audit_entry)
    return audit_entry


# ============ VEHICLES ============

@router.get("/vehicles")
async def get_vehicles(user: dict = Depends(get_current_user)):
    """Get all vehicles with current team and status"""
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(100)
    
    for vehicle in vehicles:
        team_assignments = await db.vehicle_teams.find(
            {"vehicle_id": vehicle["id"], "is_active": True},
            {"_id": 0}
        ).to_list(20)
        
        current_team = []
        for assignment in team_assignments:
            user_info = await db.users.find_one(
                {"id": assignment["user_id"]},
                {"_id": 0, "id": 1, "full_name": 1, "role": 1, "phone": 1}
            )
            if user_info:
                current_team.append({
                    **assignment,
                    "name": user_info.get("full_name"),
                    "full_name": user_info.get("full_name"),
                    "user_name": user_info.get("full_name"),
                    "user_phone": user_info.get("phone"),
                    "phone": user_info.get("phone"),
                    "user_system_role": user_info.get("role")
                })
        vehicle["current_team"] = current_team
        vehicle["team"] = current_team
        
        active_booking = await db.patient_bookings.find_one(
            {"assigned_vehicle_id": vehicle["id"], "status": {"$in": ["en_route", "picked_up"]}},
            {"_id": 0, "id": 1, "patient_name": 1, "status": 1}
        )
        vehicle["current_mission"] = active_booking
    
    return vehicles


@router.post("/vehicles")
async def create_vehicle(
    vehicle: VehicleCreate,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create a new vehicle"""
    vehicle_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    vehicle_doc = {
        "id": vehicle_id,
        "name": vehicle.name,
        "registration_plate": vehicle.registration_plate,
        "vehicle_type": vehicle.vehicle_type,
        "status": VehicleStatus.AVAILABLE,
        "capacity": vehicle.capacity,
        "equipment": vehicle.equipment,
        "notes": vehicle.notes,
        "required_roles": vehicle.required_roles,
        "optional_roles": vehicle.optional_roles,
        "shift_schedules": [],
        "created_at": now,
        "created_by": user["id"],
        "updated_at": now
    }
    
    await db.vehicles.insert_one(vehicle_doc)
    
    await log_team_audit(
        vehicle_id=vehicle_id,
        action="vehicle_created",
        performed_by=user["id"],
        performed_by_name=user["full_name"],
        new_state={"vehicle": vehicle.name}
    )
    
    return {**vehicle_doc, "_id": None, "current_team": []}


@router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str, user: dict = Depends(get_current_user)):
    """Get single vehicle with full details"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    team_assignments = await db.vehicle_teams.find(
        {"vehicle_id": vehicle_id, "is_active": True},
        {"_id": 0}
    ).to_list(20)
    
    current_team = []
    for assignment in team_assignments:
        user_info = await db.users.find_one(
            {"id": assignment["user_id"]},
            {"_id": 0, "id": 1, "full_name": 1, "role": 1, "phone": 1}
        )
        if user_info:
            current_team.append({
                **assignment,
                "user_name": user_info.get("full_name"),
                "user_phone": user_info.get("phone")
            })
    vehicle["current_team"] = current_team
    
    missions = await db.patient_bookings.find(
        {"assigned_vehicle_id": vehicle_id},
        {"_id": 0, "id": 1, "patient_name": 1, "status": 1, "preferred_date": 1}
    ).sort("preferred_date", -1).limit(10).to_list(10)
    vehicle["recent_missions"] = missions
    
    audits = await db.team_audit.find(
        {"vehicle_id": vehicle_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)
    vehicle["audit_trail"] = audits
    
    return vehicle


@router.put("/vehicles/{vehicle_id}")
async def update_vehicle(
    vehicle_id: str,
    update: VehicleUpdate,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Update vehicle details"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": update_data})
    
    return {"message": "Vehicle updated", "vehicle_id": vehicle_id}


@router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Delete a vehicle (admin and superadmin)"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    active_mission = await db.patient_bookings.find_one(
        {"assigned_vehicle_id": vehicle_id, "status": {"$in": ["en_route", "picked_up"]}}
    )
    if active_mission:
        raise HTTPException(status_code=400, detail="Cannot delete vehicle with active mission")
    
    await db.vehicles.delete_one({"id": vehicle_id})
    await db.vehicle_teams.delete_many({"vehicle_id": vehicle_id})
    
    return {"message": "Vehicle deleted"}


# ============ TEAM ASSIGNMENT ============

@router.post("/vehicles/{vehicle_id}/team")
async def assign_team_member(
    vehicle_id: str,
    assignment: TeamMemberAssignment,
    reason: str = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Assign a team member to a vehicle"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    lock = await db.team_locks.find_one({"vehicle_id": vehicle_id, "is_active": True})
    if lock:
        raise HTTPException(
            status_code=400, 
            detail="Vehicle team is locked during active mission. Use emergency override if needed."
        )
    
    team_user = await db.users.find_one({"id": assignment.user_id})
    if not team_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing = await db.vehicle_teams.find_one({
        "vehicle_id": vehicle_id,
        "user_id": assignment.user_id,
        "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="User already assigned to this vehicle")
    
    other_vehicle = await db.vehicle_teams.find_one({
        "user_id": assignment.user_id,
        "is_active": True,
        "vehicle_id": {"$ne": vehicle_id}
    })
    if other_vehicle:
        other_v = await db.vehicles.find_one({"id": other_vehicle["vehicle_id"]})
        logger.warning(f"User {team_user['full_name']} reassigned from {other_v['name'] if other_v else 'unknown'}")
        await db.vehicle_teams.update_one(
            {"id": other_vehicle["id"]},
            {"$set": {"is_active": False, "removed_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    now = datetime.now(timezone.utc).isoformat()
    assignment_doc = {
        "id": str(uuid.uuid4()),
        "vehicle_id": vehicle_id,
        "user_id": assignment.user_id,
        "role": assignment.role,
        "is_primary": assignment.is_primary,
        "is_remote": assignment.is_remote,
        "assigned_at": now,
        "assigned_by": user["id"],
        "is_active": True
    }
    
    await db.vehicle_teams.insert_one(assignment_doc)
    
    await log_team_audit(
        vehicle_id=vehicle_id,
        action="member_assigned",
        user_id=assignment.user_id,
        user_name=team_user["full_name"],
        role=assignment.role,
        performed_by=user["id"],
        performed_by_name=user["full_name"],
        reason=reason,
        new_state={"role": assignment.role, "is_remote": assignment.is_remote}
    )
    
    return {"message": "Team member assigned", "assignment_id": assignment_doc["id"]}


@router.delete("/vehicles/{vehicle_id}/team/{user_id}")
async def remove_team_member(
    vehicle_id: str,
    user_id: str,
    reason: str = None,
    handover_notes: str = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Remove a team member from a vehicle"""
    assignment = await db.vehicle_teams.find_one({
        "vehicle_id": vehicle_id,
        "user_id": user_id,
        "is_active": True
    })
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    lock = await db.team_locks.find_one({"vehicle_id": vehicle_id, "is_active": True})
    if lock:
        raise HTTPException(status_code=400, detail="Vehicle team is locked during active mission")
    
    team_user = await db.users.find_one({"id": user_id})
    
    await db.vehicle_teams.update_one(
        {"id": assignment["id"]},
        {"$set": {
            "is_active": False,
            "removed_at": datetime.now(timezone.utc).isoformat(),
            "removed_by": user["id"],
            "removal_reason": reason,
            "handover_notes": handover_notes
        }}
    )
    
    await log_team_audit(
        vehicle_id=vehicle_id,
        action="member_removed",
        user_id=user_id,
        user_name=team_user["full_name"] if team_user else "Unknown",
        role=assignment["role"],
        performed_by=user["id"],
        performed_by_name=user["full_name"],
        reason=reason,
        handover_notes=handover_notes,
        previous_state={"role": assignment["role"]}
    )
    
    return {"message": "Team member removed"}


@router.put("/vehicles/{vehicle_id}/team/{user_id}/replace")
async def replace_team_member(
    vehicle_id: str,
    user_id: str,
    new_assignment: TeamMemberAssignment,
    handover_notes: str = None,
    reason: str = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Replace a team member with another (shift change with handover)"""
    old_assignment = await db.vehicle_teams.find_one({
        "vehicle_id": vehicle_id,
        "user_id": user_id,
        "is_active": True
    })
    if not old_assignment:
        raise HTTPException(status_code=404, detail="Current assignment not found")
    
    old_user = await db.users.find_one({"id": user_id})
    new_user = await db.users.find_one({"id": new_assignment.user_id})
    if not new_user:
        raise HTTPException(status_code=404, detail="New user not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.vehicle_teams.update_one(
        {"id": old_assignment["id"]},
        {"$set": {
            "is_active": False,
            "removed_at": now,
            "removed_by": user["id"],
            "replaced_by": new_assignment.user_id,
            "handover_notes": handover_notes
        }}
    )
    
    new_assignment_doc = {
        "id": str(uuid.uuid4()),
        "vehicle_id": vehicle_id,
        "user_id": new_assignment.user_id,
        "role": new_assignment.role or old_assignment["role"],
        "is_primary": new_assignment.is_primary,
        "is_remote": new_assignment.is_remote,
        "assigned_at": now,
        "assigned_by": user["id"],
        "replaces": user_id,
        "is_active": True
    }
    await db.vehicle_teams.insert_one(new_assignment_doc)
    
    await log_team_audit(
        vehicle_id=vehicle_id,
        action="member_replaced",
        user_id=new_assignment.user_id,
        user_name=new_user["full_name"],
        role=new_assignment.role or old_assignment["role"],
        performed_by=user["id"],
        performed_by_name=user["full_name"],
        reason=reason,
        handover_notes=handover_notes,
        previous_state={"user": old_user["full_name"] if old_user else "Unknown", "role": old_assignment["role"]},
        new_state={"user": new_user["full_name"], "role": new_assignment.role or old_assignment["role"]}
    )
    
    return {"message": "Team member replaced", "assignment_id": new_assignment_doc["id"]}


# ============ TEAM LOCKING ============

@router.post("/vehicles/{vehicle_id}/lock")
async def lock_vehicle_team(
    vehicle_id: str,
    mission_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DOCTOR, UserRole.NURSE]))
):
    """Lock vehicle team when mission starts - prevents changes during transport"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    existing_lock = await db.team_locks.find_one({"vehicle_id": vehicle_id, "is_active": True})
    if existing_lock:
        raise HTTPException(status_code=400, detail="Vehicle team already locked")
    
    team_assignments = await db.vehicle_teams.find(
        {"vehicle_id": vehicle_id, "is_active": True},
        {"_id": 0}
    ).to_list(20)
    
    required_roles = vehicle.get("required_roles", ["driver", "nurse"])
    filled_roles = [a["role"] for a in team_assignments]
    missing_roles = [r for r in required_roles if r not in filled_roles]
    
    if missing_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start mission. Missing required roles: {', '.join(missing_roles)}"
        )
    
    now = datetime.now(timezone.utc).isoformat()
    lock_doc = {
        "id": str(uuid.uuid4()),
        "vehicle_id": vehicle_id,
        "mission_id": mission_id,
        "locked_team": team_assignments,
        "locked_at": now,
        "locked_by": user["id"],
        "is_active": True
    }
    await db.team_locks.insert_one(lock_doc)
    
    await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {"status": VehicleStatus.ON_MISSION, "current_mission_id": mission_id}}
    )
    
    await log_team_audit(
        vehicle_id=vehicle_id,
        mission_id=mission_id,
        action="team_locked",
        performed_by=user["id"],
        performed_by_name=user["full_name"],
        new_state={"team_size": len(team_assignments), "mission_id": mission_id}
    )
    
    return {"message": "Team locked for mission", "lock_id": lock_doc["id"]}


@router.post("/vehicles/{vehicle_id}/unlock")
async def unlock_vehicle_team(
    vehicle_id: str,
    reason: str = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Unlock vehicle team when mission ends"""
    lock = await db.team_locks.find_one({"vehicle_id": vehicle_id, "is_active": True})
    if not lock:
        raise HTTPException(status_code=404, detail="No active lock found")
    
    await db.team_locks.update_one(
        {"id": lock["id"]},
        {"$set": {
            "is_active": False,
            "unlocked_at": datetime.now(timezone.utc).isoformat(),
            "unlocked_by": user["id"],
            "unlock_reason": reason
        }}
    )
    
    await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {"status": VehicleStatus.AVAILABLE, "current_mission_id": None}}
    )
    
    await log_team_audit(
        vehicle_id=vehicle_id,
        mission_id=lock.get("mission_id"),
        action="team_unlocked",
        performed_by=user["id"],
        performed_by_name=user["full_name"],
        reason=reason
    )
    
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    history_entry = {
        "id": str(uuid.uuid4()),
        "vehicle_id": vehicle_id,
        "vehicle_name": vehicle.get("name", "Unknown") if vehicle else "Unknown",
        "vehicle_registration": vehicle.get("registration_plate", "N/A") if vehicle else "N/A",
        "mission_id": lock.get("mission_id"),
        "booking_id": lock.get("booking_id"),
        "team": lock.get("locked_team", []),
        "started_at": lock.get("locked_at"),
        "ended_at": datetime.now(timezone.utc).isoformat(),
        "ended_by": user["id"],
        "ended_by_name": user["full_name"],
        "reason": reason,
        "status": "completed"
    }
    await db.fleet_history.insert_one(history_entry)
    
    return {"message": "Team unlocked"}


# ============ FLEET HISTORY ============

@router.get("/history")
async def get_fleet_history(
    search: str = None,
    vehicle_id: str = None,
    from_date: str = None,
    to_date: str = None,
    limit: int = 100,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DOCTOR, UserRole.NURSE]))
):
    """Get fleet mission history with search and filters"""
    query = {}
    
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    
    if from_date:
        query["started_at"] = {"$gte": from_date}
    
    if to_date:
        if "started_at" in query:
            query["started_at"]["$lte"] = to_date
        else:
            query["ended_at"] = {"$lte": to_date}
    
    history = await db.fleet_history.find(query, {"_id": 0}).sort("ended_at", -1).to_list(limit)
    
    if search:
        search_lower = search.lower()
        history = [
            h for h in history
            if search_lower in h.get("vehicle_name", "").lower()
            or search_lower in h.get("vehicle_registration", "").lower()
            or search_lower in h.get("mission_id", "").lower()
            or any(search_lower in m.get("user_name", "").lower() for m in h.get("team", []))
        ]
    
    return history


@router.get("/history/{history_id}")
async def get_fleet_history_detail(
    history_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DOCTOR, UserRole.NURSE]))
):
    """Get detailed fleet history entry"""
    entry = await db.fleet_history.find_one({"id": history_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")
    return entry


# ============ MISSION COMPLETION ============

@router.post("/vehicles/{vehicle_id}/complete-mission")
async def complete_vehicle_mission(
    vehicle_id: str,
    booking_id: str = None,
    notes: str = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER]))
):
    """Complete a mission and save to history"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    current_team = await db.vehicle_teams.find(
        {"vehicle_id": vehicle_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    lock = await db.team_locks.find_one({"vehicle_id": vehicle_id, "is_active": True})
    
    now = datetime.now(timezone.utc).isoformat()
    
    history_entry = {
        "id": str(uuid.uuid4()),
        "vehicle_id": vehicle_id,
        "vehicle_name": vehicle.get("name", "Unknown"),
        "vehicle_registration": vehicle.get("registration_plate", "N/A"),
        "mission_id": lock.get("mission_id") if lock else str(uuid.uuid4())[:8],
        "booking_id": booking_id,
        "team": [
            {
                "user_id": t.get("user_id"),
                "user_name": t.get("user_name"),
                "role": t.get("role"),
                "is_remote": t.get("is_remote", False)
            }
            for t in current_team
        ],
        "started_at": lock.get("locked_at") if lock else vehicle.get("mission_started_at", now),
        "ended_at": now,
        "ended_by": user["id"],
        "ended_by_name": user["full_name"],
        "notes": notes,
        "status": "completed"
    }
    await db.fleet_history.insert_one(history_entry)
    
    if lock:
        await db.team_locks.update_one(
            {"id": lock["id"]},
            {"$set": {
                "is_active": False,
                "unlocked_at": now,
                "unlocked_by": user["id"]
            }}
        )
    
    await db.vehicle_teams.update_many(
        {"vehicle_id": vehicle_id, "is_active": True},
        {"$set": {"is_active": False, "removed_at": now, "removed_reason": "mission_completed"}}
    )
    
    await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {
            "status": VehicleStatus.AVAILABLE,
            "current_mission_id": None
        }}
    )
    
    await log_team_audit(
        vehicle_id=vehicle_id,
        mission_id=history_entry["mission_id"],
        action="mission_completed",
        performed_by=user["id"],
        performed_by_name=user["full_name"],
        reason=notes
    )
    
    return {"message": "Mission completed", "history_id": history_entry["id"]}


# ============ EMERGENCY OVERRIDE ============

@router.post("/vehicles/{vehicle_id}/emergency-override")
async def emergency_team_override(
    vehicle_id: str,
    new_member: TeamMemberAssignment,
    remove_user_id: str = None,
    reason: str = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Emergency override to change team during active mission"""
    lock = await db.team_locks.find_one({"vehicle_id": vehicle_id, "is_active": True})
    if not lock:
        raise HTTPException(status_code=400, detail="No active lock - use regular assignment")
    
    if not reason:
        raise HTTPException(status_code=400, detail="Emergency override requires a reason")
    
    new_user = await db.users.find_one({"id": new_member.user_id})
    if not new_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if remove_user_id:
        old_assignment = await db.vehicle_teams.find_one({
            "vehicle_id": vehicle_id,
            "user_id": remove_user_id,
            "is_active": True
        })
        if old_assignment:
            old_user = await db.users.find_one({"id": remove_user_id})
            await db.vehicle_teams.update_one(
                {"id": old_assignment["id"]},
                {"$set": {"is_active": False, "removed_at": now, "emergency_removal": True}}
            )
            await log_team_audit(
                vehicle_id=vehicle_id,
                mission_id=lock.get("mission_id"),
                action="emergency_removal",
                user_id=remove_user_id,
                user_name=old_user["full_name"] if old_user else "Unknown",
                role=old_assignment["role"],
                performed_by=user["id"],
                performed_by_name=user["full_name"],
                reason=reason
            )
    
    new_assignment_doc = {
        "id": str(uuid.uuid4()),
        "vehicle_id": vehicle_id,
        "user_id": new_member.user_id,
        "role": new_member.role,
        "is_primary": new_member.is_primary,
        "is_remote": new_member.is_remote,
        "assigned_at": now,
        "assigned_by": user["id"],
        "emergency_assignment": True,
        "is_active": True
    }
    await db.vehicle_teams.insert_one(new_assignment_doc)
    
    updated_team = await db.vehicle_teams.find(
        {"vehicle_id": vehicle_id, "is_active": True},
        {"_id": 0}
    ).to_list(20)
    await db.team_locks.update_one(
        {"id": lock["id"]},
        {"$set": {"locked_team": updated_team, "emergency_modified": True}}
    )
    
    await log_team_audit(
        vehicle_id=vehicle_id,
        mission_id=lock.get("mission_id"),
        action="emergency_assignment",
        user_id=new_member.user_id,
        user_name=new_user["full_name"],
        role=new_member.role,
        performed_by=user["id"],
        performed_by_name=user["full_name"],
        reason=reason,
        new_state={"is_remote": new_member.is_remote}
    )
    
    return {"message": "Emergency override completed", "assignment_id": new_assignment_doc["id"]}


# ============ REMOTE DOCTOR ============

@router.post("/vehicles/{vehicle_id}/remote-doctor")
async def add_remote_doctor(
    vehicle_id: str,
    doctor_id: str,
    mission_id: str = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DOCTOR]))
):
    """Add a remote doctor (telemedicine) to vehicle team"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    doctor = await db.users.find_one({"id": doctor_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if doctor["role"] not in [UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPERADMIN]:
        raise HTTPException(status_code=400, detail="User is not a doctor")
    
    now = datetime.now(timezone.utc).isoformat()
    assignment_doc = {
        "id": str(uuid.uuid4()),
        "vehicle_id": vehicle_id,
        "user_id": doctor_id,
        "role": TeamRole.REMOTE_DOCTOR,
        "is_primary": False,
        "is_remote": True,
        "assigned_at": now,
        "assigned_by": user["id"],
        "mission_id": mission_id,
        "is_active": True
    }
    await db.vehicle_teams.insert_one(assignment_doc)
    
    await log_team_audit(
        vehicle_id=vehicle_id,
        mission_id=mission_id,
        action="remote_doctor_joined",
        user_id=doctor_id,
        user_name=doctor["full_name"],
        role=TeamRole.REMOTE_DOCTOR,
        performed_by=user["id"],
        performed_by_name=user["full_name"]
    )
    
    return {"message": "Remote doctor added", "assignment_id": assignment_doc["id"]}


@router.delete("/vehicles/{vehicle_id}/remote-doctor/{doctor_id}")
async def remove_remote_doctor(
    vehicle_id: str,
    doctor_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DOCTOR]))
):
    """Remove remote doctor from vehicle team"""
    assignment = await db.vehicle_teams.find_one({
        "vehicle_id": vehicle_id,
        "user_id": doctor_id,
        "role": TeamRole.REMOTE_DOCTOR,
        "is_active": True
    })
    if not assignment:
        raise HTTPException(status_code=404, detail="Remote doctor assignment not found")
    
    doctor = await db.users.find_one({"id": doctor_id})
    
    await db.vehicle_teams.update_one(
        {"id": assignment["id"]},
        {"$set": {"is_active": False, "removed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_team_audit(
        vehicle_id=vehicle_id,
        action="remote_doctor_left",
        user_id=doctor_id,
        user_name=doctor["full_name"] if doctor else "Unknown",
        role=TeamRole.REMOTE_DOCTOR,
        performed_by=user["id"],
        performed_by_name=user["full_name"]
    )
    
    return {"message": "Remote doctor removed"}


# ============ VALIDATION & QUERIES ============

@router.get("/vehicles/{vehicle_id}/validate-team")
async def validate_vehicle_team(vehicle_id: str, user: dict = Depends(get_current_user)):
    """Validate if vehicle team meets requirements for mission start"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    team_assignments = await db.vehicle_teams.find(
        {"vehicle_id": vehicle_id, "is_active": True},
        {"_id": 0}
    ).to_list(20)
    
    filled_roles = [a["role"] for a in team_assignments]
    required_roles = vehicle.get("required_roles", ["driver", "nurse"])
    optional_roles = vehicle.get("optional_roles", ["doctor"])
    
    missing_roles = [r for r in required_roles if r not in filled_roles]
    
    warnings = []
    if "doctor" not in filled_roles and "remote_doctor" not in filled_roles:
        warnings.append("No doctor assigned - consider adding remote doctor for complex cases")
    
    team_summary = []
    for a in team_assignments:
        user_info = await db.users.find_one({"id": a["user_id"]}, {"_id": 0, "full_name": 1, "phone": 1})
        team_summary.append({
            "role": a["role"],
            "name": user_info.get("full_name") if user_info else "Unknown",
            "phone": user_info.get("phone") if user_info else None,
            "is_remote": a.get("is_remote", False)
        })
    
    return {
        "is_valid": len(missing_roles) == 0,
        "missing_roles": missing_roles,
        "warnings": warnings,
        "team_summary": team_summary,
        "required_roles": required_roles,
        "optional_roles": optional_roles
    }


@router.get("/vehicles/{vehicle_id}/audit")
async def get_vehicle_audit_trail(
    vehicle_id: str,
    limit: int = 50,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get full audit trail for a vehicle"""
    audits = await db.team_audit.find(
        {"vehicle_id": vehicle_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return audits


@router.get("/available-staff")
async def get_available_staff(
    role: str = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get staff available for team assignment"""
    query = {"is_active": True}
    if role:
        role_mapping = {
            "driver": UserRole.DRIVER,
            "nurse": UserRole.NURSE,
            "paramedic": UserRole.NURSE,
            "doctor": UserRole.DOCTOR,
            "remote_doctor": UserRole.DOCTOR
        }
        if role in role_mapping:
            query["role"] = role_mapping[role]
    else:
        query["role"] = {"$in": [UserRole.DRIVER, UserRole.NURSE, UserRole.DOCTOR]}
    
    staff = await db.users.find(query, {"_id": 0, "password": 0}).to_list(100)
    
    for s in staff:
        assignment = await db.vehicle_teams.find_one({
            "user_id": s["id"],
            "is_active": True
        })
        if assignment:
            vehicle = await db.vehicles.find_one({"id": assignment["vehicle_id"]})
            s["current_assignment"] = {
                "vehicle_id": assignment["vehicle_id"],
                "vehicle_name": vehicle["name"] if vehicle else "Unknown",
                "role": assignment["role"]
            }
        else:
            s["current_assignment"] = None
    
    return staff
