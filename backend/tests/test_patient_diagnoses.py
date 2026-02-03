"""
Patient Diagnoses API Tests
Tests for the ICD-10 diagnoses management feature for patients
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DOCTOR_EMAIL = "vladanmitic@gmail.com"
DOCTOR_PASSWORD = "Test123!"
ADMIN_EMAIL = "admin@paramedic-care018.rs"
ADMIN_PASSWORD = "Admin123!"

# Test patient ID (Marko Petrovic)
TEST_PATIENT_ID = "dd157beb-d3d2-4e68-a706-dbc92b508d9f"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def doctor_token(api_client):
    """Get doctor authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOCTOR_EMAIL,
        "password": DOCTOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Doctor authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, doctor_token):
    """Session with doctor auth header"""
    api_client.headers.update({"Authorization": f"Bearer {doctor_token}"})
    return api_client


class TestDiagnosesAuthentication:
    """Test authentication requirements for diagnoses endpoints"""
    
    def test_get_diagnoses_requires_auth(self, api_client):
        """GET /api/patients/{id}/diagnoses requires authentication"""
        # Remove auth header if present
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET diagnoses requires authentication")
    
    def test_post_diagnosis_requires_auth(self, api_client):
        """POST /api/patients/{id}/diagnoses requires authentication"""
        api_client.headers.pop("Authorization", None)
        response = api_client.post(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses", json={
            "code": "TEST",
            "name_en": "Test",
            "name_sr": "Test",
            "category_en": "Test",
            "category_sr": "Test"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST diagnosis requires authentication")
    
    def test_delete_diagnosis_requires_auth(self, api_client):
        """DELETE /api/patients/{id}/diagnoses/{diagnosis_id} requires authentication"""
        api_client.headers.pop("Authorization", None)
        response = api_client.delete(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses/fake-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ DELETE diagnosis requires authentication")


class TestGetPatientDiagnoses:
    """Test GET /api/patients/{patient_id}/diagnoses endpoint"""
    
    def test_get_diagnoses_success(self, authenticated_client):
        """Successfully retrieve diagnoses for a patient"""
        response = authenticated_client.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET diagnoses returns list with {len(data)} diagnoses")
        
        # If there are diagnoses, verify structure
        if len(data) > 0:
            diagnosis = data[0]
            assert "id" in diagnosis, "Diagnosis should have id"
            assert "code" in diagnosis, "Diagnosis should have code"
            assert "name_en" in diagnosis, "Diagnosis should have name_en"
            assert "name_sr" in diagnosis, "Diagnosis should have name_sr"
            assert "category_en" in diagnosis, "Diagnosis should have category_en"
            assert "category_sr" in diagnosis, "Diagnosis should have category_sr"
            assert "added_at" in diagnosis, "Diagnosis should have added_at"
            print(f"✓ Diagnosis structure verified: {diagnosis['code']} - {diagnosis['name_en']}")
    
    def test_get_diagnoses_nonexistent_patient(self, authenticated_client):
        """GET diagnoses for non-existent patient returns empty list"""
        fake_patient_id = str(uuid.uuid4())
        response = authenticated_client.get(f"{BASE_URL}/api/patients/{fake_patient_id}/diagnoses")
        # Should return 200 with empty list (not 404)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 0, "Should return empty list for non-existent patient"
        print("✓ GET diagnoses for non-existent patient returns empty list")


class TestAddPatientDiagnosis:
    """Test POST /api/patients/{patient_id}/diagnoses endpoint"""
    
    def test_add_diagnosis_success(self, authenticated_client):
        """Successfully add a diagnosis to a patient"""
        # Use a unique test code to avoid conflicts
        test_code = f"TEST_{uuid.uuid4().hex[:6].upper()}"
        
        payload = {
            "code": test_code,
            "name_en": "Test Diagnosis",
            "name_sr": "Test Dijagnoza",
            "category_en": "Other",
            "category_sr": "Ostalo",
            "notes": "Test diagnosis for automated testing"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have id"
        assert data["code"] == test_code, f"Code should be {test_code}"
        assert data["name_en"] == "Test Diagnosis", "name_en should match"
        assert data["name_sr"] == "Test Dijagnoza", "name_sr should match"
        assert data["category_en"] == "Other", "category_en should match"
        assert data["category_sr"] == "Ostalo", "category_sr should match"
        assert "added_at" in data, "Should have added_at timestamp"
        assert "added_by" in data, "Should have added_by user id"
        assert "added_by_name" in data, "Should have added_by_name"
        
        print(f"✓ Successfully added diagnosis: {test_code}")
        
        # Store the diagnosis ID for cleanup
        return data["id"]
    
    def test_add_diagnosis_nonexistent_patient(self, authenticated_client):
        """Adding diagnosis to non-existent patient returns 404"""
        fake_patient_id = str(uuid.uuid4())
        
        payload = {
            "code": "TEST_FAKE",
            "name_en": "Test",
            "name_sr": "Test",
            "category_en": "Other",
            "category_sr": "Ostalo"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/patients/{fake_patient_id}/diagnoses",
            json=payload
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Adding diagnosis to non-existent patient returns 404")
    
    def test_add_duplicate_diagnosis_fails(self, authenticated_client):
        """Adding duplicate diagnosis code returns 400"""
        # First, add a diagnosis
        test_code = f"DUP_{uuid.uuid4().hex[:6].upper()}"
        
        payload = {
            "code": test_code,
            "name_en": "Duplicate Test",
            "name_sr": "Duplikat Test",
            "category_en": "Other",
            "category_sr": "Ostalo"
        }
        
        # First add should succeed
        response1 = authenticated_client.post(
            f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses",
            json=payload
        )
        assert response1.status_code == 200, f"First add should succeed: {response1.text}"
        
        # Second add with same code should fail
        response2 = authenticated_client.post(
            f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses",
            json=payload
        )
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        print("✓ Adding duplicate diagnosis code returns 400")
    
    def test_add_real_icd10_diagnosis(self, authenticated_client):
        """Add a real ICD-10 diagnosis (J45 - Asthma)"""
        # First check if J45 already exists
        get_response = authenticated_client.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses")
        existing = get_response.json()
        
        # Check if J45 is already added
        j45_exists = any(d["code"] == "J45" for d in existing)
        
        if j45_exists:
            print("✓ J45 (Asthma) already exists for patient - skipping add test")
            return
        
        payload = {
            "code": "J45",
            "name_en": "Asthma",
            "name_sr": "Astma",
            "category_en": "Respiratory system",
            "category_sr": "Respiratorni sistem"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["code"] == "J45"
        assert data["name_en"] == "Asthma"
        print("✓ Successfully added real ICD-10 diagnosis: J45 - Asthma")


class TestDeletePatientDiagnosis:
    """Test DELETE /api/patients/{patient_id}/diagnoses/{diagnosis_id} endpoint"""
    
    def test_delete_diagnosis_success(self, authenticated_client):
        """Successfully delete a diagnosis"""
        # First, add a diagnosis to delete
        test_code = f"DEL_{uuid.uuid4().hex[:6].upper()}"
        
        add_payload = {
            "code": test_code,
            "name_en": "To Be Deleted",
            "name_sr": "Za Brisanje",
            "category_en": "Other",
            "category_sr": "Ostalo"
        }
        
        add_response = authenticated_client.post(
            f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses",
            json=add_payload
        )
        assert add_response.status_code == 200, f"Add should succeed: {add_response.text}"
        diagnosis_id = add_response.json()["id"]
        
        # Now delete it
        delete_response = authenticated_client.delete(
            f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses/{diagnosis_id}"
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        data = delete_response.json()
        assert data.get("success") == True, "Response should indicate success"
        print(f"✓ Successfully deleted diagnosis: {test_code}")
        
        # Verify it's actually deleted
        get_response = authenticated_client.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses")
        diagnoses = get_response.json()
        assert not any(d["id"] == diagnosis_id for d in diagnoses), "Diagnosis should be removed"
        print("✓ Verified diagnosis is no longer in patient's list")
    
    def test_delete_nonexistent_diagnosis(self, authenticated_client):
        """Deleting non-existent diagnosis returns 404"""
        fake_diagnosis_id = str(uuid.uuid4())
        
        response = authenticated_client.delete(
            f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses/{fake_diagnosis_id}"
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Deleting non-existent diagnosis returns 404")


class TestDiagnosesDataIntegrity:
    """Test data integrity and persistence"""
    
    def test_diagnosis_persists_after_add(self, authenticated_client):
        """Verify diagnosis persists in database after adding"""
        test_code = f"PERSIST_{uuid.uuid4().hex[:6].upper()}"
        
        # Add diagnosis
        add_payload = {
            "code": test_code,
            "name_en": "Persistence Test",
            "name_sr": "Test Perzistencije",
            "category_en": "Other",
            "category_sr": "Ostalo"
        }
        
        add_response = authenticated_client.post(
            f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses",
            json=add_payload
        )
        assert add_response.status_code == 200
        diagnosis_id = add_response.json()["id"]
        
        # Fetch and verify
        get_response = authenticated_client.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses")
        assert get_response.status_code == 200
        
        diagnoses = get_response.json()
        found = next((d for d in diagnoses if d["id"] == diagnosis_id), None)
        
        assert found is not None, "Diagnosis should be found in list"
        assert found["code"] == test_code
        assert found["name_en"] == "Persistence Test"
        assert found["name_sr"] == "Test Perzistencije"
        print(f"✓ Diagnosis {test_code} persisted correctly")
    
    def test_diagnoses_sorted_by_date(self, authenticated_client):
        """Verify diagnoses are sorted by added_at descending"""
        response = authenticated_client.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses")
        assert response.status_code == 200
        
        diagnoses = response.json()
        if len(diagnoses) >= 2:
            # Check that dates are in descending order
            for i in range(len(diagnoses) - 1):
                date1 = diagnoses[i].get("added_at", "")
                date2 = diagnoses[i + 1].get("added_at", "")
                assert date1 >= date2, f"Diagnoses should be sorted by date descending: {date1} >= {date2}"
            print("✓ Diagnoses are sorted by date (newest first)")
        else:
            print("✓ Not enough diagnoses to verify sorting (need at least 2)")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_diagnoses(self, authenticated_client):
        """Remove test diagnoses created during testing"""
        response = authenticated_client.get(f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses")
        if response.status_code != 200:
            print("Could not fetch diagnoses for cleanup")
            return
        
        diagnoses = response.json()
        test_diagnoses = [d for d in diagnoses if d["code"].startswith(("TEST_", "DUP_", "DEL_", "PERSIST_"))]
        
        deleted_count = 0
        for diagnosis in test_diagnoses:
            delete_response = authenticated_client.delete(
                f"{BASE_URL}/api/patients/{TEST_PATIENT_ID}/diagnoses/{diagnosis['id']}"
            )
            if delete_response.status_code == 200:
                deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test diagnoses")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
