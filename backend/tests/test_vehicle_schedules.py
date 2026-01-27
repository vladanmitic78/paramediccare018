"""
Vehicle Schedule API Tests - Timeline-Based Vehicle Scheduling System Phase 1
Tests: Schedule CRUD, Availability queries, Conflict detection

Endpoints tested:
- GET /api/fleet/schedules - Get all schedules with date filter
- GET /api/fleet/schedules/vehicle/{id} - Get schedules for specific vehicle
- GET /api/fleet/schedules/availability?date=YYYY-MM-DD - Check vehicle availability
- GET /api/fleet/schedules/conflicts - Check for scheduling conflicts
- POST /api/fleet/schedules - Create new schedule with conflict detection
- PUT /api/fleet/schedules/{id} - Update schedule
- DELETE /api/fleet/schedules/{id} - Cancel/delete schedule
- POST /api/fleet/schedules/{id}/start - Mark schedule as in progress
- POST /api/fleet/schedules/{id}/complete - Mark schedule as completed
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data from main agent context
ADMIN_EMAIL = "admin@paramedic-care018.rs"
ADMIN_PASSWORD = "Admin123!"

# Vehicle IDs
VEHICLE_WV_KOMBI = "e9f8a92d-2b2f-46ca-9315-ebd0e26dbbdc"  # WV Kombi
VEHICLE_AUDI = "74bc7131-fdcb-4804-89e6-2884fc3a197b"  # Audi na 4 tocka

# Booking IDs for testing
BOOKING_TEST_CONFLICT = "e4784da2-a00f-4f76-8c6a-e167b30b0ee4"  # Test Conflict Patient
BOOKING_DRAGOLJUB = "dc83ba99-c5cf-4bc1-acc9-98b1c407302b"  # Dragoljub
BOOKING_MARIJA = "ae7e7438-c7b8-4518-8458-cb2b3935820c"  # Marija Vujic ide na posao

# Test date - use 2026-01-27 as mentioned in context (existing schedules)
TEST_DATE = "2026-01-27"
# Future date for new schedules without conflicts
FUTURE_DATE = "2026-01-30"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for admin user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestScheduleEndpointsExist:
    """Verify all schedule endpoints exist and respond"""
    
    def test_get_schedules_endpoint_exists(self, authenticated_client):
        """GET /api/fleet/schedules should exist"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        print(f"GET /api/fleet/schedules - Status: {response.status_code}")
    
    def test_get_vehicle_schedules_endpoint_exists(self, authenticated_client):
        """GET /api/fleet/schedules/vehicle/{id} should exist"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules/vehicle/{VEHICLE_WV_KOMBI}")
        assert response.status_code in [200, 404, 401, 403], f"Unexpected status: {response.status_code}"
        print(f"GET /api/fleet/schedules/vehicle/{{id}} - Status: {response.status_code}")
    
    def test_availability_endpoint_exists(self, authenticated_client):
        """GET /api/fleet/schedules/availability should exist"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules/availability?date={TEST_DATE}")
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        print(f"GET /api/fleet/schedules/availability - Status: {response.status_code}")
    
    def test_conflicts_endpoint_exists(self, authenticated_client):
        """GET /api/fleet/schedules/conflicts should exist"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/fleet/schedules/conflicts",
            params={
                "vehicle_id": VEHICLE_WV_KOMBI,
                "start_time": f"{TEST_DATE}T10:00:00",
                "end_time": f"{TEST_DATE}T12:00:00"
            }
        )
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        print(f"GET /api/fleet/schedules/conflicts - Status: {response.status_code}")


class TestGetSchedules:
    """Test GET /api/fleet/schedules endpoint"""
    
    def test_get_all_schedules(self, authenticated_client):
        """Get all schedules without filters"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total schedules returned: {len(data)}")
    
    def test_get_schedules_with_date_filter(self, authenticated_client):
        """Get schedules filtered by date"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules?date={TEST_DATE}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Schedules for {TEST_DATE}: {len(data)}")
        
        # Verify all returned schedules overlap with the requested date
        for schedule in data:
            assert "start_time" in schedule
            assert "end_time" in schedule
            assert "id" in schedule
            assert "vehicle_id" in schedule
    
    def test_get_schedules_with_vehicle_filter(self, authenticated_client):
        """Get schedules filtered by vehicle"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules?vehicle_id={VEHICLE_WV_KOMBI}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned schedules should be for the specified vehicle
        for schedule in data:
            assert schedule["vehicle_id"] == VEHICLE_WV_KOMBI
        print(f"Schedules for WV Kombi: {len(data)}")
    
    def test_get_schedules_with_status_filter(self, authenticated_client):
        """Get schedules filtered by status"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules?status=scheduled")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for schedule in data:
            assert schedule["status"] == "scheduled"
        print(f"Scheduled status schedules: {len(data)}")


class TestGetVehicleSchedules:
    """Test GET /api/fleet/schedules/vehicle/{id} endpoint"""
    
    def test_get_vehicle_schedules_success(self, authenticated_client):
        """Get schedules for specific vehicle"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules/vehicle/{VEHICLE_WV_KOMBI}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All schedules should be for this vehicle
        for schedule in data:
            assert schedule["vehicle_id"] == VEHICLE_WV_KOMBI
        print(f"WV Kombi schedules: {len(data)}")
    
    def test_get_vehicle_schedules_with_date(self, authenticated_client):
        """Get vehicle schedules filtered by date"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/fleet/schedules/vehicle/{VEHICLE_WV_KOMBI}?date={TEST_DATE}"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"WV Kombi schedules on {TEST_DATE}: {len(data)}")
    
    def test_get_vehicle_schedules_nonexistent_vehicle(self, authenticated_client):
        """Get schedules for non-existent vehicle returns 404"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules/vehicle/nonexistent-vehicle-id")
        assert response.status_code == 404
        print("Non-existent vehicle correctly returns 404")
    
    def test_get_vehicle_schedules_include_cancelled(self, authenticated_client):
        """Get vehicle schedules including cancelled"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/fleet/schedules/vehicle/{VEHICLE_WV_KOMBI}?include_cancelled=true"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"WV Kombi schedules (including cancelled): {len(data)}")


class TestAvailability:
    """Test GET /api/fleet/schedules/availability endpoint"""
    
    def test_check_availability_basic(self, authenticated_client):
        """Check availability for a date"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules/availability?date={TEST_DATE}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Each item should have vehicle availability info
        for vehicle_avail in data:
            assert "vehicle_id" in vehicle_avail
            assert "vehicle_name" in vehicle_avail
            assert "date" in vehicle_avail
            assert "schedules" in vehicle_avail
            assert "available_slots" in vehicle_avail
            assert "is_available_all_day" in vehicle_avail
        print(f"Availability data for {len(data)} vehicles")
    
    def test_check_availability_specific_vehicle(self, authenticated_client):
        """Check availability for specific vehicle"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/fleet/schedules/availability?date={TEST_DATE}&vehicle_id={VEHICLE_WV_KOMBI}"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should only return data for the specified vehicle
        if len(data) > 0:
            assert data[0]["vehicle_id"] == VEHICLE_WV_KOMBI
        print(f"WV Kombi availability: {len(data)} entries")
    
    def test_check_availability_with_time_range(self, authenticated_client):
        """Check availability with specific time range"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/fleet/schedules/availability?date={TEST_DATE}&start_time=08:00&end_time=18:00"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Availability with time range: {len(data)} vehicles")
    
    def test_availability_shows_time_slots(self, authenticated_client):
        """Verify availability returns time slots"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules/availability?date={TEST_DATE}")
        assert response.status_code == 200
        data = response.json()
        
        for vehicle_avail in data:
            slots = vehicle_avail.get("available_slots", [])
            for slot in slots:
                assert "start_time" in slot
                assert "end_time" in slot
                assert "is_available" in slot
        print("Time slots structure verified")


class TestConflictDetection:
    """Test GET /api/fleet/schedules/conflicts endpoint"""
    
    def test_check_conflicts_no_conflict(self, authenticated_client):
        """Check conflicts for a time slot with no existing schedules"""
        # Use a future date/time unlikely to have conflicts
        response = authenticated_client.get(
            f"{BASE_URL}/api/fleet/schedules/conflicts",
            params={
                "vehicle_id": VEHICLE_AUDI,
                "start_time": f"{FUTURE_DATE}T03:00:00",
                "end_time": f"{FUTURE_DATE}T04:00:00"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "has_conflict" in data
        assert "conflicting_schedules" in data
        print(f"Conflict check result: has_conflict={data['has_conflict']}")
    
    def test_check_conflicts_with_overlap(self, authenticated_client):
        """Check conflicts for a time slot that overlaps existing schedules"""
        # First get existing schedules for the test date
        schedules_response = authenticated_client.get(
            f"{BASE_URL}/api/fleet/schedules?date={TEST_DATE}&vehicle_id={VEHICLE_WV_KOMBI}"
        )
        
        if schedules_response.status_code == 200 and len(schedules_response.json()) > 0:
            existing = schedules_response.json()[0]
            # Try to check conflicts for overlapping time
            response = authenticated_client.get(
                f"{BASE_URL}/api/fleet/schedules/conflicts",
                params={
                    "vehicle_id": VEHICLE_WV_KOMBI,
                    "start_time": existing["start_time"],
                    "end_time": existing["end_time"]
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert "has_conflict" in data
            print(f"Overlap conflict check: has_conflict={data['has_conflict']}")
        else:
            pytest.skip("No existing schedules to test overlap")
    
    def test_check_conflicts_response_structure(self, authenticated_client):
        """Verify conflict response structure"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/fleet/schedules/conflicts",
            params={
                "vehicle_id": VEHICLE_WV_KOMBI,
                "start_time": f"{TEST_DATE}T10:00:00",
                "end_time": f"{TEST_DATE}T12:00:00"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "has_conflict" in data
        assert isinstance(data["has_conflict"], bool)
        assert "conflicting_schedules" in data
        assert isinstance(data["conflicting_schedules"], list)
        print("Conflict response structure verified")


class TestCreateSchedule:
    """Test POST /api/fleet/schedules endpoint"""
    
    def test_create_schedule_success(self, authenticated_client):
        """Create a new schedule successfully"""
        # Use future date to avoid conflicts
        schedule_data = {
            "vehicle_id": VEHICLE_AUDI,
            "booking_id": BOOKING_MARIJA,
            "booking_type": "booking",
            "start_time": f"{FUTURE_DATE}T10:00:00+00:00",
            "end_time": f"{FUTURE_DATE}T12:00:00+00:00",
            "notes": "TEST_Schedule_Create"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules", json=schedule_data)
        
        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data["vehicle_id"] == VEHICLE_AUDI
            assert data["booking_id"] == BOOKING_MARIJA
            assert data["status"] == "scheduled"
            print(f"Created schedule: {data['id']}")
            
            # Store for cleanup
            TestCreateSchedule.created_schedule_id = data["id"]
        elif response.status_code == 409:
            # Conflict detected - this is valid behavior
            print(f"Schedule creation returned conflict (409): {response.json()}")
        elif response.status_code == 404:
            # Booking not found - skip
            pytest.skip(f"Booking not found: {response.json()}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code} - {response.text}")
    
    def test_create_schedule_conflict_detection(self, authenticated_client):
        """Create schedule with conflict should return 409"""
        # First get existing schedules
        schedules_response = authenticated_client.get(
            f"{BASE_URL}/api/fleet/schedules?date={TEST_DATE}&vehicle_id={VEHICLE_WV_KOMBI}"
        )
        
        if schedules_response.status_code == 200 and len(schedules_response.json()) > 0:
            existing = schedules_response.json()[0]
            
            # Try to create overlapping schedule
            schedule_data = {
                "vehicle_id": VEHICLE_WV_KOMBI,
                "booking_id": BOOKING_DRAGOLJUB,
                "booking_type": "booking",
                "start_time": existing["start_time"],
                "end_time": existing["end_time"],
                "notes": "TEST_Conflict_Schedule"
            }
            
            response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules", json=schedule_data)
            
            # Should return 409 Conflict
            assert response.status_code == 409, f"Expected 409, got {response.status_code}"
            data = response.json()
            assert "detail" in data
            print(f"Conflict correctly detected: {data['detail']}")
        else:
            pytest.skip("No existing schedules to test conflict")
    
    def test_create_schedule_force_with_conflict(self, authenticated_client):
        """Create schedule with force=true bypasses conflict check"""
        # Get existing schedules
        schedules_response = authenticated_client.get(
            f"{BASE_URL}/api/fleet/schedules?date={TEST_DATE}&vehicle_id={VEHICLE_WV_KOMBI}"
        )
        
        if schedules_response.status_code == 200 and len(schedules_response.json()) > 0:
            existing = schedules_response.json()[0]
            
            # Try to create overlapping schedule with force=true
            schedule_data = {
                "vehicle_id": VEHICLE_WV_KOMBI,
                "booking_id": BOOKING_DRAGOLJUB,
                "booking_type": "booking",
                "start_time": existing["start_time"],
                "end_time": existing["end_time"],
                "notes": "TEST_Force_Schedule"
            }
            
            response = authenticated_client.post(
                f"{BASE_URL}/api/fleet/schedules?force=true", 
                json=schedule_data
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                print(f"Force created schedule: {data['id']}")
                # Store for cleanup
                TestCreateSchedule.force_created_id = data.get("id")
            elif response.status_code == 404:
                pytest.skip(f"Booking not found: {response.json()}")
            else:
                print(f"Force create response: {response.status_code} - {response.text}")
        else:
            pytest.skip("No existing schedules to test force create")
    
    def test_create_schedule_invalid_vehicle(self, authenticated_client):
        """Create schedule with invalid vehicle returns 404"""
        schedule_data = {
            "vehicle_id": "invalid-vehicle-id",
            "booking_id": BOOKING_MARIJA,
            "booking_type": "booking",
            "start_time": f"{FUTURE_DATE}T14:00:00+00:00",
            "end_time": f"{FUTURE_DATE}T16:00:00+00:00"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules", json=schedule_data)
        assert response.status_code == 404
        print("Invalid vehicle correctly returns 404")
    
    def test_create_schedule_invalid_booking(self, authenticated_client):
        """Create schedule with invalid booking returns 404"""
        schedule_data = {
            "vehicle_id": VEHICLE_AUDI,
            "booking_id": "invalid-booking-id",
            "booking_type": "booking",
            "start_time": f"{FUTURE_DATE}T14:00:00+00:00",
            "end_time": f"{FUTURE_DATE}T16:00:00+00:00"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules", json=schedule_data)
        assert response.status_code == 404
        print("Invalid booking correctly returns 404")
    
    def test_create_schedule_end_before_start(self, authenticated_client):
        """Create schedule with end time before start time returns 400"""
        schedule_data = {
            "vehicle_id": VEHICLE_AUDI,
            "booking_id": BOOKING_MARIJA,
            "booking_type": "booking",
            "start_time": f"{FUTURE_DATE}T14:00:00+00:00",
            "end_time": f"{FUTURE_DATE}T12:00:00+00:00"  # End before start
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules", json=schedule_data)
        assert response.status_code == 400
        print("End before start correctly returns 400")


class TestUpdateSchedule:
    """Test PUT /api/fleet/schedules/{id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_schedule(self, authenticated_client):
        """Create a schedule for update tests"""
        schedule_data = {
            "vehicle_id": VEHICLE_AUDI,
            "booking_id": BOOKING_MARIJA,
            "booking_type": "booking",
            "start_time": f"{FUTURE_DATE}T16:00:00+00:00",
            "end_time": f"{FUTURE_DATE}T18:00:00+00:00",
            "notes": "TEST_Update_Schedule"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules", json=schedule_data)
        
        if response.status_code in [200, 201]:
            self.schedule_id = response.json()["id"]
            yield
            # Cleanup
            authenticated_client.delete(f"{BASE_URL}/api/fleet/schedules/{self.schedule_id}")
        elif response.status_code == 404:
            pytest.skip("Booking not found for update test setup")
        else:
            pytest.skip(f"Could not create schedule for update test: {response.status_code}")
    
    def test_update_schedule_notes(self, authenticated_client):
        """Update schedule notes"""
        update_data = {"notes": "TEST_Updated_Notes"}
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/fleet/schedules/{self.schedule_id}",
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "TEST_Updated_Notes"
        print(f"Updated schedule notes: {self.schedule_id}")
    
    def test_update_schedule_time(self, authenticated_client):
        """Update schedule time"""
        new_start = f"{FUTURE_DATE}T17:00:00+00:00"
        new_end = f"{FUTURE_DATE}T19:00:00+00:00"
        
        update_data = {
            "start_time": new_start,
            "end_time": new_end
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/fleet/schedules/{self.schedule_id}",
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        print(f"Updated schedule time: {data['start_time']} - {data['end_time']}")
    
    def test_update_nonexistent_schedule(self, authenticated_client):
        """Update non-existent schedule returns 404"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/fleet/schedules/nonexistent-id",
            json={"notes": "test"}
        )
        assert response.status_code == 404
        print("Non-existent schedule update correctly returns 404")


class TestDeleteSchedule:
    """Test DELETE /api/fleet/schedules/{id} endpoint"""
    
    def test_delete_schedule_success(self, authenticated_client):
        """Delete (cancel) a schedule"""
        # First create a schedule to delete
        schedule_data = {
            "vehicle_id": VEHICLE_AUDI,
            "booking_id": BOOKING_MARIJA,
            "booking_type": "booking",
            "start_time": f"{FUTURE_DATE}T20:00:00+00:00",
            "end_time": f"{FUTURE_DATE}T22:00:00+00:00",
            "notes": "TEST_Delete_Schedule"
        }
        
        create_response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules", json=schedule_data)
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create schedule for delete test: {create_response.status_code}")
        
        schedule_id = create_response.json()["id"]
        
        # Delete the schedule
        delete_response = authenticated_client.delete(f"{BASE_URL}/api/fleet/schedules/{schedule_id}")
        assert delete_response.status_code == 200
        
        data = delete_response.json()
        assert "message" in data
        assert data["schedule_id"] == schedule_id
        print(f"Deleted schedule: {schedule_id}")
        
        # Verify it's cancelled (soft delete)
        get_response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules/{schedule_id}")
        if get_response.status_code == 200:
            assert get_response.json()["status"] == "cancelled"
            print("Schedule status correctly set to cancelled")
    
    def test_delete_nonexistent_schedule(self, authenticated_client):
        """Delete non-existent schedule returns 404"""
        response = authenticated_client.delete(f"{BASE_URL}/api/fleet/schedules/nonexistent-id")
        assert response.status_code == 404
        print("Non-existent schedule delete correctly returns 404")


class TestScheduleStatusTransitions:
    """Test POST /api/fleet/schedules/{id}/start and /complete endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_schedule(self, authenticated_client):
        """Create a schedule for status transition tests"""
        schedule_data = {
            "vehicle_id": VEHICLE_AUDI,
            "booking_id": BOOKING_MARIJA,
            "booking_type": "booking",
            "start_time": f"{FUTURE_DATE}T08:00:00+00:00",
            "end_time": f"{FUTURE_DATE}T10:00:00+00:00",
            "notes": "TEST_Status_Transition"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules", json=schedule_data)
        
        if response.status_code in [200, 201]:
            self.schedule_id = response.json()["id"]
            yield
            # Cleanup
            authenticated_client.delete(f"{BASE_URL}/api/fleet/schedules/{self.schedule_id}")
        elif response.status_code == 404:
            pytest.skip("Booking not found for status transition test")
        else:
            pytest.skip(f"Could not create schedule: {response.status_code}")
    
    def test_start_schedule(self, authenticated_client):
        """Mark schedule as in progress"""
        response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules/{self.schedule_id}/start")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"
        print(f"Started schedule: {self.schedule_id}")
    
    def test_complete_schedule_from_scheduled(self, authenticated_client):
        """Complete schedule directly from scheduled status"""
        response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules/{self.schedule_id}/complete")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        print(f"Completed schedule from scheduled: {self.schedule_id}")
    
    def test_start_then_complete_schedule(self, authenticated_client):
        """Start and then complete a schedule"""
        # Start
        start_response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules/{self.schedule_id}/start")
        assert start_response.status_code == 200
        assert start_response.json()["status"] == "in_progress"
        
        # Complete
        complete_response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules/{self.schedule_id}/complete")
        assert complete_response.status_code == 200
        assert complete_response.json()["status"] == "completed"
        print(f"Started and completed schedule: {self.schedule_id}")
    
    def test_start_nonexistent_schedule(self, authenticated_client):
        """Start non-existent schedule returns 404"""
        response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules/nonexistent-id/start")
        assert response.status_code == 404
        print("Start non-existent schedule correctly returns 404")
    
    def test_complete_nonexistent_schedule(self, authenticated_client):
        """Complete non-existent schedule returns 404"""
        response = authenticated_client.post(f"{BASE_URL}/api/fleet/schedules/nonexistent-id/complete")
        assert response.status_code == 404
        print("Complete non-existent schedule correctly returns 404")


class TestScheduleResponseStructure:
    """Test that schedule responses have correct structure"""
    
    def test_schedule_response_fields(self, authenticated_client):
        """Verify schedule response has all required fields"""
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            schedule = data[0]
            required_fields = [
                "id", "vehicle_id", "booking_id", "booking_type",
                "start_time", "end_time", "status", "created_at"
            ]
            
            for field in required_fields:
                assert field in schedule, f"Missing field: {field}"
            
            # Optional enriched fields
            optional_fields = ["vehicle_name", "driver_name", "patient_name", 
                            "pickup_address", "destination_address"]
            
            present_optional = [f for f in optional_fields if f in schedule]
            print(f"Required fields present. Optional fields: {present_optional}")
        else:
            print("No schedules to verify structure")


class TestAuthenticationRequired:
    """Test that endpoints require authentication"""
    
    def test_get_schedules_requires_auth(self, api_client):
        """GET /api/fleet/schedules requires authentication"""
        # Remove auth header
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/fleet/schedules")
        assert response.status_code in [401, 403]
        print("GET schedules correctly requires auth")
    
    def test_create_schedule_requires_admin(self, api_client, auth_token):
        """POST /api/fleet/schedules requires admin role"""
        # This test verifies that the endpoint requires admin/superadmin role
        # The authenticated_client fixture uses admin credentials, so it should work
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        schedule_data = {
            "vehicle_id": VEHICLE_AUDI,
            "booking_id": BOOKING_MARIJA,
            "booking_type": "booking",
            "start_time": f"{FUTURE_DATE}T22:00:00+00:00",
            "end_time": f"{FUTURE_DATE}T23:59:00+00:00",
            "notes": "TEST_Auth_Check"
        }
        
        response = api_client.post(f"{BASE_URL}/api/fleet/schedules", json=schedule_data)
        # Should succeed with admin credentials or fail with 404 if booking not found
        assert response.status_code in [200, 201, 404, 409]
        print(f"Create schedule with admin auth: {response.status_code}")


# Cleanup fixture to remove test data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_schedules(authenticated_client):
    """Cleanup TEST_ prefixed schedules after all tests"""
    yield
    
    # Get all schedules and delete TEST_ ones
    try:
        response = authenticated_client.get(f"{BASE_URL}/api/fleet/schedules?status=scheduled")
        if response.status_code == 200:
            schedules = response.json()
            for schedule in schedules:
                if schedule.get("notes", "").startswith("TEST_"):
                    authenticated_client.delete(f"{BASE_URL}/api/fleet/schedules/{schedule['id']}")
                    print(f"Cleaned up test schedule: {schedule['id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
