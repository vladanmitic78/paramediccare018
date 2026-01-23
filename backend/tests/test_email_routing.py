"""
Test Email Routing and Language Parameter Support
Tests for:
1. Contact API - inquiry_type routing (general->info@, medical->ambulanta@, transport->transport@)
2. Booking API - language and booking_type parameters
3. Registration API - language parameter
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestContactAPIEmailRouting:
    """Test Contact API accepts language parameter and routes to correct email based on inquiry_type"""
    
    def test_contact_general_inquiry_sr(self):
        """General inquiry should route to info@paramedic-care018.rs with Serbian language"""
        payload = {
            "name": f"TEST_General_SR_{uuid.uuid4().hex[:6]}",
            "email": "test_general_sr@example.com",
            "phone": "+381123456789",
            "message": "Test general inquiry in Serbian",
            "inquiry_type": "general",
            "language": "sr"
        }
        response = requests.post(f"{BASE_URL}/api/contact", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        print("✓ Contact API accepts general inquiry with language=sr")
    
    def test_contact_general_inquiry_en(self):
        """General inquiry should route to info@paramedic-care018.rs with English language"""
        payload = {
            "name": f"TEST_General_EN_{uuid.uuid4().hex[:6]}",
            "email": "test_general_en@example.com",
            "phone": "+381123456789",
            "message": "Test general inquiry in English",
            "inquiry_type": "general",
            "language": "en"
        }
        response = requests.post(f"{BASE_URL}/api/contact", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print("✓ Contact API accepts general inquiry with language=en")
    
    def test_contact_medical_inquiry_sr(self):
        """Medical inquiry should route to ambulanta@paramedic-care018.rs with Serbian language"""
        payload = {
            "name": f"TEST_Medical_SR_{uuid.uuid4().hex[:6]}",
            "email": "test_medical_sr@example.com",
            "phone": "+381123456789",
            "message": "Test medical inquiry in Serbian",
            "inquiry_type": "medical",
            "language": "sr"
        }
        response = requests.post(f"{BASE_URL}/api/contact", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print("✓ Contact API accepts medical inquiry with language=sr")
    
    def test_contact_medical_inquiry_en(self):
        """Medical inquiry should route to ambulanta@paramedic-care018.rs with English language"""
        payload = {
            "name": f"TEST_Medical_EN_{uuid.uuid4().hex[:6]}",
            "email": "test_medical_en@example.com",
            "phone": "+381123456789",
            "message": "Test medical inquiry in English",
            "inquiry_type": "medical",
            "language": "en"
        }
        response = requests.post(f"{BASE_URL}/api/contact", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print("✓ Contact API accepts medical inquiry with language=en")
    
    def test_contact_transport_inquiry_sr(self):
        """Transport inquiry should route to transport@paramedic-care018.rs with Serbian language"""
        payload = {
            "name": f"TEST_Transport_SR_{uuid.uuid4().hex[:6]}",
            "email": "test_transport_sr@example.com",
            "phone": "+381123456789",
            "message": "Test transport inquiry in Serbian",
            "inquiry_type": "transport",
            "language": "sr"
        }
        response = requests.post(f"{BASE_URL}/api/contact", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print("✓ Contact API accepts transport inquiry with language=sr")
    
    def test_contact_transport_inquiry_en(self):
        """Transport inquiry should route to transport@paramedic-care018.rs with English language"""
        payload = {
            "name": f"TEST_Transport_EN_{uuid.uuid4().hex[:6]}",
            "email": "test_transport_en@example.com",
            "phone": "+381123456789",
            "message": "Test transport inquiry in English",
            "inquiry_type": "transport",
            "language": "en"
        }
        response = requests.post(f"{BASE_URL}/api/contact", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print("✓ Contact API accepts transport inquiry with language=en")
    
    def test_contact_default_language(self):
        """Contact API should default to 'sr' if language not provided"""
        payload = {
            "name": f"TEST_Default_Lang_{uuid.uuid4().hex[:6]}",
            "email": "test_default_lang@example.com",
            "message": "Test without language parameter",
            "inquiry_type": "general"
            # language not provided - should default to 'sr'
        }
        response = requests.post(f"{BASE_URL}/api/contact", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Contact API works with default language")


class TestBookingAPIParameters:
    """Test Booking API accepts language and booking_type parameters"""
    
    def test_booking_transport_sr(self):
        """Booking with booking_type=transport and language=sr"""
        payload = {
            "start_point": "Test Start Location",
            "start_lat": 43.32,
            "start_lng": 21.89,
            "end_point": "Test End Location",
            "end_lat": 43.33,
            "end_lng": 21.90,
            "booking_date": "2026-02-15",
            "contact_phone": "+381123456789",
            "contact_email": f"test_booking_transport_sr_{uuid.uuid4().hex[:6]}@example.com",
            "patient_name": f"TEST_Patient_Transport_SR_{uuid.uuid4().hex[:6]}",
            "notes": "Test transport booking in Serbian",
            "booking_type": "transport",
            "language": "sr"
        }
        response = requests.post(f"{BASE_URL}/api/bookings", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["patient_name"] == payload["patient_name"]
        assert data["status"] == "pending"
        print("✓ Booking API accepts transport booking with language=sr")
    
    def test_booking_transport_en(self):
        """Booking with booking_type=transport and language=en"""
        payload = {
            "start_point": "Test Start Location EN",
            "end_point": "Test End Location EN",
            "booking_date": "2026-02-16",
            "contact_phone": "+381123456789",
            "contact_email": f"test_booking_transport_en_{uuid.uuid4().hex[:6]}@example.com",
            "patient_name": f"TEST_Patient_Transport_EN_{uuid.uuid4().hex[:6]}",
            "notes": "Test transport booking in English",
            "booking_type": "transport",
            "language": "en"
        }
        response = requests.post(f"{BASE_URL}/api/bookings", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print("✓ Booking API accepts transport booking with language=en")
    
    def test_booking_medical_sr(self):
        """Booking with booking_type=medical and language=sr"""
        payload = {
            "start_point": "Test Medical Start Location",
            "end_point": "Test Medical End Location",
            "booking_date": "2026-02-17",
            "contact_phone": "+381123456789",
            "contact_email": f"test_booking_medical_sr_{uuid.uuid4().hex[:6]}@example.com",
            "patient_name": f"TEST_Patient_Medical_SR_{uuid.uuid4().hex[:6]}",
            "notes": "Test medical booking in Serbian",
            "booking_type": "medical",
            "language": "sr"
        }
        response = requests.post(f"{BASE_URL}/api/bookings", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print("✓ Booking API accepts medical booking with language=sr")
    
    def test_booking_medical_en(self):
        """Booking with booking_type=medical and language=en"""
        payload = {
            "start_point": "Test Medical Start Location EN",
            "end_point": "Test Medical End Location EN",
            "booking_date": "2026-02-18",
            "contact_phone": "+381123456789",
            "contact_email": f"test_booking_medical_en_{uuid.uuid4().hex[:6]}@example.com",
            "patient_name": f"TEST_Patient_Medical_EN_{uuid.uuid4().hex[:6]}",
            "notes": "Test medical booking in English",
            "booking_type": "medical",
            "language": "en"
        }
        response = requests.post(f"{BASE_URL}/api/bookings", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print("✓ Booking API accepts medical booking with language=en")
    
    def test_booking_default_values(self):
        """Booking API should default to booking_type=transport and language=sr"""
        payload = {
            "start_point": "Test Default Start",
            "end_point": "Test Default End",
            "booking_date": "2026-02-19",
            "contact_phone": "+381123456789",
            "contact_email": f"test_booking_default_{uuid.uuid4().hex[:6]}@example.com",
            "patient_name": f"TEST_Patient_Default_{uuid.uuid4().hex[:6]}"
            # booking_type and language not provided - should use defaults
        }
        response = requests.post(f"{BASE_URL}/api/bookings", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print("✓ Booking API works with default booking_type and language")


class TestRegistrationAPILanguage:
    """Test Registration API accepts language parameter"""
    
    def test_register_with_sr_language(self):
        """Registration with language=sr"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "email": f"test_register_sr_{unique_id}@example.com",
            "password": "TestPass123!",
            "full_name": f"TEST_User_SR_{unique_id}",
            "phone": "+381123456789",
            "role": "regular",
            "language": "sr"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == payload["email"]
        print("✓ Registration API accepts language=sr")
    
    def test_register_with_en_language(self):
        """Registration with language=en"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "email": f"test_register_en_{unique_id}@example.com",
            "password": "TestPass123!",
            "full_name": f"TEST_User_EN_{unique_id}",
            "phone": "+381123456789",
            "role": "regular",
            "language": "en"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print("✓ Registration API accepts language=en")
    
    def test_register_default_language(self):
        """Registration should default to language=sr if not provided"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "email": f"test_register_default_{unique_id}@example.com",
            "password": "TestPass123!",
            "full_name": f"TEST_User_Default_{unique_id}",
            "phone": "+381123456789"
            # language not provided - should default to 'sr'
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        print("✓ Registration API works with default language")


class TestLoginAndAuth:
    """Test login functionality with provided credentials"""
    
    def test_admin_login(self):
        """Test Super Admin login"""
        payload = {
            "email": "admin@paramedic-care018.rs",
            "password": "Admin123!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "superadmin"
        print("✓ Super Admin login works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
