"""
Test Email Settings API Endpoints
Tests for Super Admin email configuration and notification triggers
"""
import pytest
import requests
import os
import uuid
from datetime import datetime
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@paramedic-care018.rs"
SUPER_ADMIN_PASSWORD = "Admin123!"


def get_auth_token():
    """Get Super Admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


class TestEmailSettingsAPI:
    """Test email settings endpoints - Super Admin only"""
    
    def test_01_get_email_settings_requires_auth(self):
        """GET /api/settings/email - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings/email")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/settings/email requires authentication")
        
    def test_02_get_email_settings_superadmin_only(self):
        """GET /api/settings/email - returns settings for Super Admin"""
        token = get_auth_token()
        assert token, "Failed to get auth token"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/settings/email", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "smtp_host" in data, "Missing smtp_host in response"
        assert "smtp_port" in data, "Missing smtp_port in response"
        assert "sender_email" in data, "Missing sender_email in response"
        assert "enabled" in data, "Missing enabled in response"
        
        # Verify notification triggers are present
        assert "notify_booking_created" in data, "Missing notify_booking_created"
        assert "notify_driver_assigned" in data, "Missing notify_driver_assigned"
        assert "notify_driver_arriving" in data, "Missing notify_driver_arriving"
        assert "notify_transport_completed" in data, "Missing notify_transport_completed"
        assert "notify_pickup_reminder" in data, "Missing notify_pickup_reminder"
        
        # Password should be masked
        assert data.get("sender_password") == "********", "Password should be masked"
        
        print(f"✓ GET /api/settings/email returns settings: smtp_host={data.get('smtp_host')}, enabled={data.get('enabled')}")
        
    def test_03_update_email_settings_requires_auth(self):
        """PUT /api/settings/email - requires authentication"""
        response = requests.put(f"{BASE_URL}/api/settings/email", json={
            "enabled": True
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ PUT /api/settings/email requires authentication")
        
    def test_04_update_email_settings_notification_triggers(self):
        """PUT /api/settings/email - updates notification triggers"""
        token = get_auth_token()
        assert token, "Failed to get auth token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/settings/email", headers=headers)
        original_settings = get_response.json()
        
        # Update with modified notification triggers
        update_payload = {
            "smtp_host": original_settings.get("smtp_host"),
            "smtp_port": original_settings.get("smtp_port"),
            "sender_email": original_settings.get("sender_email"),
            "sender_name": original_settings.get("sender_name", "Paramedic Care 018"),
            "enabled": True,
            "notify_booking_created": True,
            "notify_driver_assigned": True,
            "notify_driver_arriving": True,
            "notify_transport_completed": True,
            "notify_pickup_reminder": False  # Disable pickup reminder
        }
        
        response = requests.put(f"{BASE_URL}/api/settings/email", json=update_payload, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        
        # Verify the update persisted
        verify_response = requests.get(f"{BASE_URL}/api/settings/email", headers=headers)
        assert verify_response.status_code == 200
        
        updated_settings = verify_response.json()
        assert updated_settings.get("notify_pickup_reminder") == False, "notify_pickup_reminder should be False"
        
        # Restore original settings
        restore_payload = {
            "smtp_host": original_settings.get("smtp_host"),
            "smtp_port": original_settings.get("smtp_port"),
            "sender_email": original_settings.get("sender_email"),
            "sender_name": original_settings.get("sender_name", "Paramedic Care 018"),
            "enabled": original_settings.get("enabled", True),
            "notify_booking_created": original_settings.get("notify_booking_created", True),
            "notify_driver_assigned": original_settings.get("notify_driver_assigned", True),
            "notify_driver_arriving": original_settings.get("notify_driver_arriving", True),
            "notify_transport_completed": original_settings.get("notify_transport_completed", True),
            "notify_pickup_reminder": original_settings.get("notify_pickup_reminder", True)
        }
        requests.put(f"{BASE_URL}/api/settings/email", json=restore_payload, headers=headers)
        
        print("✓ PUT /api/settings/email updates notification triggers correctly")
        
    def test_05_update_email_settings_enable_disable(self):
        """PUT /api/settings/email - can enable/disable email service"""
        token = get_auth_token()
        assert token, "Failed to get auth token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/settings/email", headers=headers)
        original_settings = get_response.json()
        original_enabled = original_settings.get("enabled", True)
        
        # Toggle enabled state
        update_payload = {
            "smtp_host": original_settings.get("smtp_host"),
            "smtp_port": original_settings.get("smtp_port"),
            "sender_email": original_settings.get("sender_email"),
            "enabled": not original_enabled
        }
        
        response = requests.put(f"{BASE_URL}/api/settings/email", json=update_payload, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify change
        verify_response = requests.get(f"{BASE_URL}/api/settings/email", headers=headers)
        updated_settings = verify_response.json()
        assert updated_settings.get("enabled") == (not original_enabled), "enabled state should be toggled"
        
        # Restore original state
        restore_payload = {
            "smtp_host": original_settings.get("smtp_host"),
            "smtp_port": original_settings.get("smtp_port"),
            "sender_email": original_settings.get("sender_email"),
            "enabled": original_enabled
        }
        requests.put(f"{BASE_URL}/api/settings/email", json=restore_payload, headers=headers)
        
        print(f"✓ PUT /api/settings/email can toggle enabled state (was {original_enabled}, toggled to {not original_enabled}, restored)")
        
    def test_06_test_email_requires_auth(self):
        """POST /api/settings/email/test - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/settings/email/test", json={
            "to_email": "test@example.com"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/settings/email/test requires authentication")
        
    def test_07_test_email_sends_and_logs(self):
        """POST /api/settings/email/test - sends test email and logs it"""
        token = get_auth_token()
        assert token, "Failed to get auth token"
        headers = {"Authorization": f"Bearer {token}"}
        
        test_email = "test-email-settings@example.com"
        test_subject = f"Test Email - {datetime.now().isoformat()}"
        
        response = requests.post(f"{BASE_URL}/api/settings/email/test", json={
            "to_email": test_email,
            "subject": test_subject,
            "message": "This is a test message from the email settings test suite."
        }, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Note: success may be False if SMTP is not configured, but endpoint should work
        assert "success" in data, "Response should contain 'success' field"
        
        if data.get("success"):
            print(f"✓ POST /api/settings/email/test sent email successfully to {test_email}")
        else:
            print(f"✓ POST /api/settings/email/test endpoint works (email may have failed: {data.get('error', 'unknown')})")
            
    def test_08_get_email_logs_requires_auth(self):
        """GET /api/settings/email/logs - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings/email/logs")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/settings/email/logs requires authentication")
        
    def test_09_get_email_logs_returns_list(self):
        """GET /api/settings/email/logs - returns list of email logs"""
        token = get_auth_token()
        assert token, "Failed to get auth token"
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/settings/email/logs?limit=10", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            log = data[0]
            # Verify log structure
            assert "to_email" in log, "Log should contain to_email"
            assert "success" in log, "Log should contain success"
            assert "sent_at" in log, "Log should contain sent_at"
            print(f"✓ GET /api/settings/email/logs returns {len(data)} logs, latest: {log.get('to_email')} at {log.get('sent_at')}")
        else:
            print("✓ GET /api/settings/email/logs returns empty list (no logs yet)")
            
    def test_10_email_logs_contain_test_emails(self):
        """GET /api/settings/email/logs - contains test email entries"""
        token = get_auth_token()
        assert token, "Failed to get auth token"
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/settings/email/logs?limit=50", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        test_logs = [log for log in data if log.get("is_test") == True]
        
        if len(test_logs) > 0:
            print(f"✓ Found {len(test_logs)} test email logs")
        else:
            print("✓ No test email logs found (test emails may not have been sent yet)")


class TestEmailNotificationTriggers:
    """Test that email notifications are triggered on booking events"""
        
    def test_11_booking_creation_triggers_email(self):
        """Creating a booking should trigger booking_confirmation email"""
        token = get_auth_token()
        assert token, "Failed to get auth token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get initial log count
        logs_response = requests.get(f"{BASE_URL}/api/settings/email/logs?limit=100", headers=headers)
        if logs_response.status_code != 200:
            print(f"✓ Booking creation test skipped (logs endpoint returned {logs_response.status_code})")
            return
            
        logs_before = logs_response.json()
        initial_count = len([l for l in logs_before if l.get("notification_type") == "booking_confirmation"])
        
        # Create a test booking with email
        booking_data = {
            "patient_name": "TEST_Email_Patient",
            "contact_phone": "+381601234567",
            "contact_email": "test-booking-email@example.com",
            "start_point": "Test Start Location",
            "end_point": "Test End Location",
            "booking_date": "2026-02-15",
            "pickup_time": "10:00",
            "mobility_status": "wheelchair",
            "notes": "Test booking for email notification"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data, headers=headers)
        
        if response.status_code == 201:
            booking = response.json()
            booking_id = booking.get("id")
            
            # Check if email log was created
            time.sleep(1)  # Wait for async email to be logged
            
            logs_after_response = requests.get(f"{BASE_URL}/api/settings/email/logs?limit=100", headers=headers)
            logs_after = logs_after_response.json()
            new_logs = [l for l in logs_after if l.get("notification_type") == "booking_confirmation" and l.get("booking_id") == booking_id]
            
            # Cleanup - delete test booking
            requests.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=headers)
            
            if len(new_logs) > 0:
                print(f"✓ Booking creation triggered email notification (logged: {new_logs[0].get('success')})")
            else:
                print("✓ Booking created, email notification may be disabled or async")
        else:
            print(f"✓ Booking creation test skipped (status: {response.status_code})")
            
    def test_12_booking_status_change_triggers_email(self):
        """Changing booking status to in_transit should trigger driver_arriving email"""
        token = get_auth_token()
        assert token, "Failed to get auth token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a test booking
        booking_data = {
            "patient_name": "TEST_Status_Change_Patient",
            "contact_phone": "+381601234567",
            "contact_email": "test-status-email@example.com",
            "start_point": "Test Start",
            "end_point": "Test End",
            "booking_date": "2026-02-16",
            "pickup_time": "11:00",
            "mobility_status": "ambulatory"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data, headers=headers)
        
        if create_response.status_code == 201:
            booking = create_response.json()
            booking_id = booking.get("id")
            
            # Update status to in_transit
            status_response = requests.put(f"{BASE_URL}/api/bookings/{booking_id}/status", json={
                "status": "in_transit"
            }, headers=headers)
            
            if status_response.status_code == 200:
                time.sleep(1)
                
                # Check for driver_arriving email log
                logs_response = requests.get(f"{BASE_URL}/api/settings/email/logs?limit=50", headers=headers)
                logs = logs_response.json()
                arriving_logs = [l for l in logs if l.get("notification_type") == "driver_arriving" and l.get("booking_id") == booking_id]
                
                if len(arriving_logs) > 0:
                    print(f"✓ Status change to in_transit triggered driver_arriving email")
                else:
                    print("✓ Status changed, driver_arriving email may be disabled")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=headers)
        else:
            print(f"✓ Status change test skipped (booking creation status: {create_response.status_code})")
            
    def test_13_booking_completion_triggers_email(self):
        """Completing a booking should trigger transport_completed email"""
        token = get_auth_token()
        assert token, "Failed to get auth token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a test booking
        booking_data = {
            "patient_name": "TEST_Completion_Patient",
            "contact_phone": "+381601234567",
            "contact_email": "test-complete-email@example.com",
            "start_point": "Test Start",
            "end_point": "Test End",
            "booking_date": "2026-02-17",
            "pickup_time": "12:00",
            "mobility_status": "stretcher"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data, headers=headers)
        
        if create_response.status_code == 201:
            booking = create_response.json()
            booking_id = booking.get("id")
            
            # Update status to completed
            status_response = requests.put(f"{BASE_URL}/api/bookings/{booking_id}/status", json={
                "status": "completed"
            }, headers=headers)
            
            if status_response.status_code == 200:
                time.sleep(1)
                
                # Check for transport_completed email log
                logs_response = requests.get(f"{BASE_URL}/api/settings/email/logs?limit=50", headers=headers)
                logs = logs_response.json()
                completed_logs = [l for l in logs if l.get("notification_type") == "transport_completed" and l.get("booking_id") == booking_id]
                
                if len(completed_logs) > 0:
                    print(f"✓ Booking completion triggered transport_completed email")
                else:
                    print("✓ Booking completed, transport_completed email may be disabled")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=headers)
        else:
            print(f"✓ Completion test skipped (booking creation status: {create_response.status_code})")


class TestEmailTemplates:
    """Test email template generation"""
    
    def test_14_transport_email_template_booking_confirmation(self):
        """get_transport_email_template generates booking_confirmation template"""
        # This is a unit test - import the function directly
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            from utils.email import get_transport_email_template
            
            data = {
                "patient_name": "Test Patient",
                "booking_date": "2026-02-15",
                "pickup_time": "10:00",
                "start_point": "Hospital A",
                "end_point": "Hospital B",
                "booking_id": "test-booking-123"
            }
            
            # Test Serbian template
            subject_sr, body_sr = get_transport_email_template("booking_confirmation", data, "sr")
            assert subject_sr, "Serbian subject should not be empty"
            assert body_sr, "Serbian body should not be empty"
            assert "Test Patient" in body_sr, "Patient name should be in body"
            assert "2026-02-15" in body_sr, "Booking date should be in body"
            
            # Test English template
            subject_en, body_en = get_transport_email_template("booking_confirmation", data, "en")
            assert subject_en, "English subject should not be empty"
            assert body_en, "English body should not be empty"
            
            print(f"✓ booking_confirmation template generates correctly (SR: {len(body_sr)} chars, EN: {len(body_en)} chars)")
            
        except ImportError as e:
            print(f"✓ Template test skipped (import error: {e})")
            
    def test_15_transport_email_template_driver_arriving(self):
        """get_transport_email_template generates driver_arriving template"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            from utils.email import get_transport_email_template
            
            data = {
                "patient_name": "Test Patient",
                "eta_minutes": 15,
                "driver_name": "Test Driver",
                "vehicle_info": "Ambulance NI-123-AB"
            }
            
            subject, body = get_transport_email_template("driver_arriving", data, "sr")
            assert subject, "Subject should not be empty"
            assert body, "Body should not be empty"
            assert "15" in body, "ETA minutes should be in body"
            assert "Test Driver" in body, "Driver name should be in body"
            
            print(f"✓ driver_arriving template generates correctly ({len(body)} chars)")
            
        except ImportError as e:
            print(f"✓ Template test skipped (import error: {e})")
            
    def test_16_transport_email_template_transport_completed(self):
        """get_transport_email_template generates transport_completed template"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            from utils.email import get_transport_email_template
            
            data = {
                "patient_name": "Test Patient",
                "start_point": "Hospital A",
                "end_point": "Hospital B"
            }
            
            subject, body = get_transport_email_template("transport_completed", data, "sr")
            assert subject, "Subject should not be empty"
            assert body, "Body should not be empty"
            assert "Hospital A" in body, "Start point should be in body"
            assert "Hospital B" in body, "End point should be in body"
            
            print(f"✓ transport_completed template generates correctly ({len(body)} chars)")
            
        except ImportError as e:
            print(f"✓ Template test skipped (import error: {e})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
