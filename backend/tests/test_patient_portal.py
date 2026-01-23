"""
Patient Portal API Tests
Tests for: login, dashboard, bookings CRUD, invoices, profile, notifications
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_PATIENT_EMAIL = "patient@test.com"
TEST_PATIENT_PASSWORD = "Test123!"


class TestPatientAuth:
    """Patient authentication tests"""
    
    def test_patient_login_success(self):
        """Test patient login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_PATIENT_EMAIL,
            "password": TEST_PATIENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_PATIENT_EMAIL
        assert data["user"]["role"] == "regular"
        assert data["user"]["is_active"] == True
    
    def test_patient_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for patient"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_PATIENT_EMAIL,
        "password": TEST_PATIENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestPatientDashboard:
    """Patient dashboard API tests"""
    
    def test_get_dashboard(self, auth_headers):
        """Test GET /api/patient/dashboard returns correct data structure"""
        response = requests.get(f"{BASE_URL}/api/patient/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "profile" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_bookings" in stats
        assert "unread_notifications" in stats
        assert "pending_invoices" in stats
        
        # Verify profile data
        profile = data["profile"]
        assert profile["email"] == TEST_PATIENT_EMAIL
    
    def test_dashboard_requires_auth(self):
        """Test dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/patient/dashboard")
        assert response.status_code in [401, 403]


class TestTransportReasons:
    """Transport reasons dropdown API tests"""
    
    def test_get_transport_reasons_serbian(self):
        """Test GET /api/patient/transport-reasons returns Serbian options"""
        response = requests.get(f"{BASE_URL}/api/patient/transport-reasons?language=sr")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check structure
        first_reason = data[0]
        assert "value" in first_reason
        assert "label" in first_reason
    
    def test_get_transport_reasons_english(self):
        """Test GET /api/patient/transport-reasons returns English options"""
        response = requests.get(f"{BASE_URL}/api/patient/transport-reasons?language=en")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0


class TestPatientBookings:
    """Patient bookings CRUD tests"""
    
    created_booking_id = None
    
    def test_create_booking(self, auth_headers):
        """Test POST /api/patient/bookings creates a new booking"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        booking_data = {
            "patient_name": "TEST_Patient Name",
            "patient_age": 45,
            "contact_phone": "+381641234567",
            "contact_email": TEST_PATIENT_EMAIL,
            "transport_reason": "hospital_appointment",
            "transport_reason_details": "Test booking for automated testing",
            "mobility_status": "walking",
            "pickup_address": "Test Pickup Address 123, Niš",
            "pickup_lat": None,
            "pickup_lng": None,
            "destination_address": "Test Destination Hospital, Niš",
            "destination_lat": None,
            "destination_lng": None,
            "preferred_date": tomorrow,
            "preferred_time": "10:00",
            "consent_given": True,
            "language": "sr"
        }
        
        response = requests.post(f"{BASE_URL}/api/patient/bookings", 
                                json=booking_data, headers=auth_headers)
        assert response.status_code == 200, f"Create booking failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["patient_name"] == "TEST_Patient Name"
        assert data["status"] == "requested"
        assert data["pickup_address"] == "Test Pickup Address 123, Niš"
        
        # Store for later tests
        TestPatientBookings.created_booking_id = data["id"]
    
    def test_create_booking_without_consent_fails(self, auth_headers):
        """Test booking creation fails without consent"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        booking_data = {
            "patient_name": "TEST_No Consent",
            "patient_age": 30,
            "contact_phone": "+381641234567",
            "contact_email": TEST_PATIENT_EMAIL,
            "transport_reason": "hospital_appointment",
            "mobility_status": "walking",
            "pickup_address": "Test Address",
            "destination_address": "Test Destination",
            "preferred_date": tomorrow,
            "preferred_time": "10:00",
            "consent_given": False,
            "language": "sr"
        }
        
        response = requests.post(f"{BASE_URL}/api/patient/bookings", 
                                json=booking_data, headers=auth_headers)
        assert response.status_code == 400
    
    def test_get_bookings_list(self, auth_headers):
        """Test GET /api/patient/bookings returns list of bookings"""
        response = requests.get(f"{BASE_URL}/api/patient/bookings", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_bookings_with_status_filter(self, auth_headers):
        """Test GET /api/patient/bookings with status filter"""
        response = requests.get(f"{BASE_URL}/api/patient/bookings?status=requested", 
                               headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned bookings should have requested status
        for booking in data:
            assert booking["status"] == "requested"
    
    def test_get_single_booking(self, auth_headers):
        """Test GET /api/patient/bookings/{id} returns booking details"""
        if not TestPatientBookings.created_booking_id:
            pytest.skip("No booking created to test")
        
        response = requests.get(
            f"{BASE_URL}/api/patient/bookings/{TestPatientBookings.created_booking_id}", 
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == TestPatientBookings.created_booking_id
        assert data["patient_name"] == "TEST_Patient Name"
    
    def test_cancel_booking(self, auth_headers):
        """Test POST /api/patient/bookings/{id}/cancel cancels booking"""
        if not TestPatientBookings.created_booking_id:
            pytest.skip("No booking created to test")
        
        response = requests.post(
            f"{BASE_URL}/api/patient/bookings/{TestPatientBookings.created_booking_id}/cancel", 
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Verify booking is cancelled
        verify_response = requests.get(
            f"{BASE_URL}/api/patient/bookings/{TestPatientBookings.created_booking_id}", 
            headers=auth_headers
        )
        assert verify_response.status_code == 200
        assert verify_response.json()["status"] == "cancelled"


class TestPatientInvoices:
    """Patient invoices API tests"""
    
    def test_get_invoices_list(self, auth_headers):
        """Test GET /api/patient/invoices returns list"""
        response = requests.get(f"{BASE_URL}/api/patient/invoices", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_invoices_requires_auth(self):
        """Test invoices endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/patient/invoices")
        assert response.status_code in [401, 403]


class TestPatientProfile:
    """Patient profile API tests"""
    
    def test_get_profile(self, auth_headers):
        """Test GET /api/patient/profile returns user profile"""
        response = requests.get(f"{BASE_URL}/api/patient/profile", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == TEST_PATIENT_EMAIL
        assert "full_name" in data
        assert "phone" in data
    
    def test_update_profile(self, auth_headers):
        """Test PUT /api/patient/profile updates profile"""
        update_data = {
            "full_name": "Test Patient Updated",
            "phone": "+381641234567",
            "language": "sr"
        }
        
        response = requests.put(f"{BASE_URL}/api/patient/profile", 
                               json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["full_name"] == "Test Patient Updated"
        
        # Restore original name
        restore_data = {"full_name": "Test Patient"}
        requests.put(f"{BASE_URL}/api/patient/profile", 
                    json=restore_data, headers=auth_headers)
    
    def test_profile_requires_auth(self):
        """Test profile endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/patient/profile")
        assert response.status_code in [401, 403]


class TestPatientNotifications:
    """Patient notifications API tests"""
    
    def test_get_notifications(self, auth_headers):
        """Test GET /api/patient/notifications returns list"""
        response = requests.get(f"{BASE_URL}/api/patient/notifications", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_mark_all_notifications_read(self, auth_headers):
        """Test POST /api/patient/notifications/read-all marks all as read"""
        response = requests.post(f"{BASE_URL}/api/patient/notifications/read-all", 
                                headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
    
    def test_notifications_requires_auth(self):
        """Test notifications endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/patient/notifications")
        assert response.status_code in [401, 403]


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_bookings(self, auth_headers):
        """Clean up TEST_ prefixed bookings"""
        # Get all bookings
        response = requests.get(f"{BASE_URL}/api/patient/bookings", headers=auth_headers)
        if response.status_code == 200:
            bookings = response.json()
            for booking in bookings:
                if booking.get("patient_name", "").startswith("TEST_"):
                    # Cancel if not already cancelled
                    if booking["status"] not in ["cancelled", "completed"]:
                        requests.post(
                            f"{BASE_URL}/api/patient/bookings/{booking['id']}/cancel",
                            headers=auth_headers
                        )
        assert True  # Cleanup always passes


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
