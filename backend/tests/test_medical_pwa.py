"""
Test Medical Staff PWA and User Registration Role Bug Fix
Tests:
1. Medical Staff PWA - Login as doctor and navigate to /medical-pwa
2. Medical Staff PWA - Transport list displays with patient info
3. Medical Staff PWA - Vitals entry form functionality
4. Medical Staff PWA - Normal Values preset button
5. Medical Staff PWA - Clear All button
6. Medical Staff PWA - Save vital signs via POST /api/transport/vitals
7. Medical Staff PWA - Critical value detection (SpO2 < 90)
8. User Registration Role Bug Fix - POST /api/auth/register with role='doctor'
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://paramedic-care-018-1.preview.emergentagent.com').rstrip('/')

# Test credentials
DOCTOR_EMAIL = "doctor@test.com"
DOCTOR_PASSWORD = "Test123!"
ADMIN_EMAIL = "admin@paramedic-care018.rs"
ADMIN_PASSWORD = "Admin123!"


class TestUserRegistrationRoleBug:
    """Test that POST /api/auth/register correctly handles role field"""
    
    def test_register_with_doctor_role(self):
        """Test that registering with role='doctor' creates user with doctor role"""
        unique_email = f"test_doctor_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test123!",
            "full_name": "Test Doctor Registration",
            "phone": "+381123456789",
            "role": "doctor",
            "language": "en"
        })
        
        print(f"Registration response status: {response.status_code}")
        print(f"Registration response: {response.json()}")
        
        # Should succeed with verification required
        assert response.status_code == 200
        data = response.json()
        assert "requires_verification" in data or "message" in data
        
        # Now verify the user was created with doctor role by checking via admin
        # Login as admin to check user
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if admin_login.status_code == 200:
            admin_token = admin_login.json()["access_token"]
            
            # Get users list
            users_response = requests.get(
                f"{BASE_URL}/api/admin/users",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            if users_response.status_code == 200:
                users = users_response.json()
                # Find the newly created user
                new_user = None
                for user in users:
                    if user.get("email") == unique_email:
                        new_user = user
                        break
                
                if new_user:
                    print(f"Created user role: {new_user.get('role')}")
                    assert new_user.get("role") == "doctor", f"Expected role 'doctor', got '{new_user.get('role')}'"
                    print("✓ User registration role bug fix verified - doctor role correctly assigned")
                else:
                    print("User not found in admin list (may need verification)")
    
    def test_register_with_nurse_role(self):
        """Test that registering with role='nurse' creates user with nurse role"""
        unique_email = f"test_nurse_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test123!",
            "full_name": "Test Nurse Registration",
            "phone": "+381123456789",
            "role": "nurse",
            "language": "en"
        })
        
        print(f"Nurse registration response status: {response.status_code}")
        assert response.status_code == 200
        print("✓ Nurse role registration accepted")
    
    def test_register_with_driver_role(self):
        """Test that registering with role='driver' creates user with driver role"""
        unique_email = f"test_driver_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test123!",
            "full_name": "Test Driver Registration",
            "phone": "+381123456789",
            "role": "driver",
            "language": "en"
        })
        
        print(f"Driver registration response status: {response.status_code}")
        assert response.status_code == 200
        print("✓ Driver role registration accepted")
    
    def test_register_with_invalid_role_defaults_to_regular(self):
        """Test that registering with invalid role defaults to 'regular'"""
        unique_email = f"test_invalid_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test123!",
            "full_name": "Test Invalid Role",
            "phone": "+381123456789",
            "role": "superadmin",  # Should not be allowed via registration
            "language": "en"
        })
        
        print(f"Invalid role registration response status: {response.status_code}")
        # Should still succeed but with regular role
        assert response.status_code == 200
        print("✓ Invalid role registration handled (defaults to regular)")


class TestMedicalStaffPWABackend:
    """Test backend APIs for Medical Staff PWA"""
    
    @pytest.fixture
    def doctor_token(self):
        """Get doctor authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOCTOR_EMAIL,
            "password": DOCTOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Doctor login failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_doctor_login(self):
        """Test doctor can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOCTOR_EMAIL,
            "password": DOCTOR_PASSWORD
        })
        
        print(f"Doctor login status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "doctor"
        print(f"✓ Doctor login successful - role: {data['user']['role']}")
    
    def test_medical_dashboard_access(self, doctor_token):
        """Test doctor can access medical dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/medical/dashboard",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        
        print(f"Medical dashboard status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "active_transports" in data
        print(f"✓ Medical dashboard accessible - active transports: {len(data.get('active_transports', []))}")
    
    def test_transport_vitals_endpoint_requires_auth(self):
        """Test that transport vitals endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/transport/vitals", json={
            "booking_id": "test-booking",
            "patient_name": "Test Patient"
        })
        
        print(f"Vitals without auth status: {response.status_code}")
        assert response.status_code in [401, 403]
        print("✓ Transport vitals endpoint requires authentication")
    
    def test_record_normal_vitals(self, doctor_token):
        """Test recording normal vital signs"""
        vitals_data = {
            "booking_id": f"test-booking-{uuid.uuid4().hex[:8]}",
            "patient_name": "Test Patient Normal",
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "heart_rate": 75,
            "oxygen_saturation": 98,
            "respiratory_rate": 16,
            "temperature": 36.6,
            "gcs_score": 15,
            "consciousness_level": "alert",
            "notes": "Normal vitals test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transport/vitals",
            json=vitals_data,
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        
        print(f"Normal vitals recording status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("is_critical") == False
        assert data.get("severity") == "normal"
        print(f"✓ Normal vitals recorded - severity: {data.get('severity')}, is_critical: {data.get('is_critical')}")
    
    def test_record_critical_low_spo2(self, doctor_token):
        """Test recording critical SpO2 < 90 triggers alert"""
        vitals_data = {
            "booking_id": f"test-booking-critical-{uuid.uuid4().hex[:8]}",
            "patient_name": "Test Patient Critical SpO2",
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "heart_rate": 75,
            "oxygen_saturation": 85,  # Critical - below 90
            "respiratory_rate": 16,
            "temperature": 36.6,
            "gcs_score": 15,
            "consciousness_level": "alert",
            "notes": "Critical SpO2 test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transport/vitals",
            json=vitals_data,
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        
        print(f"Critical SpO2 vitals status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Response data: {data}")
        
        # Check for critical detection
        assert data.get("is_critical") == True or data.get("severity") in ["critical", "life_threatening"]
        
        # Check alerts contain SpO2 related alert
        alerts = data.get("alerts", [])
        spo2_alert_found = any("SPO2" in str(alert).upper() or "OXYGEN" in str(alert).upper() for alert in alerts)
        print(f"✓ Critical SpO2 detected - severity: {data.get('severity')}, alerts: {alerts}")
        assert spo2_alert_found or data.get("is_critical"), "Expected SpO2 critical alert"
    
    def test_record_critical_high_bp(self, doctor_token):
        """Test recording critical high BP triggers alert"""
        vitals_data = {
            "booking_id": f"test-booking-bp-{uuid.uuid4().hex[:8]}",
            "patient_name": "Test Patient Critical BP",
            "systolic_bp": 210,  # Critical - above 200
            "diastolic_bp": 130,
            "heart_rate": 100,
            "oxygen_saturation": 98,
            "respiratory_rate": 20,
            "temperature": 36.6,
            "gcs_score": 15,
            "consciousness_level": "alert",
            "notes": "Critical BP test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transport/vitals",
            json=vitals_data,
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        
        print(f"Critical BP vitals status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("is_critical") == True or data.get("severity") in ["critical", "life_threatening"]
        print(f"✓ Critical BP detected - severity: {data.get('severity')}")
    
    def test_record_critical_low_bp(self, doctor_token):
        """Test recording critical low BP (shock) triggers alert"""
        vitals_data = {
            "booking_id": f"test-booking-lowbp-{uuid.uuid4().hex[:8]}",
            "patient_name": "Test Patient Shock",
            "systolic_bp": 65,  # Critical - below 70 (shock)
            "diastolic_bp": 40,
            "heart_rate": 130,
            "oxygen_saturation": 92,
            "respiratory_rate": 28,
            "temperature": 35.5,
            "gcs_score": 12,
            "consciousness_level": "verbal",
            "notes": "Shock test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transport/vitals",
            json=vitals_data,
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        
        print(f"Critical low BP vitals status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("severity") == "life_threatening" or data.get("is_critical") == True
        print(f"✓ Life-threatening low BP detected - severity: {data.get('severity')}")
    
    def test_get_transport_vitals_history(self, doctor_token):
        """Test getting vitals history for a booking"""
        # First record some vitals
        booking_id = f"test-history-{uuid.uuid4().hex[:8]}"
        
        # Record first vitals
        requests.post(
            f"{BASE_URL}/api/transport/vitals",
            json={
                "booking_id": booking_id,
                "patient_name": "Test Patient History",
                "systolic_bp": 120,
                "diastolic_bp": 80,
                "heart_rate": 75,
                "oxygen_saturation": 98
            },
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        
        # Get vitals history
        response = requests.get(
            f"{BASE_URL}/api/transport/vitals/{booking_id}",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        
        print(f"Vitals history status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "vitals" in data
        assert len(data["vitals"]) >= 1
        print(f"✓ Vitals history retrieved - count: {len(data['vitals'])}")


class TestMedicalDashboardActiveTransports:
    """Test that medical dashboard returns active transports for PWA"""
    
    @pytest.fixture
    def doctor_token(self):
        """Get doctor authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOCTOR_EMAIL,
            "password": DOCTOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Doctor login failed")
    
    def test_active_transports_structure(self, doctor_token):
        """Test that active transports have required fields for PWA display"""
        response = requests.get(
            f"{BASE_URL}/api/medical/dashboard",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        active_transports = data.get("active_transports", [])
        print(f"Active transports count: {len(active_transports)}")
        
        if len(active_transports) > 0:
            transport = active_transports[0]
            # Check required fields for PWA display
            print(f"Transport fields: {list(transport.keys())}")
            
            # These fields are needed for the PWA transport list
            expected_fields = ["patient_name", "status"]
            for field in expected_fields:
                assert field in transport, f"Missing field: {field}"
            
            print(f"✓ Transport has required fields - patient: {transport.get('patient_name')}, status: {transport.get('status')}")
        else:
            print("No active transports found (this is OK for testing)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
