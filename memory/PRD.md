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
- **Patient Diagnoses Management (NEW Jan 28, 2026):** ICD-10 diagnoses with typeahead search, bilingual support (EN/SR), displayed alongside medications in two-column layout

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
- **patient_diagnoses**: NEW (Jan 28, 2026) - ICD-10 diagnoses for patients

## Patient Diagnoses System (NEW Jan 28, 2026)

**New Collection: `patient_diagnoses`**
```javascript
{
  "id": "uuid",
  "patient_id": "patient-uuid",
  "code": "ICD-10 code (e.g., I10)",
  "name_en": "English name",
  "name_sr": "Serbian name",
  "category_en": "Category in English",
  "category_sr": "Category in Serbian",
  "notes": "Optional notes",
  "added_by": "user-uuid",
  "added_by_name": "User full name",
  "added_at": "ISO timestamp"
}
```

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/patients/{patient_id}/diagnoses` | GET | Get all diagnoses for a patient |
| `/api/patients/{patient_id}/diagnoses` | POST | Add a diagnosis (prevents duplicates) |
| `/api/patients/{patient_id}/diagnoses/{diagnosis_id}` | DELETE | Remove a diagnosis |

**Frontend Components:**
- `DiagnosesManager.jsx` - Typeahead search for ICD-10 codes with bilingual support
- Displays in two-column layout alongside `MedicationManager` in `MedicalDashboard.jsx`
- Search works by code, name, or keywords in both English and Serbian
- Color-coded category badges for visual grouping

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

### Phase 2: Vehicle Card UI (COMPLETED Jan 27, 2026)

**Mini Timeline Strip on Vehicle Cards:**
- Added `VehicleTimeline` component to FleetDispatch.jsx
- Shows 6:00 AM to 10:00 PM timeline with hour markers
- Schedule blocks displayed in different colors:
  - Sky blue = Scheduled
  - Amber = In Progress
  - Gray = Completed
- Red vertical line shows current time
- "Danas (slobodno)" = Free all day indicator
- Hover tooltip shows patient name and time range
- Clicking on blocks shows booking details

### Phase 3: Booking Flow Integration (COMPLETED Jan 27, 2026)

**Time-Slot Assignment Modal:**
- When dragging a vehicle to a booking, a modal appears to configure the time slot
- Shows vehicle info (name, driver) and booking info (patient, date)
- Time pickers for start and end time (defaults: booking time + 2 hours)
- "Proveri dostupnost" (Check Availability) button queries `/api/fleet/schedules/conflicts`
- Availability status display:
  - Green checkmark: "Termin je slobodan!" (Time slot available)
  - Amber warning: Shows conflicting schedules with patient names and times
- Mini timeline preview of the vehicle's existing schedule
- Two-step confirmation: Check availability → Confirm assignment
- Creates schedule entry in `vehicle_schedules` collection
- Option to force assignment despite conflicts ("Zakaži svejedno")

**Staff Availability Integration (COMPLETED Jan 27, 2026):**
- Schedule conflict check now also queries `staff_availability` collection
- Detects when driver or team members are marked as unavailable, on_leave, or sick
- Displays "Osoblje nije dostupno:" (Staff unavailable) section in red
- Shows staff name, unavailable time range, status (On Leave/Sick/Unavailable), and notes
- Staff unavailability is a stronger warning (red) than schedule conflicts (amber)
- Works for both driver and all team members assigned to the vehicle

### Remaining Phases:
- **Phase 4:** Admin Gantt View (Master timeline grid)

## Session & Auth Improvements (Jan 27, 2026)
- Extended JWT token expiration from 24 hours to 7 days
- Improved AuthContext to not logout on network/server errors
- Only logout on explicit 401 (token invalid/expired)
- Added `refreshUser()` method for profile updates

## Calendar View (Jan 27, 2026)

**Booking Calendar Component:**
- New `BookingCalendar.jsx` component with three views:
  - **Month view**: Grid calendar showing booking counts per day
  - **Week view**: Time-slot grid for the week (6:00-21:00)
  - **Day view**: Detailed timeline for a single day
- Features:
  - Color-coded booking status (pending=amber, confirmed=sky, completed=emerald, etc.)
  - Search by patient name or phone
  - Status filter dropdown
  - Click on booking to view details modal
  - "Assign Vehicle" button from booking detail modal
  - Navigation: Previous/Next buttons and "Today" quick link
  - Status legend at bottom

**Added to Dashboard:**
- Calendar tab under "Operacije" section in sidebar
- Route: `/dashboard?tab=calendar`

## Pending Tasks

### P0 - Critical (Completed)
- [x] PWA Install Prompt - Allow users to install the app on mobile devices
- [x] Timeline-Based Vehicle Scheduling - Phase 1: Data Model & Backend APIs
- [x] Timeline-Based Vehicle Scheduling - Phase 2: Vehicle Card UI
- [x] Timeline-Based Vehicle Scheduling - Phase 3: Booking Flow Integration
- [x] Fix logout on refresh issue - Extended session duration
- [x] Patient Diagnoses Management - ICD-10 diagnoses with typeahead search (Jan 28, 2026)
- [x] Email Notifications System - Booking event notifications with Super Admin settings UI (Jan 28, 2026)
- [x] Timeline-Based Vehicle Scheduling - Phase 4: Admin Gantt View with Drag-and-Drop (Feb 3, 2026)
- [x] Backend refactoring - Extracted notifications & medical routers (Feb 3, 2026)
- [x] Doctor Decision Panel - Live instructions from Medical Dashboard (Feb 3, 2026)
- [x] Backend refactoring - Extracted bookings router (Feb 3, 2026)
- [x] PWA refactoring - Extracted PWA hooks to separate file (Feb 3, 2026)

### P1 - High Priority
- [ ] Continue backend refactoring (extract driver, patient, admin routes from server.py)
- [ ] Continue PWA refactoring (extract VitalsModal, booking card components)
- [ ] Add more SMS triggers ("Driver on way", "Transport completed")

### P2 - Medium Priority
- [ ] Persist sidebar state with localStorage
- [ ] Migrate image storage to persistent cloud (S3)

## Gantt Schedule View (Feb 3, 2026)

**Component: `GanttScheduleView.jsx`**
- Weekly timeline view for vehicle scheduling with **drag-and-drop rescheduling**
- Features:
  - Week navigation (previous/next/today)
  - Vehicles displayed as rows
  - Unassigned bookings row at top
  - Time scale: 6:00 AM - 10:00 PM
  - Current time indicator (red line)
  - Status filter dropdown
  - Zoom controls (50%-200%)
  - Color-coded booking blocks by status
  - Click booking for detail popup
  - Status legend at bottom
  - **Drag-and-drop**: Move bookings between vehicles/days
  - **Confirmation modal**: Verify before rescheduling
  - **Visual feedback**: Drop zones highlight when dragging

**Drag-and-Drop Implementation:**
- Uses @dnd-kit library (already installed)
- `DraggableBooking` component for draggable booking blocks
- `DroppableCell` component for vehicle/day drop zones
- Confirmation modal before API update
- Only pending/confirmed/assigned bookings can be dragged

**Location:** Dashboard → Dispečerski centar → Raspored (Gantt)

## Backend Refactoring (Feb 3, 2026)

**Extracted Routers:**
| Router | File | Lines | Endpoints |
|--------|------|-------|-----------|
| notifications | `routes/notifications.py` | 485 | SMS & Email settings, logs, test |
| medical | `routes/medical.py` | 880 | Vitals, diagnoses, decisions, patient medical |
| bookings | `routes/bookings.py` | 395 | Booking CRUD, SMS, rejection |
| fleet | `routes/fleet.py` | 935 | Vehicle management |
| schedule | `routes/schedule.py` | 848 | Timeline scheduling |
| auth | `routes/auth.py` | 263 | Authentication |

**Helper Functions Exported:**
- `send_sms_notification(phone, message, booking_id)` - Send SMS via configured provider
- `send_booking_email_notification(booking, type, extra_data)` - Send email for booking events

**server.py Status:** Reduced from 4,229 to 3,877 lines (352 lines extracted in this session)

## PWA Refactoring (Feb 3, 2026)

**Extracted Hooks to `/app/frontend/src/hooks/usePWAHooks.js`:**
- `usePushNotifications()` - Push notification permission and service worker
- `usePWAManifest()` - PWA manifest and theme color management  
- `useWakeLock(enabled)` - Keep screen on during transport
- `useStatePersistence(key, state, enabled)` - Persist state through phone calls
- `getPersistedState(key)` - Restore persisted state

**UnifiedPWA.jsx Status:** Reduced from 3,051 to 2,895 lines (156 lines extracted)

## Email Notification System (Jan 28, 2026)

**New Collection: `email_logs`**
```javascript
{
  "id": "uuid",
  "to_email": "patient@example.com",
  "subject": "Email subject",
  "notification_type": "booking_confirmation|driver_assigned|driver_arriving|transport_completed|pickup_reminder",
  "booking_id": "booking-uuid (optional)",
  "success": true,
  "error": "error message if failed",
  "is_test": false,
  "sent_by": "user-uuid (for test emails)",
  "sent_at": "ISO timestamp"
}
```

**System Settings: `system_settings.type=email`**
```javascript
{
  "type": "email",
  "smtp_host": "mailcluster.loopia.se",
  "smtp_port": 465,
  "sender_email": "info@paramedic-care018.rs",
  "sender_password": "encrypted",
  "sender_name": "Paramedic Care 018",
  "enabled": true,
  "notify_booking_created": true,
  "notify_driver_assigned": true,
  "notify_driver_arriving": true,
  "notify_transport_completed": true,
  "notify_pickup_reminder": true
}
```

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings/email` | GET | Get email settings (Super Admin only) |
| `/api/settings/email` | PUT | Update email settings and notification triggers |
| `/api/settings/email/test` | POST | Send test email to verify configuration |
| `/api/settings/email/logs` | GET | Get email send history |

**Frontend Components:**
- `EmailSettings.jsx` - Super Admin UI for email configuration
- Displays in Dashboard under "Podešavanja" > "Email Podešavanja"
- Features: SMTP configuration, notification triggers toggles, test email, email logs

**Email Triggers:**
- `booking_confirmation` - Sent when new booking is created
- `driver_assigned` - Sent when driver is assigned to booking
- `driver_arriving` - Sent when status changes to "in_transit"/"en_route"
- `transport_completed` - Sent when transport is marked as completed
- `pickup_reminder` - Sent before scheduled pickup (planned feature)

## Live Tracking Enhancements (Jan 27, 2026)

**Click-to-Focus on Driver Location:**
- Clicking on a driver card in the Live Tracking page (`AdminLiveMap.jsx`) now:
  - Zooms and pans the map to the driver's location
  - Opens the driver's popup with details (name, status, phone, speed, timestamp)
  - Highlights the selected driver card with a blue ring
  - Shows selected driver in header with dismiss button
- Added `FocusOnDriver` component using Leaflet's `flyTo` animation
- Cards show "📍 Klikni za lokaciju" hint when driver has GPS location
- Clicking header dismiss button or another driver clears selection

### P3 - Future
- [ ] Stripe integration for payments
- [ ] Advanced reporting and statistics

## Booking Calendar View (Feb 3, 2026)

**Component:** `BookingCalendarView.jsx`
- Monthly calendar grid showing all bookings
- Location: Dashboard → Dispečerski centar → Kalendar

**Features:**
| Feature | Description |
|---------|-------------|
| Monthly Grid | Shows 6-week grid with booking indicators |
| Day Indicators | Color-coded dots for bookings (by status) |
| Day Detail | Click day to see all bookings in dialog |
| List View | Toggle to see bookings as sortable list |
| Status Filter | Filter by booking status |
| Navigation | Previous/Next month, Today button |
| Stats Cards | Total, Pending, Confirmed, Completed, Cancelled counts |
| Legend | Status color legend at bottom |

## Driver Rejection Modal (Feb 3, 2026)

**Component:** `DriverRejectionModal.jsx`
- Modal for drivers to reject/decline booking assignments with reason

**Predefined Rejection Reasons:**
| Code | Label (SR) | Description |
|------|------------|-------------|
| vehicle_issue | Problem sa vozilom | Vehicle breakdown/unavailable |
| schedule_conflict | Konflikt u rasporedu | Already have another trip |
| location_issue | Problem sa lokacijom | Location inaccessible/too far |
| medical_reason | Zdravstveni razlog | Health-related issue |
| equipment_missing | Nedostaje oprema | Required equipment unavailable |
| other | Drugi razlog | Custom reason in notes |

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bookings/{id}/reject` | POST | Driver rejects booking with reason |
| `/api/bookings/{id}/rejections` | GET | Get rejection history for booking |

**MongoDB Collection: `booking_rejections`**
```javascript
{
  "id": "uuid",
  "booking_id": "booking-uuid",
  "rejected_by": "driver-uuid",
  "rejected_by_name": "Driver Name",
  "rejected_at": "ISO timestamp",
  "reason_code": "schedule_conflict",
  "reason_label": "Konflikt u rasporedu",
  "notes": "optional notes",
  "previous_driver": "previous-driver-uuid",
  "previous_driver_name": "Previous Driver Name"
}
```

**Behavior:**
- Removes driver assignment from booking
- Reverts booking status to "pending"
- Increments `rejection_count` on booking
- Stores full rejection record
- Sends email notification to transport team

## Doctor Decision Panel (Feb 3, 2026)

## Test Credentials
- **Admin:** admin@paramedic-care018.rs / Admin123!
- **Driver (User):** vladanmitic@gmail.com / Test123!
- **Driver (Test):** djoka.stroka@test.com / Test123!
- **Doctor (Test):** doctor@test.com / Test123!

## Known Limitations
- Image uploads are ephemeral (stored on local filesystem)
- Some desktop dashboard sections are placeholders (Patients, Statistics)
