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

### P1 (Next Up)
- [ ] **Admin Live Map** - Display driver locations in real-time on admin dashboard
- [ ] Integrate live data into Operations Dashboard (replace mocked data)
- [ ] Push notifications (browser)

### P2 (Future)
- [ ] Electronic Medical Records (EMR)
- [ ] Payment processing
- [ ] Insurance integration
- [ ] Mobile applications
- [ ] Advanced analytics
- [ ] Role-specific dashboards for Doctors/Nurses

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
- `WS /api/ws/driver/:driver_id` - WebSocket for real-time updates

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
