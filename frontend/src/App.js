import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
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

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-slate-50">
            <Routes>
              {/* Dashboard without header/footer */}
              <Route path="/dashboard" element={<Dashboard />} />
              
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
