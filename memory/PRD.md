# Paramedic Care 018 - Product Requirements Document

## Original Problem Statement
Build a medical platform called "Paramedic Care 018" for urgent medical care and patient transportation services in Serbia.

## What's Been Implemented

### Phase 1 - January 2026 (Complete)

#### Core Features
1. **Multilingual Website (SR/EN)**
   - Serbian as default language
   - English translation
   - Language switcher with country flags

2. **Public Pages**
   - Home - Hero section, services overview, image gallery
   - Medical Care - Light blue theme, professional staff info
   - Transport - Red urgent theme, ambulance services
   - Booking - OpenStreetMap integration for location selection + **Document Upload** ✅
   - About Us - Company info, values, team
   - Contact - Contact form with email notification and auto-reply

3. **Role-Based User System**
   - Regular Users (patients)
   - Doctors/Nurses
   - Drivers
   - Admin
   - Super Admin

4. **Document Upload on Public Booking** (NEW - Jan 23, 2026) ✅
   - Drag & drop file upload interface
   - Supported formats: PDF, JPG, PNG, WEBP, DOC, DOCX
   - Max file size: 10MB per file
   - Progress bar during upload
   - File preview with remove option

4. **Content Management System (CMS)**
   - Admin can edit: Home, Medical Care, Transport, About Us pages
   - Super Admin can edit: All Admin pages + Header and Footer
   - Bilingual content editing (Serbian/English)
   - Section-based organization with ordering
   - Image Upload Feature (jpeg, png, gif, webp, svg, max 5MB)
   - Icon support for sections
   - Active/Inactive toggle for content visibility

5. **Admin Dashboard**
   - Two main views: Operations and Administration
   - Statistics overview
   - Booking management
   - User management
   - Contact messages

6. **Operations Dashboard**
   - Transportation Command view with fleet map
   - Medical Care view with patient monitoring
   - Note: Still uses MOCKED data

7. **Email System**
   - SMTP: mailcluster.loopia.se:465 (SSL)
   - Bilingual email templates (SR/EN)
   - Email routing to appropriate departments

8. **Real-Time Notifications System** (NEW - Jan 23, 2026) ✅
   - **Admin Popup Notifications**: When a patient creates a booking, admins get an instant popup with:
     - Patient details (name, age, mobility status)
     - Transport reason and locations
     - Date/time
     - Quick action buttons: Confirm / Reject
     - Audio notification beep
   - **Patient Real-Time Status Updates**: Patient dashboard polls every 10 seconds
     - Toast notifications when booking status changes
     - Status progress bar updates automatically
     - Refresh button for manual updates

9. **Invoice Management System** (NEW - Jan 23, 2026) ✅
   - Admin can create invoices for completed bookings
   - Invoice fields: Amount, VAT (20% auto-calculated), Service description
   - Invoice number format: PC018-YYYY-NNNNN
   - Due date auto-set to 30 days
   - Status management: Pending → Paid / Overdue / Cancelled
   - **PDF Generation** with bilingual format (SR/EN)
   - PDF includes: Company info, invoice details, service table, totals, payment instructions
   - Patients can download PDF from their portal

### Phase 2 - Patient Portal (NEW - Jan 23, 2026) ✅

#### Patient Portal Features (COMPLETE)
1. **Authentication**
   - Secure login/logout for patients
   - Auto-redirect to /patient portal after login

2. **Patient Dashboard** (`/patient`)
   - Welcome message with user name
   - "Book Medical Transport" primary action button
   - Active booking status with progress tracker
   - Quick action cards: My Bookings, Invoices, Notifications, Settings
   - Emergency contact banner with click-to-call

3. **New Booking Wizard** (`/patient/book`)
   - 4-step wizard form:
     - Step 1: Patient Information (name, age, phone, email)
     - Step 2: Transport Need (reason dropdown, mobility status)
     - Step 3: Transport Details (addresses, date, time)
     - Step 4: Confirmation summary with consent
   - Validation at each step
   - Email notification to transport team
   - In-app notification created

4. **My Bookings** (`/patient/bookings`)
   - List of all bookings with filter by status
   - Booking cards with status, date, addresses
   - Status: Requested → Confirmed → En Route → Picked Up → Completed

5. **Booking Detail** (`/patient/bookings/:id`)
   - Visual status progress tracker
   - Location details (pickup/destination)
   - Patient information summary
   - Cancel booking functionality (if not dispatched)

6. **Invoices & Billing** (`/patient/invoices`)
   - List of invoices with payment status
   - PDF download/print functionality
   - Note: Invoices are created by Admin/Super Admin

7. **Profile & Settings** (`/patient/profile`)
   - Personal information management
   - Saved addresses for quick booking
   - Emergency contact configuration
   - Language preference (SR/EN)

8. **Notifications** (`/patient/notifications`)
   - In-app notifications list
   - Booking confirmations
   - Status updates
   - Mark as read functionality

### Phase 3 - Driver App PWA (NEW - Jan 23, 2026) ✅

#### Driver App Features (COMPLETE)
1. **Driver Authentication**
   - Secure login for drivers
   - Auto-redirect to /driver after login
   - Role-based access (only drivers can access)

2. **Driver Dashboard** (`/driver`)
   - Dark slate mobile-first design
   - Driver name and status display
   - Connection status indicators (WiFi, GPS)
   - Go Online/Offline toggle button
   - "Waiting for Assignment" state
   - Emergency contact footer

3. **Status Management**
   - Status progression: Offline → Available → Assigned → En Route → On Site → Transporting → Complete
   - Large action buttons for status updates
   - Visual status indicators

4. **GPS Location Tracking**
   - Browser-based geolocation
   - Automatic tracking during active transports
   - Speed and accuracy display
   - Location updates sent to backend

5. **Assignment Display**
   - Patient information (name, phone, mobility status)
   - Pickup location with navigation link
   - Destination location with navigation link
   - Scheduled date/time
   - Click-to-call patient contact

### Phase 4 - Admin Live Map (NEW - Jan 23, 2026) ✅

#### Admin Live Map Features (COMPLETE)
1. **Real-Time Map**
   - Interactive OpenStreetMap display
   - Centered on Niš, Serbia by default
   - Auto-fit bounds to driver locations
   - Zoom controls

2. **Driver Markers**
   - Color-coded by status (green=available, red=transporting, etc.)
   - Custom truck icons
   - Popup with driver details on click

3. **Driver Cards**
   - Driver name and phone
   - Status badge with color
   - GPS coordinates when available
   - Speed indicator during transport

4. **Real-Time Updates**
   - WebSocket connection for instant updates
   - Connection status indicator (Live/Disconnected)
   - Auto-reconnect on disconnect
   - Manual refresh button

5. **Access Control**
   - Admin/Superadmin only
   - Protected by role-based authentication

### Phase 5 - Driver Assignment System (NEW - Jan 23, 2026) ✅

#### Driver Assignment Features (COMPLETE)
1. **Assign Driver Functionality**
   - Available in both Patient Portal Bookings AND Public Bookings tables
   - Dropdown shows only available/offline drivers
   - **Drivers sorted by distance** to pickup location (closest first)
   - Distance displayed in km next to driver name (e.g., "Marko Vozač (2.5 km)")
   - Haversine formula for accurate distance calculation

2. **Search Functionality**
   - Search bar on Patient Portal Bookings table
   - Search bar on Public Bookings table
   - Searches across: patient name, phone, email, address, status, driver name

3. **Visual Indicators**
   - Assigned driver shown with truck icon + green text
   - Completed/cancelled bookings show "—" instead of dropdown
   - Status dots (green=available, gray=offline) in dropdown

### Phase 6 - Staff Availability Calendar (NEW - Jan 23, 2026) ✅

#### Staff Availability Features (COMPLETE)
1. **Calendar Views**
   - Week view with 7-day grid showing all availability slots
   - Month view with full calendar grid
   - "Today" button for quick navigation
   - Previous/Next navigation for weeks and months

2. **Availability Management**
   - Add availability slots via dialog (date, time range, status, notes)
   - Edit existing slots (change time, status, notes)
   - Delete slots with confirmation
   - **Repeat weekly** feature - create same slot for 5 weeks (1 + 4)

3. **Status Types**
   - Available (green) - Staff is available for work
   - Unavailable (red) - Staff cannot work
   - On Leave (amber) - Staff is on scheduled leave
   - Sick Leave (purple) - Staff is on sick leave

4. **Role-Based Access**
   - Staff (drivers, doctors, nurses, admins) can create/edit their own availability
   - Patients cannot access availability features (returns 403)
   - Admin can view ALL staff availability with filters

5. **Admin Features**
   - Filter by staff member (dropdown with all staff)
   - Filter by role (driver, doctor, nurse, admin)
   - View aggregated team availability
   - Color-coded slots by status
   - **Create availability on behalf of any staff member**

6. **View Modes** (NEW - Jan 23, 2026) ✅
   - **Week View**: Standard 7-day grid with slots per day
   - **Month View**: Full calendar month grid
   - **Timeline View (Admin)**: Gantt-style with staff as rows, days as columns
   - **Grouped View (Admin)**: Days as cards showing all staff availability

7. **Visual Design**
   - Color-coded status indicators with legend
   - Role icons on slots (truck for drivers, stethoscope for doctors, etc.)
   - Time display on each slot
   - Click on date to add new slot
   - Click on slot to edit
   - Coverage stats (available/total) in week view header

8. **API Endpoints**
   - `POST /api/staff/availability` - Create availability slot(s)
   - `GET /api/staff/availability` - Get user's own availability
   - `PUT /api/staff/availability/{slot_id}` - Update availability slot
   - `DELETE /api/staff/availability/{slot_id}` - Delete availability slot
   - `GET /api/admin/staff-availability` - Get all staff availability (admin only)
   - `GET /api/admin/staff-list` - Get list of all staff members
   - `POST /api/admin/staff-availability/create` - Admin create availability for any staff

### Phase 7 - Medical Dashboard (NEW - Jan 23, 2026) ✅

#### Phase 1: Foundation (COMPLETE)
1. **Patient Medical Database**
   - Full patient profiles with: name, DOB, gender, contact, address, blood type
   - Height, weight, auto-calculated BMI
   - Allergies (with severity: mild/moderate/severe)
   - Chronic conditions (with diagnosis date)
   - Current medications (dosage, frequency)
   - Emergency contacts (with relationship)
   - Optional photo upload
   - Auto-generated Patient ID (PC018-P-XXXXX)

2. **Doctor/Nurse Dashboard** (`/medical` route)
   - Role-based access (doctor, nurse, admin, superadmin)
   - Dashboard overview with stats (total patients, recent, active transports, critical alerts)
   - Patient list with search functionality
   - Patient detail view with all medical information
   - Quick actions (new patient, record vitals)

3. **Vital Signs Tracking**
   - Record vitals: BP, HR, SpO₂, Temp, Respiratory Rate, Blood Glucose, Pain Score
   - Auto-flagging of abnormal values: HIGH_BP, LOW_BP, TACHYCARDIA, BRADYCARDIA, LOW_SPO2, FEVER, HYPOTHERMIA
   - Vitals history with color-coded status
   - Measurement types: routine, emergency, transport

4. **Dark Mode Toggle**
   - Available for Medical Dashboard (stored in localStorage as medicalDarkMode)
   - Available for Admin Dashboard (stored in localStorage as adminDarkMode)
   - Persistent preference across sessions

#### Phase 2: Medication Management (NEW - Jan 26, 2026) ✅
1. **Medication Administration**
   - Record administered medications: name, dosage (mg/g/ml/etc.), route
   - Administration routes: oral, IV, IM, SC, sublingual, topical, inhalation, rectal
   - Auto-save medications to library for future use
   - Autocomplete dropdown from medication library
   - Notes field for additional information

2. **Medication Library**
   - Automatic population from administered medications
   - Usage count tracking (most used first)
   - Default dosage suggestions
   - Search functionality

3. **PDF Report Generation**
   - Comprehensive patient reports
   - Selectable date range filter
   - Includes: patient info, vitals history, medications, medical checks
   - Available for Doctor, Nurse, Admin roles

#### Medical API Endpoints
- `GET /api/medical/dashboard` - Dashboard stats and data
- `POST /api/medical/patients` - Create patient profile
- `GET /api/medical/patients` - List patients with search/filters
- `GET /api/medical/patients/{id}` - Get patient by ID
- `PUT /api/medical/patients/{id}` - Update patient profile
- `DELETE /api/medical/patients/{id}` - Delete patient (admin only)
- `POST /api/medical/patients/{id}/photo` - Upload patient photo
- `POST /api/medical/vitals` - Record vital signs
- `GET /api/medical/vitals/{patient_id}` - Get vitals history
- `GET /api/medical/vitals/{patient_id}/latest` - Get latest vitals
- `GET /api/medical/alerts` - Get critical vitals alerts
- `POST /api/medical/checks` - Create medical examination
- `GET /api/medical/checks` - List medical checks
- `POST /api/medical/checks/{id}/sign` - Doctor sign check

### Phase 8 - Medical Staff PWA (NEW - Jan 23, 2026) ✅

#### Mobile-First PWA for Medical Staff
1. **Access** - `/medical-pwa` route, accessible by doctor, nurse, admin, superadmin
2. **Transport Selection**
   - Displays list of active transports
   - Shows patient name, address, phone, status
   - Touch-friendly transport cards
3. **Vital Signs Entry Form**
   - Extra large inputs (h-16) designed for gloved hands in shaking ambulance
   - Fields: BP (systolic/diastolic), Heart Rate, SpO₂, Respiratory Rate, Temperature, GCS, AVPU consciousness level
   - Critical value detection with red highlight and pulse animation
   - Quick preset buttons: "Normal Values" (fills 120/80, 75, 98, 16, 36.6, 15, alert), "Clear All"
   - Notes field for additional observations
4. **Save & Alert System**
   - Big red SAVE button (h-20) fixed at bottom
   - Saves via `POST /api/transport/vitals`
   - Critical values automatically trigger alerts for admin dashboard
   - "Last saved" timestamp indicator
5. **Offline Support** (NEW - Jan 23, 2026) ✅
   - Service Worker for caching static assets
   - IndexedDB for storing vitals when offline
   - Online/Offline status indicator in header
   - Automatic sync when connection restored
   - Pending sync count with manual sync button
   - Offline banner notification

### Bug Fixes - Jan 23, 2026

1. **User Registration Role Bug (FIXED)** ✅
   - **Issue:** `POST /api/auth/register` ignored the `role` field, defaulting all users to "regular"
   - **Fix:** Updated line 1447 in server.py to allow roles: doctor, nurse, driver during registration
   - **Verification:** Tested registration with all allowed roles - now correctly assigned

2. **Critical Alerts Panel Position (FIXED)** ✅
   - **Issue:** Floating alerts panel overlapped with header, blocking logout button and role display
   - **Fix:** Moved critical alerts to dedicated "Alerts" tab in Medical Dashboard with embedded mode
   - **Result:** Full-width alert management with active alerts grid and acknowledged alerts history

### Refactoring - Backend Modularization (Jan 23-26, 2026) ✅

**Extracted modules from monolithic server.py:**

```
/app/backend/
├── server.py           # Main app (~4624 lines, down from 4783)
├── config.py           # Database, JWT, email settings (44 lines)
├── models/             # Pydantic models (~800 lines total)
│   ├── __init__.py     # Exports all models
│   ├── user.py         # UserRole, UserCreate, UserLogin, UserResponse
│   ├── booking.py      # BookingStatus, PatientBookingCreate, InvoiceResponse
│   ├── medical.py      # VitalSigns, MedicalCheck, Availability models
│   ├── driver.py       # DriverStatus, ConnectionManager
│   ├── vehicle.py      # Vehicle, Team Assignment, Audit models
│   └── cms.py          # ContentCreate, PageContentCreate, ServiceCreate (NEW - Jan 26) ✅
├── utils/              # Shared utilities (~200 lines total)
│   ├── __init__.py
│   ├── auth.py         # JWT, password hashing, role checking
│   └── email.py        # send_email, get_email_header/footer, templates (NEW - Jan 26) ✅
└── server_backup.py    # Backup before refactoring
```

**Refactoring Progress:**
| Date | Action | Lines Reduced |
|------|--------|---------------|
| Jan 23 | Initial modularization (models, config, auth) | ~574 lines |
| Jan 26 | CMS models + email utilities extracted | ~159 lines |
| **Total** | **From ~4783 to ~4624 lines** | **~733 lines (15.3%)** |

### Phase 9 - Fleet Management & Team Assignment (NEW - Jan 26, 2026) ✅

#### Vehicle-Centric Team Assignment Module
A comprehensive fleet management system where each ambulance has assigned teams.

**Data Model:**
- **Vehicles**: id, name, registration_plate, vehicle_type, status, equipment[], required_roles[], optional_roles[]
- **Vehicle Teams**: vehicle_id, user_id, role, is_primary, is_remote, assigned_at, assigned_by, is_active
- **Team Locks**: vehicle_id, mission_id, locked_team[], locked_at, is_active
- **Team Audit**: vehicle_id, action, user_id, role, performed_by, timestamp, reason, handover_notes

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/fleet/vehicles | List all vehicles with current team |
| POST | /api/fleet/vehicles | Create new vehicle |
| GET | /api/fleet/vehicles/{id} | Get vehicle details + audit trail |
| PUT | /api/fleet/vehicles/{id} | Update vehicle |
| DELETE | /api/fleet/vehicles/{id} | Delete vehicle (superadmin) |
| POST | /api/fleet/vehicles/{id}/team | Assign team member |
| DELETE | /api/fleet/vehicles/{id}/team/{user_id} | Remove team member |
| PUT | /api/fleet/vehicles/{id}/team/{user_id}/replace | Replace with handover notes |
| POST | /api/fleet/vehicles/{id}/lock | Lock team for mission start |
| POST | /api/fleet/vehicles/{id}/unlock | Unlock team when mission ends |
| POST | /api/fleet/vehicles/{id}/emergency-override | Emergency team change during mission |
| POST | /api/fleet/vehicles/{id}/remote-doctor | Add telemedicine doctor |
| DELETE | /api/fleet/vehicles/{id}/remote-doctor/{id} | Remove remote doctor |
| GET | /api/fleet/vehicles/{id}/validate-team | Check if required roles filled |
| GET | /api/fleet/vehicles/{id}/audit | Get full audit trail |
| GET | /api/fleet/available-staff | Get staff available for assignment |

**UI Features (Admin > Flota > Vozila & Timovi):**
1. Vehicle cards showing: name, registration, status, current team, required roles
2. Status badges: Dostupno (green), Na misiji (blue), Održavanje (amber), Van funkcije (red)
3. Required roles with visual indicators (red = missing, green = filled)
4. Team assignment dialog with staff search and role-based buttons
5. Remote doctor support: Fizički (On-site) vs Daljinski (Remote)
6. Audit log viewer with timestamps and performer info
7. Add Vehicle dialog with equipment multi-select
8. **Vehicle Search** - Filter vehicles by name, registration, status (Jan 26, 2026) ✅
9. **Delete Vehicle** - Super Admin can delete vehicles (with confirmation dialog) (Jan 26, 2026) ✅
10. **Jitsi Video Calls** - Click video button to start call with remote doctor (Jan 26, 2026) ✅
11. **Team Assignment Flow** - Checkbox selection + Save Team button + Confirmation dialog (Jan 26, 2026) ✅
12. **Fleet History Page** - Track completed missions, search, expandable details (Jan 26, 2026) ✅
13. **Complete Mission Flow** - Mark mission complete, clear team, transfer to history (Jan 26, 2026) ✅

#### Phase 5: Admin Enhancements (NEW - Jan 26, 2026) ✅
1. **User Deletion Enhancement**
   - Admin users (not just superadmin) can delete users from Settings > Users
   - Confirmation modal with user details and warning
   - Protection: Superadmin accounts cannot be deleted
   - Protection: Admins cannot delete other admin accounts
   - Backend DELETE /api/users/{user_id} supports ADMIN and SUPERADMIN roles

2. **API Key Management Page** (Enhanced - Jan 26, 2026)
   - New page under Settings > API Settings (superadmin only)
   - **Two-section layout with tabs:**
   
   **Incoming APIs (Services the app uses):**
   - Google Maps - API key, endpoint URL configuration
   - OpenStreetMap - Tile server URL, optional API key
   - Stripe - Secret key, publishable key, webhook secret
   - SMS Service - Provider selection (Twilio/Nexmo/Infobip), API credentials, sender ID
   - Email Service - SMTP host, port, username, password, SSL toggle
   - Medical Devices - Device type (Lifepak 15, Zoll X, Philips MRx), API credentials
   - Each service has: Save, Test Connection, and Delete buttons
   - API keys masked in display (first 4 + **** + last 4 chars)
   - "Configured" badge shows when service is set up
   
   **Outgoing APIs (External systems accessing the app):**
   - Create API keys with name and permissions (read/write/delete)
   - Full key shown only once on creation (security)
   - Active keys list shows key prefix, permissions, creation date
   - Revoke keys (soft delete with audit trail)
   - API documentation section with usage example
   
   **Backend endpoints:**
   - GET/POST/DELETE /api/apikeys (outgoing)
   - GET/POST/DELETE /api/incoming-apis (incoming)
   - POST /api/incoming-apis/{service_type}/test

#### Phase 6: Unified Dispatch Console (NEW - Jan 26, 2026) ✅
**Merged "Operations/Bookings" and "Fleet/Vehicles & Teams" into single view**

1. **New FleetDispatch Component** (`/app/frontend/src/components/FleetDispatch.jsx`)
   - Split-screen layout: Vehicles (left 50%) | Bookings (right 50%)
   - Drag-and-drop: Vehicle card → Booking to assign
   - Real-time status updates via polling

2. **Vehicle Cards:**
   - Shows team members with role badges (driver, nurse, doctor)
   - Status: SPREMNO (Ready) when has driver, BEZ VOZAČA (No Driver) otherwise
   - Draggable only when vehicle has a driver assigned
   - Team assignment dialog with staff selection

3. **Booking Cards:**
   - Shows patient name, addresses, date/time, phone
   - Status badges: Čeka (Pending), Potvrđeno (Confirmed), U toku (In Progress)
   - Drop zone for vehicle assignment
   - Filter tabs: Pending / Active / All

4. **Driver PWA Notifications:**
   - Polls every 5 seconds for new assignments
   - Full-screen popup when new task assigned
   - Audio beep notification + device vibration
   - Toast message: "🚨 NEW TASK RECEIVED!"

5. **Driver PWA Installability** (FIXED - Jan 26, 2026) ✅
   - Custom `useDriverPWAManifest` hook in `DriverDashboard.jsx`
   - Dynamically sets manifest to `/manifest-driver.json` when on `/driver` route
   - Updates theme color, page title, apple-touch-icon for driver PWA
   - Restores original manifest when navigating away
   - Custom driver icon (192x192, 512x512) for home screen

**Navigation Changes:**
- Removed separate "Bookings" from Operations menu
- Renamed "Fleet" to "Dispečerski centar" (Dispatch Center)
- Main item: "Vozila & Rezervacije" (Vehicles & Bookings)

**Edge Cases Handled:**
- Mission start blocked if required roles not filled
- Team locking prevents changes during active transport
- Emergency override for critical situations (requires reason)
- Reassignment warning when staff moved between vehicles
- Remote doctors don't break team integrity
- Full audit trail for compliance/government standards

**Benefits achieved:**
- Reduced server.py from ~4783 to ~4624 lines (15.3% total reduction)
- Clear separation of concerns
- Reusable models and utilities
- Better code organization for team collaboration

**Next refactoring steps (Future):**
- Extract remaining email templates (verification, registration, booking confirmation)
- Create route modules (`routes/auth.py`, `routes/admin.py`, `routes/fleet.py`, etc.)
- Move CMS models to models package

### Technology Stack
- Frontend: React with Tailwind CSS, Shadcn UI, react-leaflet
- Backend: FastAPI with MongoDB
- Maps: OpenStreetMap via Leaflet

### User Personas
1. **Patients/Families** - Book and manage medical transport
2. **Medical Staff** - View/manage assigned cases
3. **Drivers** - View transport assignments
4. **Admin** - Daily operations management
5. **Super Admin** - Full platform control

## Prioritized Backlog

### P0 (Complete) ✅
- [x] Multilingual website
- [x] Public pages with CMS integration
- [x] Booking form with maps
- [x] Role-based auth
- [x] Admin CMS
- [x] Email system with bilingual templates
- [x] **Patient Portal (Dashboard, Bookings, Invoices, Profile, Notifications)**
- [x] **Driver App PWA** (NEW - Jan 23, 2026) ✅
- [x] **Admin Live Map** (NEW - Jan 23, 2026) ✅
- [x] **Driver Assignment System** (NEW - Jan 23, 2026) ✅
- [x] **Professional Sidebar Redesign** (NEW - Jan 23, 2026) ✅
- [x] **Staff Availability Calendar** (NEW - Jan 23, 2026) ✅
- [x] **Enhanced Staff Calendar Views** (Timeline + Grouped) (NEW - Jan 23, 2026) ✅
- [x] **Medical Dashboard Phase 1** (Doctor/Nurse Dashboard with Patient Database) (NEW - Jan 23, 2026) ✅
- [x] **Vital Signs Graphs** (Interactive historical charts with recharts) (NEW - Jan 23, 2026) ✅
- [x] **Emergency Transport Vitals & Alerts** (Real-time critical value detection) (NEW - Jan 23, 2026) ✅
- [x] **Medical Staff PWA** (Mobile-first vitals input for ambulance use) (NEW - Jan 23, 2026) ✅
- [x] **User Registration Role Bug Fix** (Roles doctor/nurse/driver now correctly assigned) (NEW - Jan 23, 2026) ✅
- [x] **Fleet Management Module** (Vehicle-centric team assignment) (NEW - Jan 26, 2026) ✅
- [x] **Driver PWA Installability Fix** (Dynamic manifest switching for mobile install) (FIXED - Jan 26, 2026) ✅
- [x] **European Address Search** (Expanded manual booking address search to all of Europe) (FIXED - Dec 2025) ✅

### P1 (Next Up)
- [ ] Emergency Transport Timeline (chronological event log)
- [ ] Doctor Decision Panel (live instructions, medication approval, hospital selection)
- [ ] Implement Statistics & Analytics dashboard
- [ ] Integrate live data into Operations Dashboard

### P2 (Future)
- [ ] Continue backend refactoring (server.py still ~3900 lines)
- [ ] Persist collapsible sidebar state in localStorage
- [ ] Driver rejection reason modal/text field
- [ ] Medical Reports & PDF Export (FHIR format)
- [ ] Calendar View for Bookings (OPERACIJE -> Kalendar)
- [ ] Offline mode for Medical Dashboard (PWA)
- [ ] Payment processing
- [ ] Insurance integration
- [ ] Mobile applications
- [ ] Advanced analytics
- [ ] Persistent file storage (S3 migration for uploads)

## API Endpoints

### Patient Portal APIs
- `GET /api/patient/dashboard` - Dashboard data with active booking and stats
- `GET /api/patient/transport-reasons` - Transport reason options
- `POST /api/patient/bookings` - Create new booking
- `GET /api/patient/bookings` - List patient's bookings
- `GET /api/patient/bookings/:id` - Get booking details
- `POST /api/patient/bookings/:id/cancel` - Cancel booking
- `GET /api/patient/invoices` - List patient's invoices
- `GET /api/patient/profile` - Get profile
- `PUT /api/patient/profile` - Update profile
- `GET /api/patient/notifications` - List notifications
- `POST /api/patient/notifications/:id/read` - Mark notification read
- `POST /api/patient/notifications/read-all` - Mark all read

### Admin APIs
- `PUT /api/admin/patient-bookings/:id/status` - Update booking status
- `POST /api/admin/invoices` - Create invoice for completed booking
- `POST /api/admin/assign-driver` - Assign driver to booking

### Driver APIs (NEW - Jan 23, 2026)
- `GET /api/driver/profile` - Get driver profile with current status
- `PUT /api/driver/status` - Update driver status (offline/available/assigned/en_route/on_site/transporting)
- `POST /api/driver/location` - Update driver GPS location
- `GET /api/driver/assignment` - Get current assignment
- `POST /api/driver/complete-transport/:id` - Mark transport as complete
- `POST /api/driver/assignment/accept` - Accept assigned task
- `POST /api/driver/assignment/reject` - Reject assigned task
- `WS /api/ws/driver/:driver_id` - WebSocket for real-time updates

### Staff Availability APIs (NEW - Jan 23, 2026)
- `POST /api/staff/availability` - Create availability slot(s), supports repeat_weekly
- `GET /api/staff/availability` - Get user's own availability with date filters
- `PUT /api/staff/availability/{slot_id}` - Update availability slot
- `DELETE /api/staff/availability/{slot_id}` - Delete availability slot
- `GET /api/admin/staff-availability` - Get all staff availability (admin only)
- `GET /api/admin/staff-list` - Get list of all staff members (excludes patients)

## Test Credentials
- **Super Admin:** admin@paramedic-care018.rs / Admin123!
- **Admin:** office@paramedic-care018.rs / Office123!
- **Test Patient:** patient@test.com / Test123!
- **Test Driver:** driver@test.com / Test123!

## Company Details
- Address: Žarka Zrenjanina 50A, 18103 Niš, Serbia
- PIB: 115243796
- MB: 68211557
- Website: paramedic-care018.rs
