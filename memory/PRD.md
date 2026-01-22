# Paramedic Care 018 - Product Requirements Document

## Original Problem Statement
Build a medical platform called "Paramedic Care 018" for urgent medical care and patient transportation services in Serbia.

## What's Been Implemented (Phase 1) - January 2026

### Core Features
1. **Multilingual Website (SR/EN)**
   - Serbian as default language
   - English translation
   - Language switcher with country flags

2. **Public Pages**
   - Home - Hero section, services overview, image gallery
   - Medical Care - Light blue theme, professional staff info
   - Transport - Red urgent theme, ambulance services
   - Booking - OpenStreetMap integration for location selection
   - About Us - Company info, values, team
   - Contact - Contact form with email notification

3. **Role-Based User System**
   - Regular Users (patients)
   - Doctors/Nurses
   - Drivers
   - Admin
   - Super Admin

4. **Admin Dashboard**
   - Two main views: Operations and Administration
   - Statistics overview
   - Booking management
   - User management
   - Contact messages
   - Services management
   - Company logo in sidebar

5. **Operations Dashboard (NEW - Jan 22, 2026)**
   - Transportation Command view with:
     - Large fleet map (3 columns) with fullscreen toggle
     - Compact mission timeline (1 column)
     - Live booking status from API
     - Fleet statistics
   - Medical Care view with:
     - Patient vital signs monitoring (HR, BP, SpO2, Temp)
     - Critical/Stable patient status indicators
     - Medical protocols quick access
     - Doctor consultation feature
   - Tab switching between Transportation and Medical Care

6. **Booking System**
   - Start/End point with map selection
   - Date picker
   - Patient details
   - Document upload (PENDING)
   - Email notifications to transport@paramedic-care018.rs (PENDING)

### Technology Stack
- Frontend: React with Tailwind CSS, Shadcn UI, react-leaflet
- Backend: FastAPI with MongoDB
- Maps: OpenStreetMap via Leaflet

### User Personas
1. **Patients/Families** - Need medical transport booking
2. **Medical Staff** - View/manage assigned cases
3. **Drivers** - View transport assignments
4. **Admin** - Daily operations management
5. **Super Admin** - Full platform control

## Prioritized Backlog

### P0 (Phase 1 - Done)
- [x] Multilingual website
- [x] Public pages
- [x] Booking form with maps
- [x] Role-based auth
- [x] Admin CMS
- [x] Operations Dashboard with Transportation/Medical Care views
- [x] Fullscreen map toggle
- [x] Company logo integration in dashboard

### P1 (Phase 2 - In Progress)
- [ ] Document upload on booking page
- [ ] Email notification on new booking
- [ ] Integrate live data into Operations Dashboard (replace mocked data)
- [ ] GPS real-time tracking
- [ ] Push notifications
- [ ] Mobile responsive improvements
- [ ] Booking status tracking for patients

### P2 (Future)
- [ ] Electronic Medical Records (EMR)
- [ ] Payment processing
- [ ] Insurance integration
- [ ] Mobile applications
- [ ] Advanced analytics
- [ ] Role-specific dashboards for Doctors/Nurses/Drivers

## Company Details
- Address: Žarka Zrenjanina 50A, 18103 Niš, Serbia
- PIB: 115243796
- MB: 68211557
- Website: paramedic-care018.rs
