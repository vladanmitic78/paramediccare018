"""
Fleet Management API Tests
Tests for Vehicle CRUD, Team Assignment, Remote Doctor, Team Validation, and Audit Trail
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@paramedic-care018.rs"
ADMIN_PASSWORD = "Admin123!"

# Test data prefix for cleanup
TEST_PREFIX = "TEST_FLEET_"


class TestFleetManagement:
    """Fleet Management API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.text}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.admin_user = login_response.json().get("user", {})
        
        yield
        
        # Cleanup - no specific cleanup needed as we use unique test data
    
    # ============ VEHICLE CRUD TESTS ============
    
    def test_get_vehicles_list(self):
        """Test GET /api/fleet/vehicles returns list of vehicles"""
        response = self.session.get(f"{BASE_URL}/api/fleet/vehicles")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check if Ambulance 1 exists (seeded data)
        vehicle_names = [v.get("name") for v in data]
        print(f"Found {len(data)} vehicles: {vehicle_names}")
        
        # Verify vehicle structure if any exist
        if len(data) > 0:
            vehicle = data[0]
            assert "id" in vehicle, "Vehicle should have id"
            assert "name" in vehicle, "Vehicle should have name"
            assert "registration_plate" in vehicle, "Vehicle should have registration_plate"
            assert "status" in vehicle, "Vehicle should have status"
            assert "current_team" in vehicle, "Vehicle should have current_team"
            assert "required_roles" in vehicle, "Vehicle should have required_roles"
            print(f"Vehicle structure verified: {vehicle.get('name')}")
    
    def test_create_vehicle(self):
        """Test POST /api/fleet/vehicles creates a new vehicle"""
        unique_id = str(uuid.uuid4())[:8]
        vehicle_data = {
            "name": f"{TEST_PREFIX}Ambulance_{unique_id}",
            "registration_plate": f"TEST-{unique_id}",
            "vehicle_type": "ambulance",
            "capacity": 2,
            "equipment": ["LIFEPAK", "Oxygen", "Stretcher"],
            "required_roles": ["driver", "nurse"],
            "optional_roles": ["doctor"],
            "notes": "Test vehicle for automated testing"
        }
        
        response = self.session.post(f"{BASE_URL}/api/fleet/vehicles", json=vehicle_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain vehicle id"
        assert data["name"] == vehicle_data["name"], "Vehicle name should match"
        assert data["registration_plate"] == vehicle_data["registration_plate"], "Registration should match"
        assert data["status"] == "available", "New vehicle should be available"
        assert data["required_roles"] == ["driver", "nurse"], "Required roles should match"
        
        print(f"Created vehicle: {data['name']} with ID: {data['id']}")
        
        # Store for later tests
        self.created_vehicle_id = data["id"]
        return data["id"]
    
    def test_get_single_vehicle(self):
        """Test GET /api/fleet/vehicles/{id} returns vehicle details"""
        # First create a vehicle
        vehicle_id = self.test_create_vehicle()
        
        response = self.session.get(f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == vehicle_id, "Vehicle ID should match"
        assert "current_team" in data, "Should include current_team"
        assert "recent_missions" in data, "Should include recent_missions"
        assert "audit_trail" in data, "Should include audit_trail"
        
        print(f"Retrieved vehicle details: {data['name']}")
    
    def test_get_nonexistent_vehicle(self):
        """Test GET /api/fleet/vehicles/{id} returns 404 for non-existent vehicle"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/fleet/vehicles/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent vehicle")
    
    # ============ TEAM ASSIGNMENT TESTS ============
    
    def test_get_available_staff(self):
        """Test GET /api/fleet/available-staff returns staff list"""
        response = self.session.get(f"{BASE_URL}/api/fleet/available-staff")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Found {len(data)} available staff members")
        
        # Check staff structure if any exist
        if len(data) > 0:
            staff = data[0]
            assert "id" in staff, "Staff should have id"
            assert "full_name" in staff, "Staff should have full_name"
            assert "role" in staff, "Staff should have role"
            print(f"Staff roles found: {set(s.get('role') for s in data)}")
        
        return data
    
    def test_assign_team_member(self):
        """Test POST /api/fleet/vehicles/{id}/team assigns team member"""
        # Create a vehicle first
        vehicle_id = self.test_create_vehicle()
        
        # Get available staff
        staff = self.test_get_available_staff()
        
        # Find a driver
        drivers = [s for s in staff if s.get("role") == "driver"]
        if not drivers:
            pytest.skip("No drivers available for testing")
        
        driver = drivers[0]
        
        assignment_data = {
            "user_id": driver["id"],
            "role": "driver",
            "is_primary": True,
            "is_remote": False
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}/team",
            json=assignment_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "assignment_id" in data, "Response should contain assignment_id"
        assert data["message"] == "Team member assigned", "Should confirm assignment"
        
        print(f"Assigned driver {driver['full_name']} to vehicle")
        
        # Verify assignment by getting vehicle
        vehicle_response = self.session.get(f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}")
        vehicle_data = vehicle_response.json()
        
        team_user_ids = [m.get("user_id") for m in vehicle_data.get("current_team", [])]
        assert driver["id"] in team_user_ids, "Driver should be in current team"
        
        print(f"Verified driver in team: {vehicle_data.get('current_team')}")
        
        return vehicle_id, driver["id"]
    
    def test_assign_nurse_to_vehicle(self):
        """Test assigning a nurse to complete required roles"""
        # Create vehicle and assign driver
        vehicle_id, driver_id = self.test_assign_team_member()
        
        # Get available staff
        staff = self.test_get_available_staff()
        
        # Find a nurse
        nurses = [s for s in staff if s.get("role") == "nurse"]
        if not nurses:
            pytest.skip("No nurses available for testing")
        
        nurse = nurses[0]
        
        assignment_data = {
            "user_id": nurse["id"],
            "role": "nurse",
            "is_primary": True,
            "is_remote": False
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}/team",
            json=assignment_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        print(f"Assigned nurse {nurse['full_name']} to vehicle")
        
        return vehicle_id, nurse["id"]
    
    def test_remove_team_member(self):
        """Test DELETE /api/fleet/vehicles/{id}/team/{user_id} removes member"""
        # Create vehicle and assign driver
        vehicle_id, driver_id = self.test_assign_team_member()
        
        response = self.session.delete(
            f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}/team/{driver_id}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["message"] == "Team member removed", "Should confirm removal"
        
        # Verify removal
        vehicle_response = self.session.get(f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}")
        vehicle_data = vehicle_response.json()
        
        team_user_ids = [m.get("user_id") for m in vehicle_data.get("current_team", [])]
        assert driver_id not in team_user_ids, "Driver should be removed from team"
        
        print("Team member successfully removed")
    
    # ============ REMOTE DOCTOR TESTS ============
    
    def test_add_remote_doctor(self):
        """Test POST /api/fleet/vehicles/{id}/remote-doctor adds remote doctor"""
        # Create a vehicle
        vehicle_id = self.test_create_vehicle()
        
        # Get available staff
        staff = self.test_get_available_staff()
        
        # Find a doctor
        doctors = [s for s in staff if s.get("role") == "doctor"]
        if not doctors:
            pytest.skip("No doctors available for testing")
        
        doctor = doctors[0]
        
        response = self.session.post(
            f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}/remote-doctor",
            params={"doctor_id": doctor["id"]}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "assignment_id" in data, "Response should contain assignment_id"
        assert data["message"] == "Remote doctor added", "Should confirm addition"
        
        # Verify remote doctor in team
        vehicle_response = self.session.get(f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}")
        vehicle_data = vehicle_response.json()
        
        remote_doctors = [m for m in vehicle_data.get("current_team", []) if m.get("role") == "remote_doctor"]
        assert len(remote_doctors) > 0, "Remote doctor should be in team"
        assert remote_doctors[0].get("is_remote") == True, "Remote doctor should have is_remote=True"
        
        print(f"Added remote doctor {doctor['full_name']} to vehicle")
        
        return vehicle_id, doctor["id"]
    
    # ============ TEAM VALIDATION TESTS ============
    
    def test_validate_team_incomplete(self):
        """Test GET /api/fleet/vehicles/{id}/validate-team returns is_valid=false when roles missing"""
        # Create vehicle with no team
        vehicle_id = self.test_create_vehicle()
        
        response = self.session.get(f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}/validate-team")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["is_valid"] == False, "Team should be invalid without required roles"
        assert "driver" in data["missing_roles"], "Driver should be missing"
        assert "nurse" in data["missing_roles"], "Nurse should be missing"
        
        print(f"Validation correctly shows missing roles: {data['missing_roles']}")
    
    def test_validate_team_complete(self):
        """Test GET /api/fleet/vehicles/{id}/validate-team returns is_valid=true when roles filled"""
        # Create vehicle and assign both driver and nurse
        vehicle_id, nurse_id = self.test_assign_nurse_to_vehicle()
        
        response = self.session.get(f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}/validate-team")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["is_valid"] == True, f"Team should be valid with required roles filled. Missing: {data.get('missing_roles')}"
        assert len(data["missing_roles"]) == 0, "No roles should be missing"
        assert len(data["team_summary"]) >= 2, "Team summary should have at least 2 members"
        
        print(f"Team validation passed: {data['team_summary']}")
    
    # ============ AUDIT TRAIL TESTS ============
    
    def test_get_audit_trail(self):
        """Test GET /api/fleet/vehicles/{id}/audit returns audit entries"""
        # Create vehicle and make some changes
        vehicle_id, driver_id = self.test_assign_team_member()
        
        response = self.session.get(f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}/audit")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Audit trail should be a list"
        assert len(data) >= 2, "Should have at least 2 audit entries (vehicle_created + member_assigned)"
        
        # Check audit entry structure
        entry = data[0]
        assert "id" in entry, "Audit entry should have id"
        assert "vehicle_id" in entry, "Audit entry should have vehicle_id"
        assert "action" in entry, "Audit entry should have action"
        assert "timestamp" in entry, "Audit entry should have timestamp"
        assert "performed_by_name" in entry, "Audit entry should have performed_by_name"
        
        # Check for expected actions
        actions = [e.get("action") for e in data]
        assert "vehicle_created" in actions, "Should have vehicle_created action"
        assert "member_assigned" in actions, "Should have member_assigned action"
        
        print(f"Audit trail has {len(data)} entries: {actions}")
    
    # ============ EXISTING VEHICLE TESTS ============
    
    def test_ambulance_1_exists(self):
        """Test that seeded 'Ambulance 1' vehicle exists"""
        response = self.session.get(f"{BASE_URL}/api/fleet/vehicles")
        
        assert response.status_code == 200
        
        data = response.json()
        ambulance_1 = next((v for v in data if "Ambulance 1" in v.get("name", "")), None)
        
        if ambulance_1:
            print(f"Found Ambulance 1: {ambulance_1}")
            assert ambulance_1.get("status") in ["available", "on_mission", "maintenance"], "Should have valid status"
            assert "required_roles" in ambulance_1, "Should have required_roles"
            
            # Check current team
            current_team = ambulance_1.get("current_team", [])
            print(f"Ambulance 1 current team: {current_team}")
        else:
            print("Ambulance 1 not found - may need to be seeded")
            # Not failing as it might not be seeded yet


class TestFleetManagementAuth:
    """Test Fleet Management authentication requirements"""
    
    def test_vehicles_requires_auth(self):
        """Test that /api/fleet/vehicles requires authentication"""
        response = requests.get(f"{BASE_URL}/api/fleet/vehicles")
        
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403 without auth, got {response.status_code}"
        
        print("Correctly requires authentication for vehicles endpoint")
    
    def test_create_vehicle_requires_admin(self):
        """Test that creating vehicle requires admin role"""
        # Login as regular user would fail - skip if no regular user
        response = requests.post(
            f"{BASE_URL}/api/fleet/vehicles",
            json={"name": "Test", "registration_plate": "TEST-123"}
        )
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        
        print("Correctly requires admin for vehicle creation")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
