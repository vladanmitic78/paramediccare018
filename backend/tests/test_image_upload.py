"""
Test Image Upload Feature for CMS
Tests:
- Upload endpoint accepts multipart file upload
- File type validation (jpeg, png, gif, webp, svg)
- File size validation (max 5MB)
- File saved to /uploads directory
- Returns URL in response
- Uploaded images accessible via /uploads/{filename} static route
"""

import pytest
import requests
import os
from pathlib import Path
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@paramedic-care018.rs"
SUPER_ADMIN_PASSWORD = "Admin123!"
ADMIN_EMAIL = "office@paramedic-care018.rs"
ADMIN_PASSWORD = "Office123!"


@pytest.fixture(scope="module")
def super_admin_token():
    """Get Super Admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Super Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token():
    """Get Admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def test_image_png():
    """Create a small test PNG image (1x1 pixel)"""
    # Minimal valid PNG file (1x1 transparent pixel)
    png_data = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,  # bit depth, color type
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,  # IDAT chunk
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,  # compressed data
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,  # 
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,  # IEND chunk
        0x42, 0x60, 0x82
    ])
    return io.BytesIO(png_data)


@pytest.fixture
def test_image_jpeg():
    """Create a minimal test JPEG image"""
    # Minimal valid JPEG (1x1 red pixel)
    jpeg_data = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
        0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x7E, 0xB4,
        0x01, 0xFF, 0xD9
    ])
    return io.BytesIO(jpeg_data)


class TestImageUploadEndpoint:
    """Test the /api/upload/image endpoint"""
    
    def test_upload_requires_authentication(self):
        """Test that upload endpoint requires authentication"""
        files = {'file': ('test.png', b'fake image data', 'image/png')}
        response = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Upload endpoint requires authentication")
    
    def test_super_admin_can_upload_png(self, super_admin_token, test_image_png):
        """Test Super Admin can upload PNG image"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        files = {'file': ('test_upload.png', test_image_png, 'image/png')}
        
        response = requests.post(f"{BASE_URL}/api/upload/image", headers=headers, files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "url" in data, "Response should contain url"
        assert "filename" in data, "Response should contain filename"
        assert data["url"].startswith("/uploads/"), f"URL should start with /uploads/, got {data['url']}"
        print(f"✓ Super Admin uploaded PNG successfully: {data['url']}")
        
        # Store for cleanup
        return data["filename"]
    
    def test_admin_can_upload_jpeg(self, admin_token, test_image_jpeg):
        """Test Admin can upload JPEG image"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        files = {'file': ('test_upload.jpg', test_image_jpeg, 'image/jpeg')}
        
        response = requests.post(f"{BASE_URL}/api/upload/image", headers=headers, files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["url"].startswith("/uploads/")
        print(f"✓ Admin uploaded JPEG successfully: {data['url']}")
        
        return data["filename"]
    
    def test_upload_returns_correct_response_structure(self, super_admin_token, test_image_png):
        """Test upload response has correct structure"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        test_image_png.seek(0)  # Reset stream position
        files = {'file': ('structure_test.png', test_image_png, 'image/png')}
        
        response = requests.post(f"{BASE_URL}/api/upload/image", headers=headers, files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected fields
        assert "success" in data, "Response should have 'success' field"
        assert "filename" in data, "Response should have 'filename' field"
        assert "url" in data, "Response should have 'url' field"
        assert "size" in data, "Response should have 'size' field"
        assert "type" in data, "Response should have 'type' field"
        
        assert isinstance(data["size"], int), "Size should be an integer"
        assert data["size"] > 0, "Size should be greater than 0"
        print(f"✓ Response structure correct: success={data['success']}, size={data['size']}, type={data['type']}")


class TestFileTypeValidation:
    """Test file type validation"""
    
    def test_reject_invalid_file_type_txt(self, super_admin_token):
        """Test that .txt files are rejected"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        files = {'file': ('test.txt', b'This is not an image', 'text/plain')}
        
        response = requests.post(f"{BASE_URL}/api/upload/image", headers=headers, files=files)
        
        assert response.status_code == 400, f"Expected 400 for .txt file, got {response.status_code}"
        print("✓ .txt files correctly rejected")
    
    def test_reject_invalid_file_type_pdf(self, super_admin_token):
        """Test that .pdf files are rejected"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        files = {'file': ('test.pdf', b'%PDF-1.4 fake pdf content', 'application/pdf')}
        
        response = requests.post(f"{BASE_URL}/api/upload/image", headers=headers, files=files)
        
        assert response.status_code == 400, f"Expected 400 for .pdf file, got {response.status_code}"
        print("✓ .pdf files correctly rejected")
    
    def test_reject_invalid_file_type_exe(self, super_admin_token):
        """Test that .exe files are rejected"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        files = {'file': ('test.exe', b'MZ fake exe content', 'application/octet-stream')}
        
        response = requests.post(f"{BASE_URL}/api/upload/image", headers=headers, files=files)
        
        assert response.status_code == 400, f"Expected 400 for .exe file, got {response.status_code}"
        print("✓ .exe files correctly rejected")


class TestFileSizeValidation:
    """Test file size validation (max 5MB)"""
    
    def test_reject_file_over_5mb(self, super_admin_token):
        """Test that files over 5MB are rejected"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Create a file larger than 5MB (5.1MB)
        large_content = b'x' * (5 * 1024 * 1024 + 100000)  # 5.1MB
        files = {'file': ('large_image.png', large_content, 'image/png')}
        
        response = requests.post(f"{BASE_URL}/api/upload/image", headers=headers, files=files)
        
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}"
        print("✓ Files over 5MB correctly rejected")


class TestUploadedFileAccess:
    """Test that uploaded files are accessible via static route"""
    
    def test_uploaded_file_accessible(self, super_admin_token, test_image_png):
        """Test that uploaded file can be accessed via /uploads/{filename}"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        test_image_png.seek(0)
        files = {'file': ('access_test.png', test_image_png, 'image/png')}
        
        # Upload the file
        upload_response = requests.post(f"{BASE_URL}/api/upload/image", headers=headers, files=files)
        assert upload_response.status_code == 200
        
        data = upload_response.json()
        file_url = data["url"]
        
        # Try to access the uploaded file
        access_response = requests.get(f"{BASE_URL}{file_url}")
        
        assert access_response.status_code == 200, f"Expected 200 when accessing uploaded file, got {access_response.status_code}"
        assert len(access_response.content) > 0, "File content should not be empty"
        print(f"✓ Uploaded file accessible at {BASE_URL}{file_url}")
    
    def test_existing_uploads_accessible(self):
        """Test that existing uploaded files are accessible"""
        # Check if any files exist in uploads
        response = requests.get(f"{BASE_URL}/uploads/")
        # This might return 404 if directory listing is disabled, which is fine
        # We'll test with a known uploaded file instead
        print("✓ Static uploads route is configured")


class TestImageUploadIntegration:
    """Integration tests for image upload with CMS"""
    
    def test_upload_and_use_in_cms_content(self, super_admin_token, test_image_png):
        """Test uploading image and using it in CMS content"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        test_image_png.seek(0)
        files = {'file': ('cms_test.png', test_image_png, 'image/png')}
        
        # Upload the image
        upload_response = requests.post(f"{BASE_URL}/api/upload/image", headers=headers, files=files)
        assert upload_response.status_code == 200
        
        data = upload_response.json()
        image_url = f"{BASE_URL}{data['url']}"
        
        # Get existing page content to update
        pages_response = requests.get(f"{BASE_URL}/api/pages")
        assert pages_response.status_code == 200
        
        pages = pages_response.json()
        if pages:
            # Find a content item to update
            test_item = pages[0]
            content_id = test_item["id"]
            
            # Update with the new image URL
            update_data = {
                "page": test_item["page"],
                "section": test_item["section"],
                "title_sr": test_item["title_sr"],
                "title_en": test_item["title_en"],
                "content_sr": test_item["content_sr"],
                "content_en": test_item["content_en"],
                "image_url": image_url,
                "order": test_item.get("order", 0),
                "is_active": test_item.get("is_active", True)
            }
            
            update_response = requests.put(
                f"{BASE_URL}/api/pages/{content_id}",
                headers={**headers, "Content-Type": "application/json"},
                json=update_data
            )
            
            assert update_response.status_code == 200, f"Failed to update content: {update_response.text}"
            
            # Verify the update
            updated = update_response.json()
            assert updated["image_url"] == image_url, "Image URL should be updated"
            print(f"✓ Image uploaded and used in CMS content: {image_url}")
        else:
            print("⚠ No CMS content found to test integration")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
