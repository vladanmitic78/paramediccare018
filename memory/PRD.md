# Paramedic Care 018 - Product Requirements Document

## Overview
A comprehensive medical transport system including a public website, patient portal, real-time mobile applications (PWA) for admins, drivers, and medical staff, invoice management, location tracking, live map, staff availability management, EMR-style medical dashboard, and vehicle-centric team assignment module.

## Core Features Implemented

### Public Website & Booking
- Landing page with service information
- Online booking form with European address autocomplete
- Multi-language support (Serbian/English)

### Admin Dashboard
- Dispatch console with drag-drop vehicle-to-booking assignment
- Vehicle fleet management
- Staff/team management
- Booking management (pending/active/completed)
- Invoice generation

### PWA (Progressive Web App)
- Unified role-aware mobile app at `/app` route
- Driver view: task acceptance, navigation, status updates
- Admin view: booking overview, driver assignment
- Medical view: vitals recording, patient info
- Push notifications (iOS 16.4+ and Android)
- Wake lock during transport
- In-app phone and video calls (Jitsi)

### Medical Dashboard
- Real-time transport monitoring
- Transport timeline with event log
- Vitals recording

### Backend Architecture
- FastAPI backend with modular route structure
- MongoDB database
- WebSocket for real-time updates
- Partially refactored into modules (auth.py, fleet.py)

## Recent Bug Fixes (January 27, 2026)

### PWA Install Prompt - FIXED (Latest)
**Problem:** Users on mobile devices were not getting prompted to install the PWA.

**Root Cause:** The `beforeinstallprompt` event was not being handled, and there was no UI to trigger the installation.

**Fix Applied:**
1. Added `usePWAInstall` custom hook to capture the browser's install prompt event
2. Added PWA install banner (sky-blue) that appears when the app is installable
3. Added download icon in header (with pulse animation) for quick install access
4. Added "Install App" section in the notification settings modal
5. Added "App Installed" success message when installation completes
6. iOS users still see manual installation instructions (Safari doesn't support `beforeinstallprompt`)

**Test:** On Android Chrome or Desktop Chrome/Edge, navigate to `/app` and look for:
- Sky-blue install banner below the notification banner
- Download icon (pulsing) in the header
- "Install App" button in the notification settings modal

### Driver Availability Issue - FIXED
**Problem:** Driver "Marija Vujic" (and others) appeared as "not available" when trying to assign via drag-drop in Vehicles & Bookings.

**Root Cause:** The `driver_status` collection had stale entries with `status: 'assigned'` pointing to cancelled bookings. The booking cancellation endpoints didn't reset driver status.

**Fix Applied:**
1. Fixed data: Reset driver status for drivers assigned to cancelled/inactive bookings
2. Fixed code: Added driver status reset logic to:
   - `/api/patient/bookings/{booking_id}/cancel`
   - `/api/admin/patient-bookings/{booking_id}/status`
   - `/api/bookings/{booking_id}` (PUT)

### PWA Loading Loop - FIXED
**Problem:** Mobile app got stuck in infinite loading on some devices.

**Root Cause:** Race condition in auth state handling - component didn't wait for AuthContext loading state.

**Fix Applied:**
1. Added `authLoading` state from AuthContext
2. Replaced 2-second timeout redirect with proper auth state check
3. Improved loading state logic
4. Bumped service worker cache version (v4) to force refresh

## Backend Route Structure
```
/app/backend/
├── models/
│   ├── __init__.py
│   ├── booking.py
│   ├── driver.py
│   ├── medical.py
│   ├── schedule.py     # NEW - Timeline-based scheduling models
│   ├── user.py
│   └── vehicle.py
├── routes/
│   ├── __init__.py
│   ├── auth.py         # Authentication routes (~260 lines)
│   ├── fleet.py        # Fleet management routes (~950 lines)
│   └── schedule.py     # NEW - Vehicle scheduling routes (~600 lines)
└── server.py           # Main server (~4,600 lines) - needs further refactoring
```

## Database Schema
- **users**: User accounts with roles
- **bookings**: Public booking requests
- **patient_bookings**: Patient portal bookings
- **driver_status**: Driver availability and current assignment
- **vehicles**: Fleet vehicles
- **vehicle_teams**: Vehicle-to-staff assignments
- **vehicle_schedules**: NEW - Timeline-based vehicle scheduling
- **transport_events**: Timeline events for transports
- **invoices**: Patient invoices

## Timeline-Based Vehicle Scheduling System (NEW)

### Phase 1: Data Model & Backend APIs (COMPLETED Jan 27, 2026)

**New Collection: `vehicle_schedules`**
```javascript
{
  "id": "uuid",
  "vehicle_id": "vehicle-uuid",
  "booking_id": "booking-uuid",
  "booking_type": "patient_booking|booking",
  "driver_id": "driver-uuid (optional)",
  "start_time": "2026-01-27T09:00:00+00:00",
  "end_time": "2026-01-27T11:00:00+00:00",
  "status": "scheduled|in_progress|completed|cancelled",
  "created_at": "...",
  "created_by": "admin-uuid"
}
```

**New API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fleet/schedules` | GET | Get all schedules (with date/vehicle/driver/status filters) |
| `/api/fleet/schedules/vehicle/{id}` | GET | Get schedules for a specific vehicle |
| `/api/fleet/schedules/driver/{id}` | GET | Get schedules for a specific driver |
| `/api/fleet/schedules/availability` | GET | Check vehicle availability for a date/time range |
| `/api/fleet/schedules/conflicts` | GET | Check for scheduling conflicts |
| `/api/fleet/schedules` | POST | Create a new schedule (with conflict detection) |
| `/api/fleet/schedules/{id}` | GET | Get specific schedule |
| `/api/fleet/schedules/{id}` | PUT | Update schedule |
| `/api/fleet/schedules/{id}` | DELETE | Cancel schedule (soft delete) |
| `/api/fleet/schedules/{id}/start` | POST | Mark schedule as in_progress |
| `/api/fleet/schedules/{id}/complete` | POST | Mark schedule as completed |

**Key Features:**
- Time-slot conflict detection - prevents double-booking
- Availability queries - "Which vehicles are free from 10:00-12:00?"
- Force parameter to override conflicts for admin use
- Enriched responses with vehicle name, driver name, patient details
- Status transitions: scheduled → in_progress → completed

### Remaining Phases:
- **Phase 2:** Vehicle Card UI (Mini timeline strip on vehicle cards)
- **Phase 3:** Booking Flow Integration (Time picker, availability filter)
- **Phase 4:** Admin Gantt View (Master timeline grid)

## Pending Tasks

### P0 - Critical (Completed)
- [x] PWA Install Prompt - Allow users to install the app on mobile devices
- [x] Timeline-Based Vehicle Scheduling - Phase 1: Data Model & Backend APIs

### P1 - High Priority
- [ ] Timeline-Based Vehicle Scheduling - Phase 2: Vehicle Card UI
- [ ] Timeline-Based Vehicle Scheduling - Phase 3: Booking Flow Integration
- [ ] Continue backend refactoring (extract medical, driver, users, bookings routes from server.py)
- [ ] Doctor Decision Panel - live instructions from Medical Dashboard
- [ ] Refactor UnifiedPWA.jsx (~2,200 lines) into smaller components

### P2 - Medium Priority
- [ ] Timeline-Based Vehicle Scheduling - Phase 4: Admin Gantt View
- [ ] Calendar view for bookings (`OPERACIJE -> Kalendar`)
- [ ] Persist sidebar state with localStorage
- [ ] Driver rejection reason modal
- [ ] Migrate image storage to persistent cloud (S3)

### P3 - Future
- [ ] API integrations (Stripe, SMS, Email)
- [ ] Advanced reporting and statistics

## Test Credentials
- **Admin:** admin@paramedic-care018.rs / Admin123!
- **Driver (User):** vladanmitic@gmail.com / Test123!
- **Driver (Test):** djoka.stroka@test.com / Test123!
- **Doctor (Test):** doctor@test.com / Test123!

## Known Limitations
- Image uploads are ephemeral (stored on local filesystem)
- Some desktop dashboard sections are placeholders (Patients, Statistics)
