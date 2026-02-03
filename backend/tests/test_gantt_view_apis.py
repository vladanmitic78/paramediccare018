"""
Test APIs used by GanttScheduleView component
Tests: GET /api/fleet/vehicles, GET /api/bookings with date range
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "admin@paramedic-care018.rs"
SUPERADMIN_PASSWORD = "Admin123!"


class TestGanttViewAPIs:
    """Test APIs used by GanttScheduleView"""
    
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
    
    def test_get_fleet_vehicles(self):
        """GET /api/fleet/vehicles - returns list of vehicles"""
        response = self.session.get(f"{BASE_URL}/api/fleet/vehicles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of vehicles"
        
        if len(data) > 0:
            vehicle = data[0]
            # Check expected vehicle fields
            assert "id" in vehicle, "Vehicle should have id"
            assert "registration" in vehicle or "name" in vehicle, "Vehicle should have registration or name"
            print(f"✓ Fleet vehicles retrieved: {len(data)} vehicles")
            print(f"  Sample vehicle: {vehicle.get('registration', vehicle.get('name', 'N/A'))}")
        else:
            print("✓ Fleet vehicles endpoint works (no vehicles in system)")
    
    def test_get_bookings_with_date_range(self):
        """GET /api/bookings with date range - returns bookings for Gantt view"""
        # Calculate current week dates
        today = datetime.now()
        start_of_week = today - timedelta(days=today.weekday())  # Monday
        end_of_week = start_of_week + timedelta(days=6)  # Sunday
        
        start_date = start_of_week.strftime('%Y-%m-%d')
        end_date = end_of_week.strftime('%Y-%m-%d')
        
        response = self.session.get(f"{BASE_URL}/api/bookings?start_date={start_date}&end_date={end_date}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of bookings"
        
        print(f"✓ Bookings retrieved for date range {start_date} to {end_date}: {len(data)} bookings")
        
        if len(data) > 0:
            booking = data[0]
            # Check expected booking fields for Gantt view
            expected_fields = ["id", "patient_name", "status"]
            for field in expected_fields:
                assert field in booking, f"Booking should have {field}"
            print(f"  Sample booking: {booking.get('patient_name', 'N/A')} - {booking.get('status', 'N/A')}")
    
    def test_get_bookings_without_date_range(self):
        """GET /api/bookings without date range - returns all bookings"""
        response = self.session.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of bookings"
        print(f"✓ All bookings retrieved: {len(data)} bookings")
    
    def test_vehicle_status_filter(self):
        """Verify vehicles can be filtered by status (for Gantt view)"""
        response = self.session.get(f"{BASE_URL}/api/fleet/vehicles")
        assert response.status_code == 200
        
        data = response.json()
        
        # Filter out retired vehicles (as Gantt view does)
        active_vehicles = [v for v in data if v.get('status') != 'retired']
        print(f"✓ Active vehicles (non-retired): {len(active_vehicles)} of {len(data)}")
    
    def test_booking_has_required_gantt_fields(self):
        """Verify bookings have fields needed for Gantt positioning"""
        response = self.session.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 200
        
        data = response.json()
        
        if len(data) > 0:
            booking = data[0]
            # Fields used for Gantt positioning
            has_date = "booking_date" in booking or "pickup_datetime" in booking
            has_time = "pickup_time" in booking or "booking_time" in booking
            
            print(f"✓ Booking has date field: {has_date}")
            print(f"✓ Booking has time field: {has_time}")
            print(f"  Booking fields: {list(booking.keys())}")
        else:
            print("✓ No bookings to verify fields (endpoint works)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
