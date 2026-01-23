"""
Staff Availability Calendar API Tests
Tests for availability CRUD operations and admin endpoints
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@paramedic-care018.rs"
ADMIN_PASSWORD = "Admin123!"
DRIVER_EMAIL = "driver@test.com"
DRIVER_PASSWORD = "Test123!"
PATIENT_EMAIL = "patient@test.com"
PATIENT_PASSWORD = "Test123!"


class TestStaffAvailabilityAPI:
    """Staff Availability Calendar API Tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Driver login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def patient_token(self):
        """Get patient authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PATIENT_EMAIL,
            "password": PATIENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Patient login failed: {response.status_code} - {response.text}")
    
    # ============ GET /api/staff/availability Tests ============
    
    def test_get_availability_requires_auth(self):
        """GET /api/staff/availability requires authentication"""
        response = requests.get(f"{BASE_URL}/api/staff/availability")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_get_availability_as_driver(self, driver_token):
        """GET /api/staff/availability returns user's availability"""
        response = requests.get(
            f"{BASE_URL}/api/staff/availability",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_availability_with_date_filter(self, driver_token):
        """GET /api/staff/availability supports date filtering"""
        today = datetime.now().strftime("%Y-%m-%d")
        next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/staff/availability?start_date={today}&end_date={next_week}",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    # ============ POST /api/staff/availability Tests ============
    
    def test_create_availability_requires_auth(self):
        """POST /api/staff/availability requires authentication"""
        response = requests.post(f"{BASE_URL}/api/staff/availability", json={
            "date": "2026-01-20",
            "start_time": "08:00",
            "end_time": "16:00",
            "status": "available"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_create_availability_patient_forbidden(self, patient_token):
        """POST /api/staff/availability - patients cannot create availability"""
        response = requests.post(
            f"{BASE_URL}/api/staff/availability",
            headers={"Authorization": f"Bearer {patient_token}"},
            json={
                "date": "2026-01-20",
                "start_time": "08:00",
                "end_time": "16:00",
                "status": "available"
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_create_availability_as_driver(self, driver_token):
        """POST /api/staff/availability - driver can create availability"""
        test_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/staff/availability",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={
                "date": test_date,
                "start_time": "09:00",
                "end_time": "17:00",
                "status": "available",
                "notes": "TEST_availability_slot",
                "repeat_weekly": False
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("slots_created") == 1, "Should create 1 slot"
    
    def test_create_availability_with_repeat_weekly(self, driver_token):
        """POST /api/staff/availability - repeat_weekly creates 5 slots"""
        test_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/staff/availability",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={
                "date": test_date,
                "start_time": "08:00",
                "end_time": "16:00",
                "status": "available",
                "notes": "TEST_repeat_weekly_slot",
                "repeat_weekly": True
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("slots_created") == 5, "Should create 5 slots (1 + 4 weeks)"
    
    def test_create_availability_different_statuses(self, driver_token):
        """POST /api/staff/availability - supports different status values"""
        statuses = ["available", "unavailable", "on_leave", "sick"]
        
        for status in statuses:
            test_date = (datetime.now() + timedelta(days=90 + statuses.index(status))).strftime("%Y-%m-%d")
            response = requests.post(
                f"{BASE_URL}/api/staff/availability",
                headers={"Authorization": f"Bearer {driver_token}"},
                json={
                    "date": test_date,
                    "start_time": "08:00",
                    "end_time": "16:00",
                    "status": status,
                    "notes": f"TEST_status_{status}"
                }
            )
            assert response.status_code == 200, f"Failed to create slot with status '{status}': {response.status_code}"
    
    # ============ PUT /api/staff/availability/{slot_id} Tests ============
    
    def test_update_availability_requires_auth(self):
        """PUT /api/staff/availability/{slot_id} requires authentication"""
        response = requests.put(f"{BASE_URL}/api/staff/availability/fake-id", json={
            "status": "unavailable"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_update_availability_not_found(self, driver_token):
        """PUT /api/staff/availability/{slot_id} returns 404 for invalid slot"""
        response = requests.put(
            f"{BASE_URL}/api/staff/availability/non-existent-slot-id",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={"status": "unavailable"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ============ DELETE /api/staff/availability/{slot_id} Tests ============
    
    def test_delete_availability_requires_auth(self):
        """DELETE /api/staff/availability/{slot_id} requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/staff/availability/fake-id")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_delete_availability_not_found(self, driver_token):
        """DELETE /api/staff/availability/{slot_id} returns 404 for invalid slot"""
        response = requests.delete(
            f"{BASE_URL}/api/staff/availability/non-existent-slot-id",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ============ Admin Endpoints Tests ============
    
    def test_admin_get_all_availability_requires_auth(self):
        """GET /api/admin/staff-availability requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/staff-availability")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_admin_get_all_availability_requires_admin_role(self, driver_token):
        """GET /api/admin/staff-availability requires admin role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/staff-availability",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_admin_get_all_availability_success(self, admin_token):
        """GET /api/admin/staff-availability returns all staff availability"""
        response = requests.get(
            f"{BASE_URL}/api/admin/staff-availability",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_admin_get_availability_with_filters(self, admin_token):
        """GET /api/admin/staff-availability supports filtering"""
        today = datetime.now().strftime("%Y-%m-%d")
        next_month = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Test with date range
        response = requests.get(
            f"{BASE_URL}/api/admin/staff-availability?start_date={today}&end_date={next_month}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Test with role filter
        response = requests.get(
            f"{BASE_URL}/api/admin/staff-availability?role=driver",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # All returned slots should be from drivers
        for slot in data:
            assert slot.get("user_role") == "driver", f"Expected driver role, got {slot.get('user_role')}"
    
    def test_admin_get_availability_by_date(self, admin_token):
        """GET /api/admin/staff-availability/date/{date} returns grouped availability"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/staff-availability/date/{today}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "date" in data, "Response should contain 'date' field"
        assert "staff" in data, "Response should contain 'staff' field"
        assert isinstance(data["staff"], list), "'staff' should be a list"
    
    def test_admin_get_staff_list(self, admin_token):
        """GET /api/admin/staff-list returns list of staff members"""
        response = requests.get(
            f"{BASE_URL}/api/admin/staff-list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify staff members don't include regular users
        for staff in data:
            assert staff.get("role") != "regular", "Staff list should not include regular users"
            assert "password" not in staff, "Password should not be exposed"
            assert "_id" not in staff, "MongoDB _id should not be exposed"
    
    def test_admin_staff_list_requires_admin_role(self, driver_token):
        """GET /api/admin/staff-list requires admin role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/staff-list",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    # ============ Admin Create Availability for Staff Tests ============
    
    def test_admin_create_availability_requires_auth(self):
        """POST /api/admin/staff-availability/create requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/staff-availability/create", json={
            "user_id": "some-user-id",
            "date": "2026-02-01",
            "start_time": "08:00",
            "end_time": "16:00",
            "status": "available"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_admin_create_availability_requires_admin_role(self, driver_token):
        """POST /api/admin/staff-availability/create requires admin role"""
        response = requests.post(
            f"{BASE_URL}/api/admin/staff-availability/create",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={
                "user_id": "some-user-id",
                "date": "2026-02-01",
                "start_time": "08:00",
                "end_time": "16:00",
                "status": "available"
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_admin_create_availability_user_not_found(self, admin_token):
        """POST /api/admin/staff-availability/create returns 404 for non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/admin/staff-availability/create",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": "non-existent-user-id",
                "date": "2026-02-01",
                "start_time": "08:00",
                "end_time": "16:00",
                "status": "available"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_admin_create_availability_for_staff_success(self, admin_token):
        """POST /api/admin/staff-availability/create - admin can create availability for staff"""
        # First get a staff member ID
        staff_response = requests.get(
            f"{BASE_URL}/api/admin/staff-list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert staff_response.status_code == 200
        staff_list = staff_response.json()
        
        if len(staff_list) == 0:
            pytest.skip("No staff members available for testing")
        
        # Find a driver to create availability for
        target_staff = None
        for staff in staff_list:
            if staff.get("role") == "driver":
                target_staff = staff
                break
        
        if not target_staff:
            target_staff = staff_list[0]
        
        test_date = (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/staff-availability/create",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": target_staff["id"],
                "date": test_date,
                "start_time": "09:00",
                "end_time": "17:00",
                "status": "available",
                "notes": "TEST_admin_created_slot"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("slots_created") == 1, "Should create 1 slot"
        assert data.get("for_user") == target_staff.get("full_name"), "Should return target user name"
    
    def test_admin_create_availability_with_repeat_weekly(self, admin_token):
        """POST /api/admin/staff-availability/create - repeat_weekly creates 5 slots"""
        # Get a staff member ID
        staff_response = requests.get(
            f"{BASE_URL}/api/admin/staff-list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        staff_list = staff_response.json()
        
        if len(staff_list) == 0:
            pytest.skip("No staff members available for testing")
        
        target_staff = staff_list[0]
        test_date = (datetime.now() + timedelta(days=150)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/staff-availability/create",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": target_staff["id"],
                "date": test_date,
                "start_time": "08:00",
                "end_time": "16:00",
                "status": "available",
                "notes": "TEST_admin_repeat_weekly",
                "repeat_weekly": True
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("slots_created") == 5, "Should create 5 slots (1 + 4 weeks)"
    
    # ============ Data Structure Validation Tests ============
    
    def test_availability_slot_structure(self, admin_token):
        """Verify availability slot data structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/staff-availability",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            slot = data[0]
            required_fields = ["id", "user_id", "user_name", "user_role", "date", "start_time", "end_time", "status"]
            for field in required_fields:
                assert field in slot, f"Slot should contain '{field}' field"
            
            # Verify no MongoDB _id
            assert "_id" not in slot, "MongoDB _id should not be exposed"
            
            # Verify status is valid
            valid_statuses = ["available", "unavailable", "on_leave", "sick"]
            assert slot["status"] in valid_statuses, f"Invalid status: {slot['status']}"


class TestStaffAvailabilityCRUDFlow:
    """Test complete CRUD flow for availability"""
    
    @pytest.fixture(scope="class")
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Driver login failed: {response.status_code}")
    
    def test_crud_flow(self, driver_token):
        """Test Create -> Read -> Update -> Delete flow"""
        # 1. CREATE
        test_date = (datetime.now() + timedelta(days=100)).strftime("%Y-%m-%d")
        create_response = requests.post(
            f"{BASE_URL}/api/staff/availability",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={
                "date": test_date,
                "start_time": "10:00",
                "end_time": "18:00",
                "status": "available",
                "notes": "TEST_CRUD_flow_slot"
            }
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.status_code}"
        
        # 2. READ - Verify slot was created
        read_response = requests.get(
            f"{BASE_URL}/api/staff/availability?start_date={test_date}&end_date={test_date}",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert read_response.status_code == 200, f"Read failed: {read_response.status_code}"
        slots = read_response.json()
        
        # Find our test slot
        test_slot = None
        for slot in slots:
            if slot.get("notes") == "TEST_CRUD_flow_slot":
                test_slot = slot
                break
        
        assert test_slot is not None, "Created slot not found in read response"
        slot_id = test_slot["id"]
        
        # 3. UPDATE
        update_response = requests.put(
            f"{BASE_URL}/api/staff/availability/{slot_id}",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={
                "status": "unavailable",
                "notes": "TEST_CRUD_flow_slot_updated"
            }
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.status_code}"
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/api/staff/availability?start_date={test_date}&end_date={test_date}",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        updated_slots = verify_response.json()
        updated_slot = next((s for s in updated_slots if s["id"] == slot_id), None)
        assert updated_slot is not None, "Updated slot not found"
        assert updated_slot["status"] == "unavailable", "Status was not updated"
        
        # 4. DELETE
        delete_response = requests.delete(
            f"{BASE_URL}/api/staff/availability/{slot_id}",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code}"
        
        # Verify deletion
        final_response = requests.get(
            f"{BASE_URL}/api/staff/availability?start_date={test_date}&end_date={test_date}",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        final_slots = final_response.json()
        deleted_slot = next((s for s in final_slots if s["id"] == slot_id), None)
        assert deleted_slot is None, "Slot was not deleted"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
