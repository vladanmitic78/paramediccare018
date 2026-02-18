"""
Test suite for backend refactoring validation.
Tests the new router files: routes/bookings.py and routes/driver.py
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "vladanmitic@gmail.com"
SUPER_ADMIN_PASSWORD = "Ipponluka_78"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for super admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestHealthEndpoint:
    """Tests for /api/health endpoint (server.py)"""
    
    def test_health_returns_200(self, api_client):
        """GET /api/health - Returns healthy status"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert "service" in data
        print(f"Health check passed: {data}")


class TestGalleryEndpoint:
    """Tests for /api/gallery endpoint (server.py)"""
    
    def test_gallery_returns_200(self, api_client):
        """GET /api/gallery - Returns gallery images"""
        response = api_client.get(f"{BASE_URL}/api/gallery")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Gallery returned {len(data)} images")
        
        # Verify structure if there are images
        if len(data) > 0:
            first_image = data[0]
            assert "id" in first_image
            assert "image_url" in first_image
            print(f"First image: {first_image.get('image_url')}")


class TestPatientTransportReasons:
    """Tests for /api/patient/transport-reasons endpoint (routes/bookings.py)"""
    
    def test_transport_reasons_sr_default(self, api_client):
        """GET /api/patient/transport-reasons - Returns Serbian transport reasons by default"""
        response = api_client.get(f"{BASE_URL}/api/patient/transport-reasons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify it's Serbian (default)
        labels = [item.get("label") for item in data]
        assert any("bolnici" in label.lower() or "dijaliza" in label.lower() for label in labels)
        print(f"Serbian transport reasons: {len(data)} items")
    
    def test_transport_reasons_en(self, api_client):
        """GET /api/patient/transport-reasons?language=en - Returns English transport reasons"""
        response = api_client.get(f"{BASE_URL}/api/patient/transport-reasons?language=en")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify structure
        for item in data:
            assert "value" in item
            assert "label" in item
        
        # Verify it's English
        labels = [item.get("label") for item in data]
        assert any("Hospital" in label or "Dialysis" in label for label in labels)
        print(f"English transport reasons: {len(data)} items")


class TestPublicBookingCreation:
    """Tests for POST /api/bookings endpoint (routes/bookings.py)"""
    
    def test_create_booking_success(self, api_client):
        """POST /api/bookings - Creates a new transport booking"""
        booking_data = {
            "patient_name": "TEST_Pytest_Patient",
            "booking_date": "2026-02-25",
            "booking_time": "10:00",
            "start_point": "Pytest Test Start Location",
            "end_point": "Pytest Test End Location",
            "contact_email": "pytest@test.com",
            "contact_phone": "+381641234567",
            "booking_type": "transport",
            "language": "sr"
        }
        response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data.get("patient_name") == booking_data["patient_name"]
        assert data.get("start_point") == booking_data["start_point"]
        assert data.get("end_point") == booking_data["end_point"]
        assert data.get("contact_email") == booking_data["contact_email"]
        assert data.get("status") == "pending"
        print(f"Booking created with ID: {data.get('id')}")
    
    def test_create_booking_medical_care(self, api_client):
        """POST /api/bookings - Creates a medical care booking"""
        booking_data = {
            "patient_name": "TEST_Medical_Patient",
            "booking_date": "2026-02-26",
            "start_point": "Medical Start Location",
            "end_point": "Medical End Location",
            "contact_email": "medical@test.com",
            "contact_phone": "+381641234568",
            "booking_type": "medical",
            "language": "en"
        }
        response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data.get("patient_name") == booking_data["patient_name"]
        print(f"Medical booking created with ID: {data.get('id')}")
    
    def test_create_booking_validation_missing_email(self, api_client):
        """POST /api/bookings - Returns 422 for missing required fields"""
        booking_data = {
            "patient_name": "Test Patient",
            "booking_date": "2026-02-25",
            "start_point": "Start",
            "end_point": "End",
            "contact_phone": "+381641234567"
            # Missing contact_email
        }
        response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 422
        print(f"Validation correctly returned 422 for missing email")


class TestAdminPatientBookings:
    """Tests for admin patient bookings endpoints (routes/bookings.py)"""
    
    def test_admin_patient_bookings_list(self, authenticated_client):
        """GET /api/admin/patient-bookings - Returns list of bookings for admin"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/patient-bookings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin patient bookings: {len(data)} bookings found")
        
        # Verify structure if there are bookings
        if len(data) > 0:
            first_booking = data[0]
            assert "id" in first_booking
            assert "patient_name" in first_booking
            assert "status" in first_booking
    
    def test_admin_patient_bookings_with_limit(self, authenticated_client):
        """GET /api/admin/patient-bookings?limit=3 - Returns limited list"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/patient-bookings?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 3
        print(f"Limited query returned {len(data)} bookings (max 3)")
    
    def test_admin_patient_bookings_unauthorized(self, api_client):
        """GET /api/admin/patient-bookings - Returns 401 without authentication"""
        # Create fresh session without auth
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.get(f"{BASE_URL}/api/admin/patient-bookings")
        assert response.status_code in [401, 403]
        print(f"Unauthorized access correctly returned {response.status_code}")


class TestNewBookingsCount:
    """Tests for /api/admin/patient-bookings/new-count endpoint (routes/bookings.py)"""
    
    def test_new_bookings_count(self, authenticated_client):
        """GET /api/admin/patient-bookings/new-count - Returns count of new bookings"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/patient-bookings/new-count")
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data.get("count"), int)
        print(f"New bookings count: {data.get('count')}")
        
        # Can have latest booking info or null
        assert "latest" in data
    
    def test_new_bookings_count_with_since(self, authenticated_client):
        """GET /api/admin/patient-bookings/new-count?since=... - Returns count since timestamp"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/admin/patient-bookings/new-count?since=2026-01-01T00:00:00"
        )
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"New bookings count since 2026-01-01: {data.get('count')}")
    
    def test_new_bookings_count_unauthorized(self, api_client):
        """GET /api/admin/patient-bookings/new-count - Returns 401 without auth"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/admin/patient-bookings/new-count")
        assert response.status_code in [401, 403]
        print(f"Unauthorized access correctly returned {response.status_code}")


class TestDriverRoutes:
    """Tests for driver routes (routes/driver.py)"""
    
    def test_admin_drivers_list(self, authenticated_client):
        """GET /api/admin/drivers - Returns list of drivers for admin"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/drivers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin drivers list: {len(data)} drivers found")
        
        # Verify structure if there are drivers
        if len(data) > 0:
            first_driver = data[0]
            assert "id" in first_driver
            assert "email" in first_driver
            assert "full_name" in first_driver
            # Check driver status info is included
            assert "driver_status" in first_driver
    
    def test_admin_drivers_unauthorized(self, api_client):
        """GET /api/admin/drivers - Returns 401 without authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/admin/drivers")
        assert response.status_code in [401, 403]
        print(f"Unauthorized access correctly returned {response.status_code}")


class TestGetBookings:
    """Tests for GET /api/bookings endpoint (routes/bookings.py)"""
    
    def test_get_bookings_authenticated(self, authenticated_client):
        """GET /api/bookings - Returns bookings for authenticated user"""
        response = authenticated_client.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Bookings list: {len(data)} bookings found")
    
    def test_get_bookings_unauthorized(self, api_client):
        """GET /api/bookings - Returns 401 without authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/bookings")
        assert response.status_code in [401, 403]
        print(f"Unauthorized access correctly returned {response.status_code}")


class TestCleanup:
    """Cleanup test-created data"""
    
    def test_cleanup_test_bookings(self, authenticated_client):
        """Delete TEST_ prefixed bookings created during tests"""
        # Get all public bookings
        response = authenticated_client.get(f"{BASE_URL}/api/bookings")
        if response.status_code == 200:
            bookings = response.json()
            test_bookings = [b for b in bookings if b.get("patient_name", "").startswith("TEST_")]
            
            for booking in test_bookings:
                delete_response = authenticated_client.delete(f"{BASE_URL}/api/bookings/{booking['id']}")
                print(f"Deleted test booking {booking['id']}: {delete_response.status_code}")
        
        print("Cleanup completed")
