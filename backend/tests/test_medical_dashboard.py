"""
Medical Dashboard API Tests
Tests for Phase 1 Doctor/Nurse Dashboard features:
- Patient Medical Database CRUD
- Vital Signs tracking with automatic flagging
- Medical Dashboard stats
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DOCTOR_EMAIL = "doctor@test.com"
DOCTOR_PASSWORD = "Test123!"
ADMIN_EMAIL = "admin@paramedic-care018.rs"
ADMIN_PASSWORD = "Admin123!"
DRIVER_EMAIL = "driver@test.com"
DRIVER_PASSWORD = "Test123!"


class TestAuthSetup:
    """Setup authentication tokens for testing"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def doctor_token(self):
        """Get doctor authentication token - create if doesn't exist"""
        # Try to login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOCTOR_EMAIL,
            "password": DOCTOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # If doctor doesn't exist, create via admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_response.json().get("token")
        
        # Create doctor user
        create_response = requests.post(
            f"{BASE_URL}/api/users",
            json={
                "email": DOCTOR_EMAIL,
                "password": DOCTOR_PASSWORD,
                "full_name": "Test Doctor",
                "role": "doctor",
                "phone": "+381601234567"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Login as doctor
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOCTOR_EMAIL,
            "password": DOCTOR_PASSWORD
        })
        assert response.status_code == 200, f"Doctor login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DRIVER_EMAIL,
            "password": DRIVER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Driver account not available")


class TestMedicalDashboard(TestAuthSetup):
    """Test Medical Dashboard endpoint"""
    
    def test_dashboard_requires_auth(self):
        """Dashboard endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/medical/dashboard")
        assert response.status_code == 403, "Dashboard should require auth"
    
    def test_dashboard_returns_stats(self, admin_token):
        """Dashboard returns correct stats structure"""
        response = requests.get(
            f"{BASE_URL}/api/medical/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "stats" in data
        assert "total_patients" in data["stats"]
        assert "recent_patients" in data["stats"]
        assert "critical_alerts" in data["stats"]
        assert "active_transports" in data["stats"]
        
        # Verify other sections
        assert "active_transports" in data
        assert isinstance(data["active_transports"], list)
    
    def test_dashboard_accessible_by_doctor(self, doctor_token):
        """Dashboard is accessible by doctor role"""
        response = requests.get(
            f"{BASE_URL}/api/medical/dashboard",
            headers={"Authorization": f"Bearer {doctor_token}"}
        )
        assert response.status_code == 200
    
    def test_dashboard_not_accessible_by_driver(self, driver_token):
        """Dashboard is NOT accessible by driver role"""
        response = requests.get(
            f"{BASE_URL}/api/medical/dashboard",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403, "Driver should not access medical dashboard"


class TestPatientCRUD(TestAuthSetup):
    """Test Patient Medical Profile CRUD operations"""
    
    @pytest.fixture(scope="class")
    def test_patient_data(self):
        """Test patient data"""
        return {
            "full_name": f"TEST_Patient_{uuid.uuid4().hex[:8]}",
            "date_of_birth": "1985-06-15",
            "gender": "male",
            "phone": "+381601234567",
            "email": "test.patient@example.com",
            "address": "Test Street 123",
            "city": "Niš",
            "blood_type": "A+",
            "height_cm": 180,
            "weight_kg": 75.5,
            "allergies": [
                {"allergen": "Penicillin", "severity": "severe", "reaction": "Anaphylaxis"},
                {"allergen": "Pollen", "severity": "mild", "reaction": "Sneezing"}
            ],
            "chronic_conditions": [
                {"name": "Hypertension", "diagnosed_date": "2020-01-15", "is_active": True},
                {"name": "Type 2 Diabetes", "diagnosed_date": "2019-06-20", "is_active": True}
            ],
            "current_medications": [
                {"name": "Metformin", "dosage": "500mg", "frequency": "twice daily"},
                {"name": "Lisinopril", "dosage": "10mg", "frequency": "once daily"}
            ],
            "emergency_contacts": [
                {"name": "Jane Doe", "relationship": "Spouse", "phone": "+381609876543", "is_primary": True}
            ],
            "notes": "Test patient for automated testing"
        }
    
    def test_create_patient_requires_auth(self, test_patient_data):
        """Creating patient requires authentication"""
        response = requests.post(f"{BASE_URL}/api/medical/patients", json=test_patient_data)
        assert response.status_code == 403
    
    def test_create_patient_not_allowed_for_driver(self, driver_token, test_patient_data):
        """Driver cannot create patients"""
        response = requests.post(
            f"{BASE_URL}/api/medical/patients",
            json=test_patient_data,
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403
    
    def test_create_patient_success(self, admin_token, test_patient_data):
        """Admin can create patient with all fields"""
        response = requests.post(
            f"{BASE_URL}/api/medical/patients",
            json=test_patient_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create patient failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "patient_id" in data
        assert data["patient_id"].startswith("PC018-P-")
        assert data["full_name"] == test_patient_data["full_name"]
        assert data["blood_type"] == test_patient_data["blood_type"]
        assert len(data["allergies"]) == 2
        assert len(data["chronic_conditions"]) == 2
        assert len(data["current_medications"]) == 2
        assert len(data["emergency_contacts"]) == 1
        
        # Verify calculated fields
        assert "age" in data
        assert data["age"] is not None
        assert "bmi" in data
        assert data["bmi"] is not None
        
        # Store for later tests
        TestPatientCRUD.created_patient_id = data["id"]
        TestPatientCRUD.created_patient_code = data["patient_id"]
    
    def test_list_patients(self, admin_token):
        """List patients returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/medical/patients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "patients" in data
        assert isinstance(data["patients"], list)
        assert data["total"] >= 1  # At least the test patient
    
    def test_search_patients(self, admin_token):
        """Search patients by name"""
        response = requests.get(
            f"{BASE_URL}/api/medical/patients?search=TEST_Patient",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
    
    def test_get_patient_by_id(self, admin_token):
        """Get patient by internal ID"""
        patient_id = getattr(TestPatientCRUD, 'created_patient_id', None)
        if not patient_id:
            pytest.skip("No patient created")
        
        response = requests.get(
            f"{BASE_URL}/api/medical/patients/{patient_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == patient_id
    
    def test_get_patient_by_patient_code(self, admin_token):
        """Get patient by patient code (PC018-P-XXXXX)"""
        patient_code = getattr(TestPatientCRUD, 'created_patient_code', None)
        if not patient_code:
            pytest.skip("No patient created")
        
        response = requests.get(
            f"{BASE_URL}/api/medical/patients/{patient_code}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["patient_id"] == patient_code
    
    def test_update_patient(self, admin_token):
        """Update patient profile"""
        patient_id = getattr(TestPatientCRUD, 'created_patient_id', None)
        if not patient_id:
            pytest.skip("No patient created")
        
        response = requests.put(
            f"{BASE_URL}/api/medical/patients/{patient_id}",
            json={"weight_kg": 78.0, "notes": "Updated notes"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # Verify update persisted
        get_response = requests.get(
            f"{BASE_URL}/api/medical/patients/{patient_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["weight_kg"] == 78.0
        assert data["notes"] == "Updated notes"
        assert "updated_at" in data


class TestVitalSigns(TestAuthSetup):
    """Test Vital Signs recording and retrieval"""
    
    def test_record_vitals_requires_auth(self):
        """Recording vitals requires authentication"""
        response = requests.post(f"{BASE_URL}/api/medical/vitals", json={
            "patient_id": "test",
            "heart_rate": 80
        })
        assert response.status_code == 403
    
    def test_record_vitals_patient_not_found(self, admin_token):
        """Recording vitals for non-existent patient fails"""
        response = requests.post(
            f"{BASE_URL}/api/medical/vitals",
            json={
                "patient_id": "non-existent-id",
                "heart_rate": 80
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
    
    def test_record_normal_vitals(self, admin_token):
        """Record normal vital signs - no flags"""
        patient_id = getattr(TestPatientCRUD, 'created_patient_id', None)
        if not patient_id:
            pytest.skip("No patient created")
        
        response = requests.post(
            f"{BASE_URL}/api/medical/vitals",
            json={
                "patient_id": patient_id,
                "systolic_bp": 120,
                "diastolic_bp": 80,
                "heart_rate": 75,
                "oxygen_saturation": 98,
                "respiratory_rate": 16,
                "temperature": 36.6,
                "blood_glucose": 100,
                "pain_score": 2,
                "measurement_type": "routine",
                "notes": "Normal vitals test"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Record vitals failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert "id" in data
        assert data["patient_id"] == patient_id
        assert data["heart_rate"] == 75
        assert data["oxygen_saturation"] == 98
        assert "recorded_at" in data
        assert "recorded_by" in data
        
        # Normal vitals should have no flags
        assert "flags" in data
        assert len(data["flags"]) == 0, f"Normal vitals should have no flags, got: {data['flags']}"
    
    def test_record_abnormal_vitals_high_bp(self, admin_token):
        """Record high BP - should flag HIGH_BP"""
        patient_id = getattr(TestPatientCRUD, 'created_patient_id', None)
        if not patient_id:
            pytest.skip("No patient created")
        
        response = requests.post(
            f"{BASE_URL}/api/medical/vitals",
            json={
                "patient_id": patient_id,
                "systolic_bp": 160,
                "diastolic_bp": 95,
                "heart_rate": 85,
                "measurement_type": "routine"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "flags" in data
        assert "HIGH_BP" in data["flags"], f"Expected HIGH_BP flag, got: {data['flags']}"
    
    def test_record_abnormal_vitals_low_spo2(self, admin_token):
        """Record low SpO2 - should flag LOW_SPO2"""
        patient_id = getattr(TestPatientCRUD, 'created_patient_id', None)
        if not patient_id:
            pytest.skip("No patient created")
        
        response = requests.post(
            f"{BASE_URL}/api/medical/vitals",
            json={
                "patient_id": patient_id,
                "oxygen_saturation": 92,
                "measurement_type": "routine"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "flags" in data
        assert "LOW_SPO2" in data["flags"], f"Expected LOW_SPO2 flag, got: {data['flags']}"
    
    def test_record_abnormal_vitals_fever(self, admin_token):
        """Record fever - should flag FEVER"""
        patient_id = getattr(TestPatientCRUD, 'created_patient_id', None)
        if not patient_id:
            pytest.skip("No patient created")
        
        response = requests.post(
            f"{BASE_URL}/api/medical/vitals",
            json={
                "patient_id": patient_id,
                "temperature": 38.5,
                "measurement_type": "routine"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "flags" in data
        assert "FEVER" in data["flags"], f"Expected FEVER flag, got: {data['flags']}"
    
    def test_record_abnormal_vitals_tachycardia(self, admin_token):
        """Record high heart rate - should flag TACHYCARDIA"""
        patient_id = getattr(TestPatientCRUD, 'created_patient_id', None)
        if not patient_id:
            pytest.skip("No patient created")
        
        response = requests.post(
            f"{BASE_URL}/api/medical/vitals",
            json={
                "patient_id": patient_id,
                "heart_rate": 110,
                "measurement_type": "routine"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "flags" in data
        assert "TACHYCARDIA" in data["flags"], f"Expected TACHYCARDIA flag, got: {data['flags']}"
    
    def test_get_patient_vitals_history(self, admin_token):
        """Get vitals history for patient"""
        patient_id = getattr(TestPatientCRUD, 'created_patient_id', None)
        if not patient_id:
            pytest.skip("No patient created")
        
        response = requests.get(
            f"{BASE_URL}/api/medical/vitals/{patient_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "vitals" in data
        assert isinstance(data["vitals"], list)
        assert len(data["vitals"]) >= 5  # We recorded 5 vitals above
    
    def test_get_latest_vitals(self, admin_token):
        """Get latest vitals for patient"""
        patient_id = getattr(TestPatientCRUD, 'created_patient_id', None)
        if not patient_id:
            pytest.skip("No patient created")
        
        response = requests.get(
            f"{BASE_URL}/api/medical/vitals/{patient_id}/latest",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return the most recent vitals (tachycardia test)
        assert "heart_rate" in data or "temperature" in data or "oxygen_saturation" in data


class TestMedicalAlerts(TestAuthSetup):
    """Test Medical Alerts endpoint"""
    
    def test_alerts_requires_auth(self):
        """Alerts endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/medical/alerts")
        assert response.status_code == 403
    
    def test_alerts_returns_data(self, admin_token):
        """Alerts endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/medical/alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200


class TestCleanup(TestAuthSetup):
    """Cleanup test data"""
    
    def test_delete_test_patient(self, admin_token):
        """Delete test patient"""
        patient_id = getattr(TestPatientCRUD, 'created_patient_id', None)
        if not patient_id:
            pytest.skip("No patient to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/medical/patients/{patient_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/medical/patients/{patient_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
