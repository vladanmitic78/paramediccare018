"""
Test Driver Assignment Features
- POST /api/admin/assign-driver-public endpoint
- GET /api/admin/drivers endpoint (for available drivers)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@paramedic-care018.rs"
ADMIN_PASSWORD = "Admin123!"
DRIVER_EMAIL = "driver@test.com"
DRIVER_PASSWORD = "Test123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def driver_token():
    """Get driver authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DRIVER_EMAIL,
        "password": DRIVER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Driver authentication failed")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestAdminDriversEndpoint:
    """Test GET /api/admin/drivers endpoint"""
    
    def test_get_drivers_requires_auth(self):
        """Test that /api/admin/drivers requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/drivers")
        assert response.status_code == 403
    
    def test_get_drivers_requires_admin_role(self, driver_token):
        """Test that /api/admin/drivers requires admin role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/drivers",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403
    
    def test_get_drivers_success(self, admin_token):
        """Test admin can get list of drivers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/drivers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify driver data structure
        if len(data) > 0:
            driver = data[0]
            assert "id" in driver
            assert "full_name" in driver
            assert "email" in driver
            assert "role" in driver
            assert driver["role"] == "driver"
            assert "driver_status" in driver
            assert "last_location" in driver
    
    def test_drivers_have_valid_status(self, admin_token):
        """Test that drivers have valid status values"""
        response = requests.get(
            f"{BASE_URL}/api/admin/drivers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        valid_statuses = ["offline", "available", "assigned", "en_route", "on_site", "transporting"]
        for driver in data:
            assert driver["driver_status"] in valid_statuses, f"Invalid status: {driver['driver_status']}"


class TestAssignDriverPublicEndpoint:
    """Test POST /api/admin/assign-driver-public endpoint"""
    
    def test_assign_driver_public_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/assign-driver-public",
            params={"booking_id": "test", "driver_id": "test"}
        )
        assert response.status_code == 403
    
    def test_assign_driver_public_requires_admin_role(self, driver_token):
        """Test that endpoint requires admin role"""
        response = requests.post(
            f"{BASE_URL}/api/admin/assign-driver-public",
            params={"booking_id": "test", "driver_id": "test"},
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403
    
    def test_assign_driver_public_invalid_driver(self, admin_token):
        """Test assigning non-existent driver returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/assign-driver-public",
            params={"booking_id": "test-booking", "driver_id": "non-existent-driver"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        assert "Driver not found" in response.json().get("detail", "")
    
    def test_assign_driver_public_invalid_booking(self, admin_token):
        """Test assigning to non-existent booking returns 404"""
        # First get a valid driver ID
        drivers_response = requests.get(
            f"{BASE_URL}/api/admin/drivers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        drivers = drivers_response.json()
        
        # Find an available or offline driver
        available_driver = None
        for driver in drivers:
            if driver["driver_status"] in ["available", "offline"]:
                available_driver = driver
                break
        
        if not available_driver:
            pytest.skip("No available drivers to test with")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/assign-driver-public",
            params={"booking_id": "non-existent-booking", "driver_id": available_driver["id"]},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        assert "Booking not found" in response.json().get("detail", "")


class TestAssignDriverPatientPortalEndpoint:
    """Test POST /api/admin/assign-driver endpoint (Patient Portal)"""
    
    def test_assign_driver_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/assign-driver",
            params={"booking_id": "test", "driver_id": "test"}
        )
        assert response.status_code == 403
    
    def test_assign_driver_requires_admin_role(self, driver_token):
        """Test that endpoint requires admin role"""
        response = requests.post(
            f"{BASE_URL}/api/admin/assign-driver",
            params={"booking_id": "test", "driver_id": "test"},
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403


class TestBookingsEndpoint:
    """Test bookings endpoint for search functionality verification"""
    
    def test_get_bookings_success(self, admin_token):
        """Test admin can get list of bookings"""
        response = requests.get(
            f"{BASE_URL}/api/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify booking data structure includes fields needed for search
        if len(data) > 0:
            booking = data[0]
            assert "id" in booking
            assert "patient_name" in booking
            assert "contact_phone" in booking
            assert "status" in booking
            assert "start_point" in booking
            assert "end_point" in booking


class TestPatientBookingsEndpoint:
    """Test patient bookings endpoint"""
    
    def test_get_patient_bookings_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/patient-bookings")
        assert response.status_code == 403
    
    def test_get_patient_bookings_success(self, admin_token):
        """Test admin can get patient portal bookings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/patient-bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify patient booking data structure includes fields needed for search
        if len(data) > 0:
            booking = data[0]
            assert "id" in booking
            assert "patient_name" in booking
            assert "contact_phone" in booking
            assert "status" in booking
            assert "pickup_address" in booking
            assert "destination_address" in booking


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
