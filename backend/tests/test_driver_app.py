"""
Driver App API Tests
Tests for driver login, profile, status updates, location tracking, and assignment endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DRIVER_EMAIL = "driver@test.com"
DRIVER_PASSWORD = "Test123!"
ADMIN_EMAIL = "admin@paramedic-care018.rs"
ADMIN_PASSWORD = "Admin123!"


class TestDriverAuth:
    """Driver authentication tests"""
    
    def test_driver_login_success(self):
        """Test driver login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "driver", f"User role should be 'driver', got {data['user']['role']}"
        assert data["user"]["email"] == DRIVER_EMAIL
        print(f"SUCCESS: Driver login - {data['user']['full_name']}")
    
    def test_driver_login_invalid_credentials(self):
        """Test driver login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Invalid credentials returns 401")


class TestDriverProfile:
    """Driver profile endpoint tests"""
    
    @pytest.fixture
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Driver login failed")
        return response.json()["access_token"]
    
    def test_get_driver_profile(self, driver_token):
        """Test GET /api/driver/profile returns driver data and status"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/driver/profile", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "driver" in data, "Response should contain 'driver'"
        assert "status" in data, "Response should contain 'status'"
        assert data["driver"]["email"] == DRIVER_EMAIL
        assert "status" in data["status"], "Status object should have 'status' field"
        print(f"SUCCESS: Driver profile - {data['driver']['full_name']}, status: {data['status']['status']}")
    
    def test_driver_profile_requires_auth(self):
        """Test driver profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/driver/profile")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Driver profile requires authentication")
    
    def test_driver_profile_requires_driver_role(self):
        """Test driver profile requires driver role"""
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_response.status_code != 200:
            pytest.skip("Admin login failed")
        
        admin_token = admin_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/driver/profile", headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-driver, got {response.status_code}"
        print("SUCCESS: Driver profile requires driver role")


class TestDriverStatus:
    """Driver status update tests"""
    
    @pytest.fixture
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Driver login failed")
        return response.json()["access_token"]
    
    def test_update_status_to_available(self, driver_token):
        """Test updating driver status to available (go online)"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.put(f"{BASE_URL}/api/driver/status", 
            headers=headers,
            json={"status": "available"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("status") == "available"
        print("SUCCESS: Driver status updated to 'available'")
    
    def test_update_status_to_offline(self, driver_token):
        """Test updating driver status to offline (go offline)"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.put(f"{BASE_URL}/api/driver/status", 
            headers=headers,
            json={"status": "offline"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("status") == "offline"
        print("SUCCESS: Driver status updated to 'offline'")
    
    def test_update_status_invalid(self, driver_token):
        """Test updating driver status with invalid status"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.put(f"{BASE_URL}/api/driver/status", 
            headers=headers,
            json={"status": "invalid_status"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("SUCCESS: Invalid status returns 400")
    
    def test_status_update_requires_auth(self):
        """Test status update requires authentication"""
        response = requests.put(f"{BASE_URL}/api/driver/status", 
            json={"status": "available"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Status update requires authentication")


class TestDriverLocation:
    """Driver location update tests"""
    
    @pytest.fixture
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Driver login failed")
        return response.json()["access_token"]
    
    def test_update_location(self, driver_token):
        """Test updating driver location"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        location_data = {
            "latitude": 43.3209,
            "longitude": 21.8958,
            "speed": 45.5,
            "heading": 180.0,
            "accuracy": 10.0
        }
        response = requests.post(f"{BASE_URL}/api/driver/location", 
            headers=headers,
            json=location_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"SUCCESS: Location updated - lat: {location_data['latitude']}, lng: {location_data['longitude']}")
    
    def test_update_location_minimal(self, driver_token):
        """Test updating driver location with minimal data"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        location_data = {
            "latitude": 43.3209,
            "longitude": 21.8958
        }
        response = requests.post(f"{BASE_URL}/api/driver/location", 
            headers=headers,
            json=location_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("SUCCESS: Location updated with minimal data")
    
    def test_location_update_requires_auth(self):
        """Test location update requires authentication"""
        response = requests.post(f"{BASE_URL}/api/driver/location", 
            json={"latitude": 43.3209, "longitude": 21.8958}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Location update requires authentication")


class TestDriverAssignment:
    """Driver assignment tests"""
    
    @pytest.fixture
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Driver login failed")
        return response.json()["access_token"]
    
    def test_get_assignment_no_assignment(self, driver_token):
        """Test getting assignment when none assigned"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/driver/assignment", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "has_assignment" in data, "Response should contain 'has_assignment'"
        print(f"SUCCESS: Assignment check - has_assignment: {data['has_assignment']}")
    
    def test_assignment_requires_auth(self):
        """Test assignment endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/driver/assignment")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Assignment endpoint requires authentication")


class TestDriverStatusFlow:
    """Test complete driver status flow"""
    
    @pytest.fixture
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Driver login failed")
        return response.json()["access_token"]
    
    def test_status_flow_offline_to_available(self, driver_token):
        """Test status flow: offline -> available"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        # First set to offline
        response = requests.put(f"{BASE_URL}/api/driver/status", 
            headers=headers,
            json={"status": "offline"}
        )
        assert response.status_code == 200
        
        # Then set to available
        response = requests.put(f"{BASE_URL}/api/driver/status", 
            headers=headers,
            json={"status": "available"}
        )
        assert response.status_code == 200
        
        # Verify profile shows available
        response = requests.get(f"{BASE_URL}/api/driver/profile", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"]["status"] == "available"
        print("SUCCESS: Status flow offline -> available verified")
    
    def test_status_flow_available_to_offline(self, driver_token):
        """Test status flow: available -> offline"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        # First set to available
        response = requests.put(f"{BASE_URL}/api/driver/status", 
            headers=headers,
            json={"status": "available"}
        )
        assert response.status_code == 200
        
        # Then set to offline
        response = requests.put(f"{BASE_URL}/api/driver/status", 
            headers=headers,
            json={"status": "offline"}
        )
        assert response.status_code == 200
        
        # Verify profile shows offline
        response = requests.get(f"{BASE_URL}/api/driver/profile", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"]["status"] == "offline"
        print("SUCCESS: Status flow available -> offline verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
