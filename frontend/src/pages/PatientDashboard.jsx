import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Ambulance, 
  Calendar,
  Clock,
  MapPin,
  FileText,
  Bell,
  User,
  Phone,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Truck,
  Package,
  LogOut,
  Settings,
  Home
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const PatientDashboard = () => {
  const { language } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/api/patient/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'requested': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'en_route': return <Truck className="w-5 h-5 text-purple-500" />;
      case 'picked_up': return <Package className="w-5 h-5 text-indigo-500" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      requested: { sr: 'Zahtev poslat', en: 'Requested' },
      confirmed: { sr: 'Potvrđeno', en: 'Confirmed' },
      en_route: { sr: 'Vozilo na putu', en: 'Ambulance En Route' },
      picked_up: { sr: 'Preuzeto', en: 'Picked Up' },
      completed: { sr: 'Završeno', en: 'Completed' },
      cancelled: { sr: 'Otkazano', en: 'Cancelled' }
    };
    return labels[status]?.[language] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'requested': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'en_route': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'picked_up': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const statusSteps = [
    { key: 'requested', label: language === 'sr' ? 'Zahtev poslat' : 'Requested' },
    { key: 'confirmed', label: language === 'sr' ? 'Potvrđeno' : 'Confirmed' },
    { key: 'en_route', label: language === 'sr' ? 'Na putu' : 'En Route' },
    { key: 'picked_up', label: language === 'sr' ? 'Preuzeto' : 'Picked Up' },
    { key: 'completed', label: language === 'sr' ? 'Završeno' : 'Completed' }
  ];

  const getStepIndex = (status) => {
    return statusSteps.findIndex(s => s.key === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  const activeBooking = dashboardData?.active_booking;
  const stats = dashboardData?.stats || {};

  return (
    <div className="min-h-screen bg-slate-50" data-testid="patient-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg"
                  alt="Paramedic Care 018"
                  className="h-10 w-auto"
                />
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Emergency Button */}
              <a href="tel:+381181234567" className="hidden sm:flex">
                <Button variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
                  <Phone className="w-4 h-4" />
                  <span className="hidden md:inline">{language === 'sr' ? 'Hitna linija' : 'Emergency'}</span>
                </Button>
              </a>
              
              {/* Notifications */}
              <Link to="/patient/notifications" className="relative p-2 text-slate-600 hover:text-slate-900">
                <Bell className="w-6 h-6" />
                {stats.unread_notifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {stats.unread_notifications}
                  </span>
                )}
              </Link>
              
              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-slate-900">{user?.full_name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={logout} className="text-slate-600">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            {language === 'sr' ? `Dobrodošli, ${user?.full_name?.split(' ')[0]}` : `Welcome, ${user?.full_name?.split(' ')[0]}`}
          </h1>
          <p className="text-slate-600">
            {language === 'sr' 
              ? 'Upravljajte svojim rezervacijama i pratite status transporta'
              : 'Manage your bookings and track transport status'}
          </p>
        </div>

        {/* Primary Action - Book Transport */}
        <div className="mb-8">
          <Link to="/patient/book">
            <Button 
              className="w-full sm:w-auto btn-urgent text-lg px-8 py-6 gap-3 shadow-lg hover:shadow-xl transition-shadow"
              data-testid="book-transport-btn"
            >
              <Ambulance className="w-6 h-6" />
              {language === 'sr' ? 'Zakažite Medicinski Transport' : 'Book Medical Transport'}
            </Button>
          </Link>
        </div>

        {/* Active Booking Status */}
        {activeBooking && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-8" data-testid="active-booking">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-600" />
                {language === 'sr' ? 'Aktivna rezervacija' : 'Active Booking'}
              </h2>
              <Badge className={`${getStatusColor(activeBooking.status)} border px-3 py-1 self-start sm:self-auto`}>
                {getStatusIcon(activeBooking.status)}
                <span className="ml-2">{getStatusLabel(activeBooking.status)}</span>
              </Badge>
            </div>

            {/* Status Progress - Mobile optimized */}
            <div className="mb-6">
              {/* Progress bar first on mobile for better visual hierarchy */}
              <div className="h-2 bg-slate-200 rounded-full mb-4 relative">
                <div 
                  className="h-full bg-sky-600 rounded-full transition-all duration-500"
                  style={{ width: `${(getStepIndex(activeBooking.status) / (statusSteps.length - 1)) * 100}%` }}
                />
              </div>
              
              {/* Step indicators */}
              <div className="flex items-start justify-between">
                {statusSteps.map((step, index) => {
                  const currentIndex = getStepIndex(activeBooking.status);
                  const isActive = index <= currentIndex;
                  const isCurrent = index === currentIndex;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1 min-w-0">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${
                        isActive 
                          ? isCurrent 
                            ? 'bg-sky-600 text-white ring-4 ring-sky-100' 
                            : 'bg-sky-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className={`text-[10px] sm:text-xs mt-1 sm:mt-2 text-center leading-tight px-0.5 ${isActive ? 'text-sky-600 font-medium' : 'text-slate-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Booking Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 rounded-xl">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    {language === 'sr' ? 'Polazište' : 'Pickup'}
                  </p>
                  <p className="text-sm font-medium text-slate-900 break-words">{activeBooking.pickup_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    {language === 'sr' ? 'Odredište' : 'Destination'}
                  </p>
                  <p className="text-sm font-medium text-slate-900 break-words">{activeBooking.destination_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    {language === 'sr' ? 'Datum' : 'Date'}
                  </p>
                  <p className="text-sm font-medium text-slate-900">{activeBooking.preferred_date}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    {language === 'sr' ? 'Vreme' : 'Time'}
                  </p>
                  <p className="text-sm font-medium text-slate-900">{activeBooking.preferred_time}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Link to={`/patient/bookings/${activeBooking.id}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  {language === 'sr' ? 'Detalji' : 'View Details'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link to="/patient/bookings" className="group">
            <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-sky-200 transition-all">
              <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-sky-200 transition-colors">
                <Calendar className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">
                {language === 'sr' ? 'Moje rezervacije' : 'My Bookings'}
              </h3>
              <p className="text-sm text-slate-500">
                {stats.total_bookings || 0} {language === 'sr' ? 'ukupno' : 'total'}
              </p>
            </div>
          </Link>

          <Link to="/patient/invoices" className="group">
            <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-sky-200 transition-all">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">
                {language === 'sr' ? 'Fakture' : 'Invoices'}
              </h3>
              <p className="text-sm text-slate-500">
                {stats.pending_invoices || 0} {language === 'sr' ? 'na čekanju' : 'pending'}
              </p>
            </div>
          </Link>

          <Link to="/patient/notifications" className="group">
            <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-sky-200 transition-all relative">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
                <Bell className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">
                {language === 'sr' ? 'Obaveštenja' : 'Notifications'}
              </h3>
              <p className="text-sm text-slate-500">
                {stats.unread_notifications || 0} {language === 'sr' ? 'nepročitano' : 'unread'}
              </p>
              {stats.unread_notifications > 0 && (
                <span className="absolute top-4 right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {stats.unread_notifications}
                </span>
              )}
            </div>
          </Link>

          <Link to="/patient/profile" className="group">
            <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-sky-200 transition-all">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
                <Settings className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">
                {language === 'sr' ? 'Podešavanja' : 'Settings'}
              </h3>
              <p className="text-sm text-slate-500">
                {language === 'sr' ? 'Profil i adrese' : 'Profile & addresses'}
              </p>
            </div>
          </Link>
        </div>

        {/* Emergency Contact Banner */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <Phone className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {language === 'sr' ? 'Hitna pomoć?' : 'Emergency?'}
                </h3>
                <p className="text-red-100">
                  {language === 'sr' ? 'Pozovite nas odmah' : 'Call us immediately'}
                </p>
              </div>
            </div>
            <a href="tel:+381181234567">
              <Button className="bg-white text-red-600 hover:bg-red-50 text-lg px-8 py-3 font-bold">
                +381 18 123 456
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
