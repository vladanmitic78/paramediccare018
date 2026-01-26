import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Toaster } from "./components/ui/sonner";

// Pages
import Home from "./pages/Home";
import MedicalCare from "./pages/MedicalCare";
import Transport from "./pages/Transport";
import Booking from "./pages/Booking";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VerifyEmail from "./pages/VerifyEmail";

// Patient Portal Pages
import PatientDashboard from "./pages/PatientDashboard";
import PatientBookingWizard from "./pages/PatientBookingWizard";
import PatientBookings from "./pages/PatientBookings";
import PatientBookingDetail from "./pages/PatientBookingDetail";
import PatientInvoices from "./pages/PatientInvoices";
import PatientProfile from "./pages/PatientProfile";
import PatientNotifications from "./pages/PatientNotifications";

// Driver App
import DriverDashboard from "./pages/DriverDashboard";

// Medical Dashboard
import MedicalDashboard from "./pages/MedicalDashboard";

// Medical Staff PWA
import MedicalStaffPWA from "./pages/MedicalStaffPWA";

// Admin PWA
import AdminPWA from "./pages/AdminPWA";

// Protected Route for Patient Portal
const PatientRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
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
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user is a driver
  if (user.role !== 'driver') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Protected Route for Medical Staff (Doctor/Nurse)
const MedicalRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user is medical staff (doctor, nurse, admin, superadmin)
  if (!['doctor', 'nurse', 'admin', 'superadmin'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-slate-50">
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
              
              {/* Driver App without header/footer */}
              <Route path="/driver" element={<DriverRoute><DriverDashboard /></DriverRoute>} />
              
              {/* Medical Dashboard without header/footer */}
              <Route path="/medical" element={<MedicalRoute><MedicalDashboard /></MedicalRoute>} />
              
              {/* Medical Staff PWA without header/footer */}
              <Route path="/medical-pwa" element={<MedicalRoute><MedicalStaffPWA /></MedicalRoute>} />
              
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
            <Toaster position="top-right" richColors />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
