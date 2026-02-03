"""
Test Notifications Router - SMS and Email Settings
Tests: GET/PUT /api/settings/sms, GET/PUT /api/settings/email
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "admin@paramedic-care018.rs"
SUPERADMIN_PASSWORD = "Admin123!"


class TestNotificationsRouter:
    """Test notification settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as Super Admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    # ============ SMS SETTINGS TESTS ============
    
    def test_get_sms_settings_authenticated(self):
        """GET /api/settings/sms - returns SMS settings for Super Admin"""
        response = self.session.get(f"{BASE_URL}/api/settings/sms")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "type" in data
        assert data["type"] == "sms"
        assert "provider" in data
        assert "enabled" in data
        assert "providers_available" in data
        print(f"✓ SMS settings retrieved: provider={data.get('provider')}, enabled={data.get('enabled')}")
    
    def test_get_sms_settings_unauthenticated(self):
        """GET /api/settings/sms - requires authentication"""
        unauthenticated_session = requests.Session()
        response = unauthenticated_session.get(f"{BASE_URL}/api/settings/sms")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ SMS settings requires authentication")
    
    def test_update_sms_settings(self):
        """PUT /api/settings/sms - updates SMS settings"""
        update_data = {
            "provider": "textbelt",
            "api_key": "textbelt",
            "enabled": True
        }
        
        response = self.session.put(f"{BASE_URL}/api/settings/sms", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print("✓ SMS settings updated successfully")
    
    def test_get_sms_logs(self):
        """GET /api/settings/sms/logs - returns SMS logs"""
        response = self.session.get(f"{BASE_URL}/api/settings/sms/logs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ SMS logs retrieved: {len(data)} entries")
    
    # ============ EMAIL SETTINGS TESTS ============
    
    def test_get_email_settings_authenticated(self):
        """GET /api/settings/email - returns email settings for Super Admin"""
        response = self.session.get(f"{BASE_URL}/api/settings/email")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "type" in data
        assert data["type"] == "email"
        assert "smtp_host" in data
        assert "smtp_port" in data
        assert "enabled" in data
        # Password should be masked
        assert data.get("sender_password") == "********"
        print(f"✓ Email settings retrieved: smtp_host={data.get('smtp_host')}, enabled={data.get('enabled')}")
    
    def test_get_email_settings_unauthenticated(self):
        """GET /api/settings/email - requires authentication"""
        unauthenticated_session = requests.Session()
        response = unauthenticated_session.get(f"{BASE_URL}/api/settings/email")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Email settings requires authentication")
    
    def test_update_email_settings(self):
        """PUT /api/settings/email - updates email settings"""
        update_data = {
            "enabled": True,
            "notify_booking_created": True,
            "notify_driver_assigned": True,
            "notify_driver_arriving": True,
            "notify_transport_completed": True,
            "notify_pickup_reminder": True
        }
        
        response = self.session.put(f"{BASE_URL}/api/settings/email", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print("✓ Email settings updated successfully")
    
    def test_get_email_logs(self):
        """GET /api/settings/email/logs - returns email logs"""
        response = self.session.get(f"{BASE_URL}/api/settings/email/logs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Email logs retrieved: {len(data)} entries")


class TestNotificationHelpers:
    """Test notification helper functions via API behavior"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as Super Admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_sms_providers_list(self):
        """Verify SMS providers list is returned"""
        response = self.session.get(f"{BASE_URL}/api/settings/sms")
        assert response.status_code == 200
        
        data = response.json()
        providers = data.get("providers_available", [])
        assert len(providers) > 0, "Expected at least one SMS provider"
        
        # Check expected providers
        provider_ids = [p["id"] for p in providers]
        assert "textbelt" in provider_ids, "Expected textbelt provider"
        assert "twilio" in provider_ids, "Expected twilio provider"
        print(f"✓ SMS providers available: {provider_ids}")
    
    def test_email_notification_toggles(self):
        """Verify email notification toggles are present"""
        response = self.session.get(f"{BASE_URL}/api/settings/email")
        assert response.status_code == 200
        
        data = response.json()
        expected_toggles = [
            "notify_booking_created",
            "notify_driver_assigned",
            "notify_driver_arriving",
            "notify_transport_completed",
            "notify_pickup_reminder"
        ]
        
        for toggle in expected_toggles:
            assert toggle in data, f"Expected toggle {toggle} in email settings"
        print(f"✓ All email notification toggles present")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
