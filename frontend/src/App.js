import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PWAProvider } from "./contexts/PWAContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Toaster } from "./components/ui/sonner";

// Loading spinner component
const LoadingSpinner = ({ dark = false }) => (
  <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
    <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${dark ? 'border-sky-400' : 'border-sky-600'}`}></div>
  </div>
);

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const MedicalCare = lazy(() => import("./pages/MedicalCare"));
const Transport = lazy(() => import("./pages/Transport"));
const Booking = lazy(() => import("./pages/Booking"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

// Patient Portal Pages - lazy loaded
const PatientDashboard = lazy(() => import("./pages/PatientDashboard"));
const PatientBookingWizard = lazy(() => import("./pages/PatientBookingWizard"));
const PatientBookings = lazy(() => import("./pages/PatientBookings"));
const PatientBookingDetail = lazy(() => import("./pages/PatientBookingDetail"));
const PatientInvoices = lazy(() => import("./pages/PatientInvoices"));
const PatientProfile = lazy(() => import("./pages/PatientProfile"));
const PatientNotifications = lazy(() => import("./pages/PatientNotifications"));

// Medical Dashboard - lazy loaded
const MedicalDashboard = lazy(() => import("./pages/MedicalDashboard"));
const MedicalStaffPWA = lazy(() => import("./pages/MedicalStaffPWA"));

// Unified PWA - lazy loaded
const UnifiedPWA = lazy(() => import("./pages/UnifiedPWA"));

// Protected Route for Patient Portal
const PatientRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Protected Route for Driver App
const DriverRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner dark />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'driver') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Protected Route for Medical Staff (Doctor/Nurse)
const MedicalRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!['doctor', 'nurse', 'admin', 'superadmin'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PWAProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-slate-50">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Admin Dashboard without header/footer */}
                <Route path="/dashboard" element={<Dashboard />} />
                
                {/* Email Verification without header/footer */}
                <Route path="/verify-email" element={<VerifyEmail />} />
                
                {/* Patient Portal without header/footer */}
                <Route path="/patient" element={<PatientRoute><PatientDashboard /></PatientRoute>} />
                <Route path="/patient/book" element={<PatientRoute><PatientBookingWizard /></PatientRoute>} />
                <Route path="/patient/bookings" element={<PatientRoute><PatientBookings /></PatientRoute>} />
                <Route path="/patient/bookings/:id" element={<PatientRoute><PatientBookingDetail /></PatientRoute>} />
                <Route path="/patient/invoices" element={<PatientRoute><PatientInvoices /></PatientRoute>} />
                <Route path="/patient/profile" element={<PatientRoute><PatientProfile /></PatientRoute>} />
                <Route path="/patient/notifications" element={<PatientRoute><PatientNotifications /></PatientRoute>} />
                
                {/* Driver App - Redirect to Unified PWA */}
                <Route path="/driver" element={<DriverRoute><UnifiedPWA /></DriverRoute>} />
                
                {/* Medical Dashboard without header/footer */}
                <Route path="/medical" element={<MedicalRoute><MedicalDashboard /></MedicalRoute>} />
                
                {/* Medical Staff PWA without header/footer */}
                <Route path="/medical-pwa" element={<MedicalRoute><MedicalStaffPWA /></MedicalRoute>} />
                
                {/* Admin PWA - Redirect to Unified PWA */}
                <Route path="/admin-app" element={<UnifiedPWA />} />
                
                {/* Unified PWA - adapts to user role */}
                <Route path="/app" element={<UnifiedPWA />} />
                
                {/* Public pages with header/footer */}
                <Route
                  path="*"
                  element={
                    <>
                      <Header />
                      <main className="flex-1">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/medical-care" element={<MedicalCare />} />
                          <Route path="/transport" element={<Transport />} />
                          <Route path="/booking" element={<Booking />} />
                          <Route path="/about" element={<About />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/login" element={<Login />} />
                        </Routes>
                      </main>
                      <Footer />
                    </>
                  }
                />
              </Routes>
            </Suspense>
            <Toaster position="top-right" richColors />
          </div>
        </BrowserRouter>
        </PWAProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
