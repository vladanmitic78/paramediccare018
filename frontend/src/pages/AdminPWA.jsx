import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Truck,
  MapPin,
  Navigation,
  Phone,
  User,
  Clock,
  CheckCircle,
  LogOut,
  AlertCircle,
  Loader2,
  RefreshCw,
  Globe,
  Calendar,
  Users,
  Activity,
  ChevronRight,
  X,
  Bell
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Custom hook to set Admin PWA manifest
const useAdminPWAManifest = () => {
  useEffect(() => {
    const manifestLink = document.getElementById('pwa-manifest');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    
    const originalManifest = manifestLink?.href;
    const originalThemeColor = themeColorMeta?.content;
    const originalAppleIcon = appleTouchIcon?.href;
    const originalAppleTitle = appleTitle?.content;
    
    document.title = 'PC018 Admin - Paramedic Care 018';
    if (manifestLink) manifestLink.href = '/manifest-admin.json';
    if (themeColorMeta) themeColorMeta.content = '#1e3a5f';
    if (appleTouchIcon) appleTouchIcon.href = '/apple-touch-icon-admin.png';
    if (appleTitle) appleTitle.content = 'PC018 Admin';
    
    return () => {
      document.title = 'Paramedic Care 018 | Medicinska Nega i Transport';
      if (manifestLink && originalManifest) manifestLink.href = originalManifest;
      if (themeColorMeta && originalThemeColor) themeColorMeta.content = originalThemeColor;
      if (appleTouchIcon && originalAppleIcon) appleTouchIcon.href = originalAppleIcon;
      if (appleTitle && originalAppleTitle) appleTitle.content = originalAppleTitle;
    };
  }, []);
};

// Driver marker icon
const driverIcon = new L.DivIcon({
  className: 'driver-marker',
  html: `<div style="background: #10b981; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const AdminPWA = () => {
  useAdminPWAManifest();
  
  const { language, toggleLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings'); // bookings, map, drivers
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverLocations, setDriverLocations] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  // Check if user has admin access
  useEffect(() => {
    if (user && !['admin', 'superadmin'].includes(user.role)) {
      toast.error(language === 'sr' ? 'Nemate pristup' : 'Access denied');
      navigate('/');
    }
  }, [user, navigate, language]);

  // Fetch data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [bookingsRes, usersRes] = await Promise.all([
        axios.get(`${API}/api/bookings`),
        axios.get(`${API}/api/users`)
      ]);
      
      setBookings(bookingsRes.data);
      
      // Filter drivers
      const driverUsers = usersRes.data.filter(u => u.role === 'driver');
      setDrivers(driverUsers);
      
      // TODO: Fetch driver locations from driver_status collection
      
      if (isRefresh) toast.success(language === 'sr' ? 'Osveženo!' : 'Refreshed!');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useEffect(() => {
    fetchData();
    // Poll every 5 seconds
    const interval = setInterval(() => fetchData(), 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Assign driver to booking
  const assignDriver = async () => {
    if (!selectedBooking || !selectedDriver) return;
    
    setAssigning(true);
    try {
      await axios.post(`${API}/api/admin/assign-driver-public?booking_id=${selectedBooking.id}&driver_id=${selectedDriver}`);
      toast.success(language === 'sr' ? 'Vozač dodeljen!' : 'Driver assigned!');
      setShowAssignModal(false);
      setSelectedBooking(null);
      setSelectedDriver('');
      fetchData();
    } catch (error) {
      const errMsg = error.response?.data?.detail || (language === 'sr' ? 'Greška' : 'Error');
      toast.error(errMsg);
    } finally {
      setAssigning(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Status helpers
  const statusConfig = {
    pending: { label: { sr: 'Čeka', en: 'Pending' }, color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
    confirmed: { label: { sr: 'Potvrđeno', en: 'Confirmed' }, color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
    en_route: { label: { sr: 'Na putu', en: 'En Route' }, color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50', pulse: true },
    on_site: { label: { sr: 'Na lokaciji', en: 'On Site' }, color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50', pulse: true },
    transporting: { label: { sr: 'U transportu', en: 'Transporting' }, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50', pulse: true },
    completed: { label: { sr: 'Završeno', en: 'Completed' }, color: 'bg-slate-400', textColor: 'text-slate-700', bgLight: 'bg-slate-50' }
  };

  // Filter bookings
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const activeBookings = bookings.filter(b => ['confirmed', 'en_route', 'on_site', 'transporting'].includes(b.status));
  const availableDrivers = drivers.filter(d => {
    // Check if driver has any active booking
    const hasActiveBooking = bookings.some(b => 
      b.assigned_driver === d.id && 
      ['confirmed', 'en_route', 'on_site', 'transporting'].includes(b.status)
    );
    return !hasActiveBooking;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col" data-testid="admin-pwa">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden">
            <img src="/logo.jpg" alt="Paramedic Care 018" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-sm">PC018 Admin</p>
            <p className="text-xs text-slate-400">{user?.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleLanguage} 
            className="text-slate-400 hover:text-white"
          >
            <Globe className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-slate-800/50 px-4 py-3 grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-red-400">{pendingBookings.length}</p>
          <p className="text-xs text-slate-400">{language === 'sr' ? 'Čekaju' : 'Pending'}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-400">{activeBookings.length}</p>
          <p className="text-xs text-slate-400">{language === 'sr' ? 'Aktivni' : 'Active'}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-sky-400">{availableDrivers.length}</p>
          <p className="text-xs text-slate-400">{language === 'sr' ? 'Slobodni vozači' : 'Free Drivers'}</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Tab Content */}
        {activeTab === 'bookings' && (
          <div className="p-4 space-y-3">
            {/* Pending Bookings Section */}
            {pendingBookings.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {language === 'sr' ? 'ČEKAJU DODELU' : 'WAITING ASSIGNMENT'} ({pendingBookings.length})
                </h3>
                {pendingBookings.map(booking => (
                  <BookingCard 
                    key={booking.id}
                    booking={booking}
                    statusConfig={statusConfig}
                    language={language}
                    onAssign={() => {
                      setSelectedBooking(booking);
                      setShowAssignModal(true);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Active Bookings Section */}
            {activeBookings.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  {language === 'sr' ? 'AKTIVNI TRANSPORTI' : 'ACTIVE TRANSPORTS'} ({activeBookings.length})
                </h3>
                {activeBookings.map(booking => (
                  <BookingCard 
                    key={booking.id}
                    booking={booking}
                    statusConfig={statusConfig}
                    language={language}
                  />
                ))}
              </div>
            )}

            {pendingBookings.length === 0 && activeBookings.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle className="w-16 h-16 mx-auto mb-3 text-slate-600" />
                <p>{language === 'sr' ? 'Nema aktivnih rezervacija' : 'No active bookings'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="h-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <MapContainer
              center={[43.3209, 21.8958]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Show active bookings on map */}
              {activeBookings.map(booking => (
                booking.pickup_lat && booking.pickup_lng && (
                  <Marker 
                    key={booking.id}
                    position={[booking.pickup_lat, booking.pickup_lng]}
                    icon={driverIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{booking.patient_name}</strong>
                        <p className="text-slate-600">{booking.assigned_driver_name}</p>
                        <p className="text-xs text-slate-500">{statusConfig[booking.status]?.label[language]}</p>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">
              {language === 'sr' ? 'SVI VOZAČI' : 'ALL DRIVERS'} ({drivers.length})
            </h3>
            {drivers.map(driver => {
              const activeBooking = bookings.find(b => 
                b.assigned_driver === driver.id && 
                ['confirmed', 'en_route', 'on_site', 'transporting'].includes(b.status)
              );
              const isAvailable = !activeBooking;
              
              return (
                <div 
                  key={driver.id}
                  className={`rounded-xl p-4 ${isAvailable ? 'bg-slate-800' : 'bg-slate-800/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAvailable ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">{driver.full_name}</p>
                        <p className="text-xs text-slate-400">{driver.phone || driver.email}</p>
                      </div>
                    </div>
                    <Badge className={isAvailable ? 'bg-emerald-600' : 'bg-amber-600'}>
                      {isAvailable 
                        ? (language === 'sr' ? 'Slobodan' : 'Available')
                        : (language === 'sr' ? 'Zauzet' : 'Busy')
                      }
                    </Badge>
                  </div>
                  {activeBooking && (
                    <div className="mt-3 pt-3 border-t border-slate-700 text-sm text-slate-400">
                      <p className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        {activeBooking.patient_name}
                      </p>
                      <p className="flex items-center gap-2 mt-1">
                        <Activity className="w-3 h-3" />
                        {statusConfig[activeBooking.status]?.label[language]}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-slate-800 border-t border-slate-700 grid grid-cols-3">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`py-4 flex flex-col items-center gap-1 ${activeTab === 'bookings' ? 'text-sky-400' : 'text-slate-500'}`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs">{language === 'sr' ? 'Rezervacije' : 'Bookings'}</span>
          {pendingBookings.length > 0 && (
            <span className="absolute top-2 right-1/4 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
              {pendingBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`py-4 flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-sky-400' : 'text-slate-500'}`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-xs">{language === 'sr' ? 'Mapa' : 'Map'}</span>
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`py-4 flex flex-col items-center gap-1 ${activeTab === 'drivers' ? 'text-sky-400' : 'text-slate-500'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-xs">{language === 'sr' ? 'Vozači' : 'Drivers'}</span>
        </button>
      </nav>

      {/* Assign Driver Modal */}
      {showAssignModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-t-2xl w-full max-w-lg p-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {language === 'sr' ? 'Dodeli vozača' : 'Assign Driver'}
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedBooking(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Booking Info */}
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <p className="font-semibold">{selectedBooking.patient_name}</p>
              <p className="text-sm text-slate-400 flex items-center gap-2 mt-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                {selectedBooking.start_point || selectedBooking.pickup_address}
              </p>
              <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                <Navigation className="w-4 h-4 text-red-400" />
                {selectedBooking.end_point || selectedBooking.destination_address}
              </p>
            </div>
            
            {/* Driver Selection */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">
                {language === 'sr' ? 'Izaberi vozača' : 'Select Driver'}
              </label>
              {availableDrivers.length > 0 ? (
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder={language === 'sr' ? 'Izaberi...' : 'Select...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDrivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-amber-400 text-sm">
                  {language === 'sr' ? 'Nema slobodnih vozača' : 'No available drivers'}
                </p>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedBooking(null);
                }}
              >
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={assignDriver}
                disabled={!selectedDriver || assigning}
              >
                {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {language === 'sr' ? 'Dodeli' : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Booking Card Component
const BookingCard = ({ booking, statusConfig, language, onAssign }) => {
  const status = statusConfig[booking.status] || statusConfig.pending;
  
  return (
    <div className={`rounded-xl p-4 mb-3 ${status.bgLight} border-l-4 ${status.color.replace('bg-', 'border-')}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-slate-900">{booking.patient_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-[10px] ${status.color} text-white flex items-center gap-1`}>
              {status.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              {status.label[language]}
            </Badge>
            {booking.assigned_driver_name && (
              <span className="text-xs text-slate-600">• {booking.assigned_driver_name}</span>
            )}
          </div>
        </div>
        {booking.status === 'pending' && onAssign && (
          <Button 
            size="sm" 
            className="bg-emerald-600 hover:bg-emerald-700 h-8"
            onClick={onAssign}
          >
            {language === 'sr' ? 'Dodeli' : 'Assign'}
          </Button>
        )}
      </div>
      
      <div className="space-y-1 text-sm text-slate-700">
        <p className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
          <span className="truncate">{booking.start_point || booking.pickup_address}</span>
        </p>
        <p className="flex items-center gap-2">
          <Navigation className="w-3 h-3 text-red-600 flex-shrink-0" />
          <span className="truncate">{booking.end_point || booking.destination_address}</span>
        </p>
        <div className="flex items-center gap-4 pt-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {booking.booking_time}
          </span>
          {booking.contact_phone && (
            <a href={`tel:${booking.contact_phone}`} className="flex items-center gap-1 text-sky-600">
              <Phone className="w-3 h-3" />
              {booking.contact_phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPWA;
