"""
Test Medical Routes and Doctor Decision Panel API
Tests the refactored medical routes from routes/medical.py including:
- Medical dashboard endpoint
- Patient CRUD operations
- Vital signs recording
- Doctor Decision Panel CRUD (create, acknowledge, execute, cancel)
- Active decisions endpoint
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "admin@paramedic-care018.rs"
SUPERADMIN_PASSWORD = "Admin123!"
DOCTOR_EMAIL = "vladanmitic@gmail.com"
DOCTOR_PASSWORD = "Test123!"


class TestAuthSetup:
    """Authentication setup for tests"""
    
    @pytest.fixture(scope="class")
    def superadmin_token(self):
        """Get superadmin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Superadmin login failed: {response.text}"
        data = response.json()
        # API returns access_token, not token
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data.keys()}"
        return token
    
    @pytest.fixture(scope="class")
    def doctor_token(self):
        """Get doctor authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOCTOR_EMAIL,
            "password": DOCTOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Doctor login failed: {response.text}")
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, superadmin_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {superadmin_token}"}


class TestMedicalDashboard(TestAuthSetup):
    """Test /api/medical/dashboard endpoint"""
    
    def test_dashboard_requires_auth(self):
        """Dashboard should require authentication"""
        response = requests.get(f"{BASE_URL}/api/medical/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Dashboard requires authentication")
    
    def test_dashboard_returns_data(self, auth_headers):
        """Dashboard should return stats and data"""
        response = requests.get(f"{BASE_URL}/api/medical/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        assert "stats" in data, "Missing stats in dashboard"
        assert "active_transports" in data, "Missing active_transports"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_patients" in stats, "Missing total_patients stat"
        assert "active_transports" in stats, "Missing active_transports stat"
        
        print(f"✓ Dashboard returned: {stats['total_patients']} patients, {stats['active_transports']} active transports")


class TestMedicalPatients(TestAuthSetup):
    """Test /api/medical/patients CRUD operations"""
    
    @pytest.fixture(scope="class")
    def test_patient_id(self, auth_headers):
        """Create a test patient and return its ID"""
        patient_data = {
            "full_name": f"TEST_Patient_{uuid.uuid4().hex[:8]}",
            "date_of_birth": "1990-05-15",
            "gender": "male",
            "blood_type": "A+",
            "phone": "+381601234567",
            "allergies": ["Penicillin"],
            "chronic_conditions": ["Hypertension"]
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/patients", 
                                json=patient_data, headers=auth_headers)
        assert response.status_code == 200, f"Create patient failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "No ID in created patient"
        print(f"✓ Created test patient: {data['patient_id']}")
        return data["id"]
    
    def test_patients_list_requires_auth(self):
        """Patients list should require authentication"""
        response = requests.get(f"{BASE_URL}/api/medical/patients")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Patients list requires authentication")
    
    def test_patients_list(self, auth_headers):
        """Should return list of patients"""
        response = requests.get(f"{BASE_URL}/api/medical/patients", headers=auth_headers)
        assert response.status_code == 200, f"List patients failed: {response.text}"
        
        data = response.json()
        assert "patients" in data, "Missing patients array"
        assert "total" in data, "Missing total count"
        
        print(f"✓ Patients list returned {data['total']} patients")
    
    def test_get_patient_by_id(self, auth_headers, test_patient_id):
        """Should get patient by ID"""
        response = requests.get(f"{BASE_URL}/api/medical/patients/{test_patient_id}", 
                               headers=auth_headers)
        assert response.status_code == 200, f"Get patient failed: {response.text}"
        
        data = response.json()
        assert data["id"] == test_patient_id, "Patient ID mismatch"
        assert "full_name" in data, "Missing full_name"
        
        print(f"✓ Got patient: {data['full_name']}")
    
    def test_update_patient(self, auth_headers, test_patient_id):
        """Should update patient"""
        update_data = {
            "weight_kg": 75.5,
            "height_cm": 180,
            "notes": "Updated by test"
        }
        
        response = requests.put(f"{BASE_URL}/api/medical/patients/{test_patient_id}",
                               json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Update patient failed: {response.text}"
        
        data = response.json()
        assert data["weight_kg"] == 75.5, "Weight not updated"
        assert data["height_cm"] == 180, "Height not updated"
        assert "bmi" in data, "BMI not calculated"
        
        print(f"✓ Updated patient, BMI: {data.get('bmi')}")
    
    def test_patient_not_found(self, auth_headers):
        """Should return 404 for non-existent patient"""
        response = requests.get(f"{BASE_URL}/api/medical/patients/nonexistent-id", 
                               headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent patient returns 404")


class TestVitalSigns(TestAuthSetup):
    """Test /api/medical/vitals endpoints"""
    
    @pytest.fixture(scope="class")
    def test_patient_for_vitals(self, auth_headers):
        """Create a patient for vitals testing"""
        patient_data = {
            "full_name": f"TEST_VitalsPatient_{uuid.uuid4().hex[:8]}",
            "date_of_birth": "1985-03-20",
            "gender": "female",
            "phone": "+381609876543"
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/patients", 
                                json=patient_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_record_vitals(self, auth_headers, test_patient_for_vitals):
        """Should record vital signs"""
        vitals_data = {
            "patient_id": test_patient_for_vitals,
            "blood_pressure_systolic": 120,
            "blood_pressure_diastolic": 80,
            "heart_rate": 72,
            "respiratory_rate": 16,
            "temperature": 36.6,
            "oxygen_saturation": 98,
            "notes": "Test vitals recording"
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/vitals",
                                json=vitals_data, headers=auth_headers)
        assert response.status_code == 200, f"Record vitals failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "No ID in vitals response"
        assert data["heart_rate"] == 72, "Heart rate mismatch"
        assert "flags" in data, "Missing flags in response"
        
        print(f"✓ Recorded vitals, flags: {data.get('flags', [])}")
    
    def test_record_abnormal_vitals(self, auth_headers, test_patient_for_vitals):
        """Should flag abnormal vital signs"""
        vitals_data = {
            "patient_id": test_patient_for_vitals,
            "blood_pressure_systolic": 180,  # HIGH
            "blood_pressure_diastolic": 110,
            "heart_rate": 110,  # TACHYCARDIA
            "oxygen_saturation": 88,  # CRITICAL_SPO2
            "temperature": 39.5  # FEVER
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/vitals",
                                json=vitals_data, headers=auth_headers)
        assert response.status_code == 200, f"Record abnormal vitals failed: {response.text}"
        
        data = response.json()
        flags = data.get("flags", [])
        
        # Should have multiple flags for abnormal values
        assert len(flags) > 0, "No flags for abnormal vitals"
        print(f"✓ Abnormal vitals flagged: {flags}")
    
    def test_get_patient_vitals(self, auth_headers, test_patient_for_vitals):
        """Should get vitals history for patient"""
        response = requests.get(f"{BASE_URL}/api/medical/vitals/{test_patient_for_vitals}",
                               headers=auth_headers)
        assert response.status_code == 200, f"Get vitals failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of vitals"
        assert len(data) >= 2, "Should have at least 2 vitals records"
        
        print(f"✓ Got {len(data)} vitals records")
    
    def test_get_latest_vitals(self, auth_headers, test_patient_for_vitals):
        """Should get latest vitals for patient"""
        response = requests.get(f"{BASE_URL}/api/medical/vitals/latest/{test_patient_for_vitals}",
                               headers=auth_headers)
        assert response.status_code == 200, f"Get latest vitals failed: {response.text}"
        
        data = response.json()
        # Should return the abnormal vitals (most recent)
        if data:
            assert "recorded_at" in data, "Missing recorded_at"
            print(f"✓ Got latest vitals from {data.get('recorded_at')}")
        else:
            print("✓ Latest vitals endpoint works (empty response)")


class TestDoctorDecisionPanel(TestAuthSetup):
    """Test Doctor Decision Panel API endpoints"""
    
    @pytest.fixture(scope="class")
    def test_booking_id(self, auth_headers):
        """Get or create a booking for decision testing"""
        # First try to get an existing booking
        response = requests.get(f"{BASE_URL}/api/bookings", headers=auth_headers)
        if response.status_code == 200:
            bookings = response.json()
            if isinstance(bookings, list) and len(bookings) > 0:
                return bookings[0]["id"]
            elif isinstance(bookings, dict) and bookings.get("bookings"):
                return bookings["bookings"][0]["id"]
        
        # If no bookings, create one
        booking_data = {
            "patient_name": f"TEST_DecisionPatient_{uuid.uuid4().hex[:8]}",
            "contact_phone": "+381601234567",
            "pickup_address": "Test Pickup Address",
            "destination_address": "Test Destination",
            "pickup_date": datetime.now().strftime("%Y-%m-%d"),
            "pickup_time": "10:00",
            "mobility_status": "wheelchair",
            "notes": "Test booking for decisions"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", 
                                json=booking_data, headers=auth_headers)
        if response.status_code in [200, 201]:
            return response.json()["id"]
        
        # Use a fake ID if we can't create
        return f"test-booking-{uuid.uuid4().hex[:8]}"
    
    @pytest.fixture(scope="class")
    def test_decision_id(self, auth_headers, test_booking_id):
        """Create a test decision and return its ID"""
        decision_data = {
            "booking_id": test_booking_id,
            "decision_type": "instruction",
            "instruction": "Test instruction from automated test",
            "priority": "normal",
            "target_role": "all"
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/decisions",
                                json=decision_data, headers=auth_headers)
        assert response.status_code == 200, f"Create decision failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "No ID in decision response"
        print(f"✓ Created test decision: {data['id']}")
        return data["id"]
    
    def test_create_decision_requires_auth(self):
        """Create decision should require authentication"""
        decision_data = {
            "booking_id": "test-booking",
            "decision_type": "instruction",
            "instruction": "Test"
        }
        response = requests.post(f"{BASE_URL}/api/medical/decisions", json=decision_data)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Create decision requires authentication")
    
    def test_create_instruction_decision(self, auth_headers, test_booking_id):
        """Should create an instruction decision"""
        decision_data = {
            "booking_id": test_booking_id,
            "decision_type": "instruction",
            "instruction": "Monitor patient vitals every 15 minutes",
            "priority": "high",
            "target_role": "nurse"
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/decisions",
                                json=decision_data, headers=auth_headers)
        assert response.status_code == 200, f"Create instruction failed: {response.text}"
        
        data = response.json()
        assert data["decision_type"] == "instruction"
        assert data["priority"] == "high"
        assert data["target_role"] == "nurse"
        assert data["status"] == "active"
        assert data["executed"] == False
        
        print(f"✓ Created instruction decision with priority: {data['priority']}")
    
    def test_create_medication_order_decision(self, auth_headers, test_booking_id):
        """Should create a medication order decision"""
        decision_data = {
            "booking_id": test_booking_id,
            "decision_type": "medication_order",
            "instruction": "Administer medication as prescribed",
            "medication_name": "Paracetamol",
            "medication_dosage": "500mg",
            "medication_route": "oral",
            "priority": "urgent",
            "target_role": "nurse"
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/decisions",
                                json=decision_data, headers=auth_headers)
        assert response.status_code == 200, f"Create medication order failed: {response.text}"
        
        data = response.json()
        assert data["decision_type"] == "medication_order"
        assert data["medication_name"] == "Paracetamol"
        assert data["priority"] == "urgent"
        
        print(f"✓ Created medication order: {data['medication_name']} {data['medication_dosage']}")
    
    def test_create_alert_decision(self, auth_headers, test_booking_id):
        """Should create an alert decision"""
        decision_data = {
            "booking_id": test_booking_id,
            "decision_type": "alert",
            "instruction": "Patient has severe allergy to penicillin",
            "priority": "urgent",
            "target_role": "all"
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/decisions",
                                json=decision_data, headers=auth_headers)
        assert response.status_code == 200, f"Create alert failed: {response.text}"
        
        data = response.json()
        assert data["decision_type"] == "alert"
        assert data["priority"] == "urgent"
        
        print(f"✓ Created alert decision")
    
    def test_get_booking_decisions(self, auth_headers, test_booking_id):
        """Should get all decisions for a booking"""
        response = requests.get(f"{BASE_URL}/api/medical/decisions/{test_booking_id}",
                               headers=auth_headers)
        assert response.status_code == 200, f"Get decisions failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of decisions"
        
        print(f"✓ Got {len(data)} decisions for booking")
    
    def test_get_active_decisions(self, auth_headers):
        """Should get all active decisions"""
        response = requests.get(f"{BASE_URL}/api/medical/active-decisions",
                               headers=auth_headers)
        assert response.status_code == 200, f"Get active decisions failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of active decisions"
        
        # All returned decisions should be active
        for decision in data:
            assert decision.get("status") == "active", f"Non-active decision returned: {decision.get('status')}"
        
        print(f"✓ Got {len(data)} active decisions")
    
    def test_acknowledge_decision(self, auth_headers, test_decision_id):
        """Should acknowledge a decision"""
        response = requests.put(f"{BASE_URL}/api/medical/decisions/{test_decision_id}/acknowledge",
                               headers=auth_headers)
        assert response.status_code == 200, f"Acknowledge failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Acknowledge not successful"
        
        print(f"✓ Decision acknowledged")
    
    def test_acknowledge_decision_multiple_times(self, auth_headers, test_decision_id):
        """Should handle multiple acknowledgments (same user)"""
        # Acknowledge again - should not duplicate
        response = requests.put(f"{BASE_URL}/api/medical/decisions/{test_decision_id}/acknowledge",
                               headers=auth_headers)
        assert response.status_code == 200, f"Second acknowledge failed: {response.text}"
        
        print(f"✓ Multiple acknowledgments handled correctly")
    
    def test_execute_decision(self, auth_headers, test_decision_id):
        """Should execute a decision"""
        response = requests.put(f"{BASE_URL}/api/medical/decisions/{test_decision_id}/execute",
                               headers=auth_headers,
                               params={"notes": "Executed by automated test"})
        assert response.status_code == 200, f"Execute failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Execute not successful"
        
        print(f"✓ Decision executed")
    
    def test_cancel_decision(self, auth_headers, test_booking_id):
        """Should cancel a decision"""
        # Create a new decision to cancel
        decision_data = {
            "booking_id": test_booking_id,
            "decision_type": "instruction",
            "instruction": "Decision to be cancelled",
            "priority": "low"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/medical/decisions",
                                       json=decision_data, headers=auth_headers)
        assert create_response.status_code == 200
        decision_id = create_response.json()["id"]
        
        # Cancel it
        response = requests.put(f"{BASE_URL}/api/medical/decisions/{decision_id}/cancel",
                               headers=auth_headers,
                               params={"reason": "Cancelled by automated test"})
        assert response.status_code == 200, f"Cancel failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Cancel not successful"
        
        print(f"✓ Decision cancelled")
    
    def test_decision_not_found(self, auth_headers):
        """Should return 404 for non-existent decision"""
        response = requests.put(f"{BASE_URL}/api/medical/decisions/nonexistent-id/acknowledge",
                               headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print(f"✓ Non-existent decision returns 404")


class TestMedicalChecks(TestAuthSetup):
    """Test /api/medical/checks endpoints"""
    
    @pytest.fixture(scope="class")
    def test_patient_for_checks(self, auth_headers):
        """Create a patient for checks testing"""
        patient_data = {
            "full_name": f"TEST_ChecksPatient_{uuid.uuid4().hex[:8]}",
            "date_of_birth": "1975-08-10",
            "gender": "male",
            "phone": "+381605551234"
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/patients", 
                                json=patient_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_create_medical_check(self, auth_headers, test_patient_for_checks):
        """Should create a medical check"""
        check_data = {
            "patient_id": test_patient_for_checks,
            "check_type": "pre_transport",
            "consciousness": "alert",
            "airway": "clear",
            "breathing": "normal",
            "circulation": "stable",
            "pupil_response": "normal",
            "skin_condition": "normal",
            "mobility_status": "assisted",
            "doctor_notes": "Patient stable for transport"
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/checks",
                                json=check_data, headers=auth_headers)
        assert response.status_code == 200, f"Create check failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "No ID in check response"
        assert data["check_type"] == "pre_transport"
        assert "performed_at" in data, "Missing performed_at"
        
        print(f"✓ Created medical check: {data['check_type']}")
    
    def test_get_patient_checks(self, auth_headers, test_patient_for_checks):
        """Should get checks for patient"""
        response = requests.get(f"{BASE_URL}/api/medical/checks/{test_patient_for_checks}",
                               headers=auth_headers)
        assert response.status_code == 200, f"Get checks failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of checks"
        
        print(f"✓ Got {len(data)} medical checks")


class TestMedications(TestAuthSetup):
    """Test /api/medical/medications endpoints"""
    
    @pytest.fixture(scope="class")
    def test_patient_for_meds(self, auth_headers):
        """Create a patient for medications testing"""
        patient_data = {
            "full_name": f"TEST_MedsPatient_{uuid.uuid4().hex[:8]}",
            "date_of_birth": "1960-12-25",
            "gender": "female",
            "phone": "+381607778899"
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/patients", 
                                json=patient_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_add_medication(self, auth_headers, test_patient_for_meds):
        """Should add medication to patient"""
        med_data = {
            "patient_id": test_patient_for_meds,
            "medication_name": "Aspirin",
            "dosage": "100mg",
            "frequency": "once daily",
            "route": "oral",
            "prescribing_doctor": "Dr. Test",
            "notes": "For cardiovascular protection"
        }
        
        response = requests.post(f"{BASE_URL}/api/medical/medications",
                                json=med_data, headers=auth_headers)
        assert response.status_code == 200, f"Add medication failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "No ID in medication response"
        assert data["medication_name"] == "Aspirin"
        assert data["is_active"] == True
        
        print(f"✓ Added medication: {data['medication_name']}")
        return data["id"]
    
    def test_get_patient_medications(self, auth_headers, test_patient_for_meds):
        """Should get medications for patient"""
        response = requests.get(f"{BASE_URL}/api/medical/medications/{test_patient_for_meds}",
                               headers=auth_headers)
        assert response.status_code == 200, f"Get medications failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of medications"
        
        print(f"✓ Got {len(data)} medications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
