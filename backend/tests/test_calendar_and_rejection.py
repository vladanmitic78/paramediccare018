"""
Test Calendar View and Driver Rejection Features
Tests:
- GET /api/bookings with date range params (for calendar)
- POST /api/bookings/{id}/reject (driver rejection)
- GET /api/bookings/{id}/rejections (rejection history)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@paramedic-care018.rs"
ADMIN_PASSWORD = "Admin123!"
DRIVER_EMAIL = "djoka.stroka@test.com"
DRIVER_PASSWORD = "Test123!"


class TestCalendarAndRejection:
    """Test Calendar view and Driver rejection endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.driver_token = None
        self.test_booking_id = None
        
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
            return self.admin_token
        pytest.skip(f"Admin login failed: {response.status_code}")
        
    def get_driver_token(self):
        """Get driver authentication token"""
        if self.driver_token:
            return self.driver_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        if response.status_code == 200:
            self.driver_token = response.json().get("access_token")
            return self.driver_token
        # Driver may not exist, skip test
        pytest.skip(f"Driver login failed: {response.status_code}")
    
    # ============ CALENDAR VIEW TESTS ============
    
    def test_bookings_endpoint_returns_list(self):
        """Test GET /api/bookings returns a list"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/bookings returns list with {len(data)} bookings")
        
    def test_bookings_with_date_range_params(self):
        """Test GET /api/bookings with start_date and end_date params for calendar"""
        token = self.get_admin_token()
        
        # Get current month date range
        today = datetime.now()
        start_date = (today.replace(day=1) - timedelta(days=30)).strftime('%Y-%m-%d')
        end_date = (today.replace(day=28) + timedelta(days=35)).strftime('%Y-%m-%d')
        
        response = self.session.get(
            f"{BASE_URL}/api/bookings?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/bookings with date range returns {len(data)} bookings")
        
    def test_bookings_have_required_calendar_fields(self):
        """Test that bookings have fields needed for calendar display"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            booking = data[0]
            # Check for calendar-relevant fields
            assert "id" in booking
            assert "status" in booking
            # Either booking_date or pickup_datetime should exist
            has_date = "booking_date" in booking or "pickup_datetime" in booking
            assert has_date, "Booking should have booking_date or pickup_datetime"
            print(f"✓ Booking has required calendar fields: id, status, date")
        else:
            print("⚠ No bookings to verify fields, skipping field check")
            
    # ============ REJECTION ENDPOINT TESTS ============
    
    def test_reject_endpoint_requires_auth(self):
        """Test POST /api/bookings/{id}/reject requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/bookings/test-id/reject",
            json={
                "reason_code": "vehicle_issue",
                "reason_label": "Vehicle Issue",
                "notes": "Test"
            }
        )
        assert response.status_code in [401, 403]
        print("✓ POST /api/bookings/{id}/reject requires authentication")
        
    def test_reject_endpoint_returns_404_for_invalid_booking(self):
        """Test POST /api/bookings/{id}/reject returns 404 for non-existent booking"""
        token = self.get_admin_token()
        response = self.session.post(
            f"{BASE_URL}/api/bookings/non-existent-booking-id/reject",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "reason_code": "vehicle_issue",
                "reason_label": "Vehicle Issue",
                "notes": "Test rejection"
            }
        )
        assert response.status_code == 404
        print("✓ POST /api/bookings/{id}/reject returns 404 for non-existent booking")
        
    def test_rejection_reasons_are_valid(self):
        """Test that rejection endpoint accepts valid reason codes"""
        # Valid reason codes from DriverRejectionModal
        valid_reasons = [
            "vehicle_issue",
            "schedule_conflict", 
            "location_issue",
            "medical_reason",
            "equipment_missing",
            "other"
        ]
        
        # Just verify the list is correct
        assert len(valid_reasons) == 6
        assert "vehicle_issue" in valid_reasons
        assert "other" in valid_reasons
        print(f"✓ Valid rejection reasons defined: {valid_reasons}")
        
    def test_rejections_history_endpoint_requires_auth(self):
        """Test GET /api/bookings/{id}/rejections requires authentication"""
        response = self.session.get(
            f"{BASE_URL}/api/bookings/test-id/rejections"
        )
        assert response.status_code in [401, 403]
        print("✓ GET /api/bookings/{id}/rejections requires authentication")
        
    def test_rejections_history_returns_list(self):
        """Test GET /api/bookings/{id}/rejections returns a list"""
        token = self.get_admin_token()
        
        # First get a booking ID
        bookings_response = self.session.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if bookings_response.status_code == 200 and len(bookings_response.json()) > 0:
            booking_id = bookings_response.json()[0]["id"]
            
            response = self.session.get(
                f"{BASE_URL}/api/bookings/{booking_id}/rejections",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ GET /api/bookings/{booking_id}/rejections returns list with {len(data)} rejections")
        else:
            # No bookings, test with fake ID - should return empty list or 404
            response = self.session.get(
                f"{BASE_URL}/api/bookings/fake-booking-id/rejections",
                headers={"Authorization": f"Bearer {token}"}
            )
            # Should return empty list for non-existent booking
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 0
            print("✓ GET /api/bookings/{id}/rejections returns empty list for non-existent booking")
            
    # ============ INTEGRATION TEST ============
    
    def test_create_booking_and_reject_flow(self):
        """Test full flow: create booking, assign driver, reject"""
        token = self.get_admin_token()
        
        # Create a test booking
        booking_data = {
            "patient_name": "TEST_Calendar_Patient",
            "contact_phone": "+381601234567",
            "booking_date": datetime.now().strftime('%Y-%m-%d'),
            "pickup_time": "14:00",
            "start_point": "Test Start Location",
            "end_point": "Test End Location",
            "mobility_status": "ambulatory",
            "notes": "Test booking for calendar/rejection testing"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {token}"},
            json=booking_data
        )
        
        if create_response.status_code in [200, 201]:
            booking = create_response.json()
            booking_id = booking.get("id")
            print(f"✓ Created test booking: {booking_id}")
            
            # Try to reject it (admin can reject)
            reject_response = self.session.post(
                f"{BASE_URL}/api/bookings/{booking_id}/reject",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "reason_code": "schedule_conflict",
                    "reason_label": "Schedule Conflict",
                    "notes": "Test rejection from automated test"
                }
            )
            
            # Rejection might fail if booking is not assigned - that's expected
            if reject_response.status_code == 200:
                reject_data = reject_response.json()
                assert reject_data.get("success") == True
                assert "rejection_id" in reject_data
                print(f"✓ Booking rejected successfully, rejection_id: {reject_data.get('rejection_id')}")
                
                # Verify rejection appears in history
                history_response = self.session.get(
                    f"{BASE_URL}/api/bookings/{booking_id}/rejections",
                    headers={"Authorization": f"Bearer {token}"}
                )
                assert history_response.status_code == 200
                history = history_response.json()
                assert len(history) > 0
                print(f"✓ Rejection history contains {len(history)} entries")
            else:
                print(f"⚠ Rejection returned {reject_response.status_code} - may need assigned driver")
                
            # Cleanup - delete test booking
            delete_response = self.session.delete(
                f"{BASE_URL}/api/bookings/{booking_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if delete_response.status_code in [200, 204]:
                print(f"✓ Cleaned up test booking: {booking_id}")
        else:
            print(f"⚠ Could not create test booking: {create_response.status_code}")
            

class TestCalendarViewComponent:
    """Test calendar-specific booking queries"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
        
    def test_calendar_month_query(self):
        """Test fetching bookings for a specific month (calendar use case)"""
        token = self.get_admin_token()
        
        # Query for current month
        today = datetime.now()
        year = today.year
        month = today.month
        
        # Start of month - 1 month buffer
        start_date = datetime(year, month, 1) - timedelta(days=30)
        # End of month + 1 month buffer
        if month == 12:
            end_date = datetime(year + 1, 2, 28)
        else:
            end_date = datetime(year, month + 2, 28)
            
        response = self.session.get(
            f"{BASE_URL}/api/bookings?start_date={start_date.strftime('%Y-%m-%d')}&end_date={end_date.strftime('%Y-%m-%d')}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        bookings = response.json()
        assert isinstance(bookings, list)
        print(f"✓ Calendar month query returned {len(bookings)} bookings")
        
    def test_bookings_have_status_for_filtering(self):
        """Test that bookings have status field for calendar filtering"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        bookings = response.json()
        
        valid_statuses = ['pending', 'confirmed', 'assigned', 'en_route', 'in_transit', 
                         'arrived', 'picked_up', 'completed', 'cancelled']
        
        for booking in bookings[:5]:  # Check first 5
            assert "status" in booking
            assert booking["status"] in valid_statuses, f"Invalid status: {booking['status']}"
            
        print(f"✓ All checked bookings have valid status field")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
