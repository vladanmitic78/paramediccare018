"""
Password Reset Feature Tests for Paramedic Care 018
Tests: POST /api/auth/forgot-password, GET /api/auth/verify-reset-token, POST /api/auth/reset-password
"""
import pytest
import requests
import os
import jwt
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
JWT_SECRET = "paramedic-care-018-secret-key-2024"
JWT_ALGORITHM = "HS256"

# Test credentials
SUPER_ADMIN_EMAIL = "admin@paramedic-care018.rs"
SUPER_ADMIN_PASSWORD = "Admin123!"
SUPER_ADMIN_USER_ID = "c508cbaf-e827-49b2-b66e-812480392caf"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def generate_valid_reset_token(user_id: str) -> str:
    """Generate a valid password reset token for testing"""
    payload = {
        "user_id": user_id,
        "type": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def generate_expired_reset_token(user_id: str) -> str:
    """Generate an expired password reset token for testing"""
    payload = {
        "user_id": user_id,
        "type": "password_reset",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1)  # Expired 1 hour ago
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def generate_invalid_type_token(user_id: str) -> str:
    """Generate a token with wrong type for testing"""
    payload = {
        "user_id": user_id,
        "type": "email_verification",  # Wrong type
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


class TestForgotPasswordEndpoint:
    """Tests for POST /api/auth/forgot-password"""
    
    def test_forgot_password_existing_email(self, api_client):
        """Test forgot password with existing email - should return success message"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": SUPER_ADMIN_EMAIL,
            "language": "en"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should always return success to prevent email enumeration
        assert "If an account exists" in data["message"]
        print(f"✓ Forgot password with existing email returns 200: {data['message']}")
    
    def test_forgot_password_nonexistent_email(self, api_client):
        """Test forgot password with non-existent email - should still return success (security)"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent_test_user_12345@example.com",
            "language": "en"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should return same message to prevent email enumeration
        assert "If an account exists" in data["message"]
        print(f"✓ Forgot password with non-existent email returns 200 (security): {data['message']}")
    
    def test_forgot_password_serbian_language(self, api_client):
        """Test forgot password with Serbian language preference"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": SUPER_ADMIN_EMAIL,
            "language": "sr"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Forgot password with Serbian language returns 200")
    
    def test_forgot_password_invalid_email_format(self, api_client):
        """Test forgot password with invalid email format"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "not-an-email",
            "language": "en"
        })
        
        # Should return 422 for validation error
        assert response.status_code == 422
        print(f"✓ Forgot password with invalid email format returns 422")
    
    def test_forgot_password_empty_email(self, api_client):
        """Test forgot password with empty email"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "",
            "language": "en"
        })
        
        # Should return 422 for validation error
        assert response.status_code == 422
        print(f"✓ Forgot password with empty email returns 422")


class TestVerifyResetTokenEndpoint:
    """Tests for GET /api/auth/verify-reset-token"""
    
    def test_verify_valid_token(self, api_client):
        """Test verify reset token with valid token"""
        valid_token = generate_valid_reset_token(SUPER_ADMIN_USER_ID)
        
        response = api_client.get(f"{BASE_URL}/api/auth/verify-reset-token?token={valid_token}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert "email" in data
        assert data["email"] == SUPER_ADMIN_EMAIL
        print(f"✓ Verify valid token returns 200 with valid=True and email={data['email']}")
    
    def test_verify_expired_token(self, api_client):
        """Test verify reset token with expired token"""
        expired_token = generate_expired_reset_token(SUPER_ADMIN_USER_ID)
        
        response = api_client.get(f"{BASE_URL}/api/auth/verify-reset-token?token={expired_token}")
        
        assert response.status_code == 400
        data = response.json()
        assert "expired" in data.get("detail", "").lower()
        print(f"✓ Verify expired token returns 400: {data.get('detail')}")
    
    def test_verify_invalid_type_token(self, api_client):
        """Test verify reset token with wrong token type"""
        wrong_type_token = generate_invalid_type_token(SUPER_ADMIN_USER_ID)
        
        response = api_client.get(f"{BASE_URL}/api/auth/verify-reset-token?token={wrong_type_token}")
        
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data.get("detail", "").lower() or "type" in data.get("detail", "").lower()
        print(f"✓ Verify wrong type token returns 400: {data.get('detail')}")
    
    def test_verify_malformed_token(self, api_client):
        """Test verify reset token with malformed token"""
        response = api_client.get(f"{BASE_URL}/api/auth/verify-reset-token?token=invalid_token_string")
        
        assert response.status_code == 400
        print(f"✓ Verify malformed token returns 400")
    
    def test_verify_missing_token(self, api_client):
        """Test verify reset token without token parameter"""
        response = api_client.get(f"{BASE_URL}/api/auth/verify-reset-token")
        
        # Should return 422 for missing required parameter
        assert response.status_code == 422
        print(f"✓ Verify missing token returns 422")
    
    def test_verify_token_nonexistent_user(self, api_client):
        """Test verify reset token for non-existent user"""
        fake_user_id = "00000000-0000-0000-0000-000000000000"
        token = generate_valid_reset_token(fake_user_id)
        
        response = api_client.get(f"{BASE_URL}/api/auth/verify-reset-token?token={token}")
        
        assert response.status_code == 404
        print(f"✓ Verify token for non-existent user returns 404")


class TestResetPasswordEndpoint:
    """Tests for POST /api/auth/reset-password"""
    
    def test_reset_password_valid_token(self, api_client):
        """Test reset password with valid token - Note: This will actually change the password"""
        # We'll test with the admin account but reset it back
        valid_token = generate_valid_reset_token(SUPER_ADMIN_USER_ID)
        
        # Reset to a new password
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": valid_token,
            "new_password": "NewAdmin123!"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "success" in data["message"].lower()
        print(f"✓ Reset password with valid token returns 200: {data['message']}")
        
        # Verify login works with new password
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": "NewAdmin123!"
        })
        assert login_response.status_code == 200
        print(f"✓ Login with new password successful")
        
        # Reset back to original password
        new_token = generate_valid_reset_token(SUPER_ADMIN_USER_ID)
        restore_response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": new_token,
            "new_password": SUPER_ADMIN_PASSWORD
        })
        assert restore_response.status_code == 200
        print(f"✓ Password restored to original")
        
        # Verify original password works
        final_login = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert final_login.status_code == 200
        print(f"✓ Login with original password successful after restore")
    
    def test_reset_password_expired_token(self, api_client):
        """Test reset password with expired token"""
        expired_token = generate_expired_reset_token(SUPER_ADMIN_USER_ID)
        
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": expired_token,
            "new_password": "NewPassword123!"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "expired" in data.get("detail", "").lower()
        print(f"✓ Reset password with expired token returns 400: {data.get('detail')}")
    
    def test_reset_password_invalid_token(self, api_client):
        """Test reset password with invalid token"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_string",
            "new_password": "NewPassword123!"
        })
        
        assert response.status_code == 400
        print(f"✓ Reset password with invalid token returns 400")
    
    def test_reset_password_short_password(self, api_client):
        """Test reset password with password too short"""
        valid_token = generate_valid_reset_token(SUPER_ADMIN_USER_ID)
        
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": valid_token,
            "new_password": "12345"  # Less than 6 characters
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "6" in data.get("detail", "") or "character" in data.get("detail", "").lower()
        print(f"✓ Reset password with short password returns 400: {data.get('detail')}")
    
    def test_reset_password_nonexistent_user(self, api_client):
        """Test reset password for non-existent user"""
        fake_user_id = "00000000-0000-0000-0000-000000000000"
        token = generate_valid_reset_token(fake_user_id)
        
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "NewPassword123!"
        })
        
        assert response.status_code == 404
        print(f"✓ Reset password for non-existent user returns 404")


class TestLoginAfterPasswordReset:
    """Tests to verify login still works correctly after password operations"""
    
    def test_login_with_original_credentials(self, api_client):
        """Verify login works with original admin credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == SUPER_ADMIN_EMAIL
        print(f"✓ Login with original credentials successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
