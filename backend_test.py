import requests
import sys
import json
from datetime import datetime, timedelta

class ParamedicCareAPITester:
    def __init__(self, base_url="https://paramedic-care-018-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Use admin token if specified and available
        if use_admin and self.admin_token:
            headers['Authorization'] = f'Bearer {self.admin_token}'
        elif self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'error': str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@paramedic-care018.rs", "password": "Admin123!"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "full_name": "Test User",
            "phone": "+381 18 123 456",
            "role": "regular"
        }
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   User token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_services(self):
        """Test getting services"""
        return self.run_test("Get Services", "GET", "services", 200)

    def test_get_medical_services(self):
        """Test getting medical services"""
        return self.run_test("Get Medical Services", "GET", "services/medical", 200)

    def test_get_transport_services(self):
        """Test getting transport services"""
        return self.run_test("Get Transport Services", "GET", "services/transport", 200)

    def test_create_booking(self):
        """Test creating a booking"""
        booking_data = {
            "start_point": "Niš, Srbija",
            "start_lat": 43.3209,
            "start_lng": 21.8958,
            "end_point": "Beograd, Srbija",
            "end_lat": 44.7866,
            "end_lng": 20.4489,
            "booking_date": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
            "contact_phone": "+381 18 123 456",
            "contact_email": "test@example.com",
            "patient_name": "Test Patient",
            "notes": "Test booking for API testing"
        }
        
        # Try without auth first, then with auth if it fails
        success, response = self.run_test(
            "Create Booking (No Auth)",
            "POST",
            "bookings",
            200,
            data=booking_data
        )
        
        if not success:
            # Try with user auth
            success, response = self.run_test(
                "Create Booking (With Auth)",
                "POST",
                "bookings",
                200,
                data=booking_data
            )
        
        if success and 'id' in response:
            self.booking_id = response['id']
            return True
        return False

    def test_get_bookings(self):
        """Test getting bookings (requires auth)"""
        return self.run_test("Get Bookings", "GET", "bookings", 200)

    def test_contact_form(self):
        """Test contact form submission"""
        contact_data = {
            "name": "Test Contact",
            "email": "contact@test.com",
            "phone": "+381 18 123 456",
            "message": "This is a test contact message"
        }
        return self.run_test("Contact Form", "POST", "contact", 200, data=contact_data)

    def test_admin_dashboard_stats(self):
        """Test admin dashboard stats"""
        return self.run_test("Dashboard Stats", "GET", "stats/dashboard", 200, use_admin=True)

    def test_get_users(self):
        """Test getting users (admin only)"""
        return self.run_test("Get Users", "GET", "users", 200, use_admin=True)

    def test_get_contacts(self):
        """Test getting contacts (admin only)"""
        return self.run_test("Get Contacts", "GET", "contacts", 200, use_admin=True)

    def test_get_staff(self):
        """Test getting staff (admin only)"""
        return self.run_test("Get Staff", "GET", "users/staff", 200, use_admin=True)

    def test_seed_data(self):
        """Test seed data endpoint"""
        return self.run_test("Seed Data", "POST", "seed", 200)

def main():
    print("🚀 Starting Paramedic Care 018 API Tests")
    print("=" * 50)
    
    tester = ParamedicCareAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Seed Data", tester.test_seed_data),
        ("Admin Login", tester.test_admin_login),
        ("User Registration", tester.test_user_registration),
        ("Get Services", tester.test_get_services),
        ("Get Medical Services", tester.test_get_medical_services),
        ("Get Transport Services", tester.test_get_transport_services),
        ("Create Booking", tester.test_create_booking),
        ("Get Bookings", tester.test_get_bookings),
        ("Contact Form", tester.test_contact_form),
        ("Dashboard Stats", tester.test_admin_dashboard_stats),
        ("Get Users", tester.test_get_users),
        ("Get Contacts", tester.test_get_contacts),
        ("Get Staff", tester.test_get_staff),
    ]
    
    # Run all tests
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            tester.failed_tests.append({
                'test': test_name,
                'error': str(e)
            })
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            error_msg = failure.get('error', f"Expected {failure.get('expected')}, got {failure.get('actual')}")
            print(f"   - {failure['test']}: {error_msg}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())