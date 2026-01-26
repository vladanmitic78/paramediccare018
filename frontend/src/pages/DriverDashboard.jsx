import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Navigation,
  MapPin,
  Phone,
  User,
  Clock,
  CheckCircle,
  Truck,
  LogOut,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  Battery,
  Compass,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Globe
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// GPS tracking interval in milliseconds
const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds while moving
const LOCATION_UPDATE_INTERVAL_IDLE = 20000; // 20 seconds when stationary

// Custom marker icons for the map
const driverIcon = new L.DivIcon({
  className: 'driver-marker',
  html: `<div style="background: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
    <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const destinationIcon = new L.DivIcon({
  className: 'destination-marker',
  html: `<div style="background: #ef4444; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
    <div style="width: 10px; height: 10px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

// Component to auto-fit map bounds
const MapBoundsUpdater = ({ driverLocation, destination }) => {
  const map = useMap();
  
  useEffect(() => {
    if (driverLocation && destination) {
      const bounds = L.latLngBounds([
        [driverLocation.latitude, driverLocation.longitude],
        [destination.lat, destination.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (driverLocation) {
      map.setView([driverLocation.latitude, driverLocation.longitude], 15);
    } else if (destination) {
      map.setView([destination.lat, destination.lng], 15);
    }
  }, [map, driverLocation, destination]);
  
  return null;
};

// Custom hook for Screen Wake Lock - prevents phone from sleeping
const useWakeLock = (enabled) => {
  const wakeLockRef = useRef(null);
  
  useEffect(() => {
    const requestWakeLock = async () => {
      if (enabled && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Wake Lock activated - screen will stay on');
        } catch (err) {
          console.log('Wake Lock error:', err.message);
        }
      }
    };
    
    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock released');
      }
    };
    
    if (enabled) {
      requestWakeLock();
      
      // Re-acquire wake lock when page becomes visible again
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && enabled) {
          requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        releaseWakeLock();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      releaseWakeLock();
    }
  }, [enabled]);
};

// Custom hook to set driver PWA manifest
const useDriverPWAManifest = () => {
  useEffect(() => {
    // Store original values
    const manifestLink = document.getElementById('pwa-manifest');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    
    const originalManifest = manifestLink?.href;
    const originalThemeColor = themeColorMeta?.content;
    const originalAppleIcon = appleTouchIcon?.href;
    const originalAppleTitle = appleTitle?.content;
    
    // Update document title
    document.title = 'PC018 Vozač - Paramedic Care 018';
    
    // Update manifest link
    if (manifestLink) {
      manifestLink.href = '/manifest-driver.json';
    }
    
    // Update theme color
    if (themeColorMeta) {
      themeColorMeta.content = '#0f172a';
    }
    
    // Update apple touch icon
    if (appleTouchIcon) {
      appleTouchIcon.href = '/apple-touch-icon-driver.png';
    }
    
    // Update apple mobile web app title
    if (appleTitle) {
      appleTitle.content = 'PC018 Vozač';
    }
    
    // Cleanup function - restore original values when leaving driver dashboard
    return () => {
      document.title = 'Paramedic Care 018 | Medicinska Nega i Transport';
      if (manifestLink && originalManifest) manifestLink.href = originalManifest;
      if (themeColorMeta && originalThemeColor) themeColorMeta.content = originalThemeColor;
      if (appleTouchIcon && originalAppleIcon) appleTouchIcon.href = originalAppleIcon;
      if (appleTitle && originalAppleTitle) appleTitle.content = originalAppleTitle;
    };
  }, []);
};

const DriverDashboard = () => {
  // Apply driver PWA manifest settings
  useDriverPWAManifest();
  
  const { language, toggleLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [driverStatus, setDriverStatus] = useState('offline');
  const [assignment, setAssignment] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  const watchIdRef = useRef(null);
  const wsRef = useRef(null);
  const locationQueueRef = useRef([]);

  // Keep screen awake during active transport (en_route, on_site, transporting)
  const isActiveTransport = ['en_route', 'on_site', 'transporting'].includes(driverStatus);
  useWakeLock(isActiveTransport);
  
  // Auto-show full screen map when transporting
  const showFullScreenMap = driverStatus === 'transporting';

  // Status labels
  const statusLabels = {
    offline: { sr: 'Van mreže', en: 'Offline', color: 'bg-slate-500' },
    available: { sr: 'Dostupan', en: 'Available', color: 'bg-green-500' },
    assigned: { sr: 'Dodeljen', en: 'Assigned', color: 'bg-blue-500' },
    en_route: { sr: 'Na putu', en: 'En Route', color: 'bg-purple-500' },
    on_site: { sr: 'Na lokaciji', en: 'On Site', color: 'bg-amber-500' },
    transporting: { sr: 'U transportu', en: 'Transporting', color: 'bg-red-500' }
  };

  // Fetch driver profile and assignment
  const fetchDriverData = useCallback(async () => {
    try {
      const [profileRes, assignmentRes] = await Promise.all([
        axios.get(`${API}/api/driver/profile`),
        axios.get(`${API}/api/driver/assignment`)
      ]);
      
      setDriverStatus(profileRes.data.status?.status || 'offline');
      
      if (assignmentRes.data.has_assignment) {
        const currentAssignment = assignmentRes.data.assignment;
        setAssignment(currentAssignment);
        // Store in ref so polling doesn't trigger false "new task" on first load
        prevAssignmentRef.current = currentAssignment;
      } else {
        setAssignment(null);
        prevAssignmentRef.current = null;
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update driver status
  const updateStatus = async (newStatus, bookingId = null) => {
    setUpdatingStatus(true);
    try {
      await axios.put(`${API}/api/driver/status`, {
        status: newStatus,
        booking_id: bookingId
      });
      
      setDriverStatus(newStatus);
      
      // Start/stop GPS tracking based on status
      if (['en_route', 'on_site', 'transporting'].includes(newStatus)) {
        startGPSTracking();
      } else if (newStatus === 'available' || newStatus === 'offline') {
        stopGPSTracking();
      }
      
      const statusMsg = statusLabels[newStatus];
      toast.success(statusMsg?.[language] || newStatus);
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri ažuriranju statusa' : 'Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Complete transport
  const completeTransport = async () => {
    if (!assignment) return;
    
    setUpdatingStatus(true);
    try {
      await axios.post(`${API}/api/driver/complete-transport/${assignment.id}`);
      
      setDriverStatus('available');
      setAssignment(null);
      stopGPSTracking();
      
      toast.success(language === 'sr' ? 'Transport završen!' : 'Transport completed!');
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Send location update
  const sendLocationUpdate = useCallback(async (position) => {
    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speed: position.coords.speed ? position.coords.speed * 3.6 : null, // Convert m/s to km/h
      heading: position.coords.heading,
      accuracy: position.coords.accuracy
    };
    
    setLastLocation(locationData);
    
    // Send via REST API
    try {
      await axios.post(`${API}/api/driver/location`, locationData);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error sending location:', error);
      setConnectionStatus('offline');
      // Queue for later
      locationQueueRef.current.push(locationData);
    }
  }, []);

  // Start GPS tracking
  const startGPSTracking = useCallback(() => {
    if (isTracking) return;
    
    if (!navigator.geolocation) {
      toast.error(language === 'sr' ? 'GPS nije podržan' : 'GPS not supported');
      return;
    }
    
    setIsTracking(true);
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocationUpdate,
      (error) => {
        console.error('GPS Error:', error);
        toast.error(language === 'sr' ? 'Greška sa GPS-om' : 'GPS Error');
      },
      options
    );
    
    toast.success(language === 'sr' ? 'GPS praćenje aktivno' : 'GPS tracking active');
  }, [isTracking, sendLocationUpdate, language]);

  // Stop GPS tracking
  const stopGPSTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Open navigation app
  const openNavigation = (lat, lng, address) => {
    let googleMapsUrl;
    
    // Use coordinates if available, otherwise use address
    if (lat && lng) {
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else if (address) {
      // Encode address for URL
      const encodedAddress = encodeURIComponent(address);
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    } else {
      toast.error(language === 'sr' ? 'Adresa nije dostupna' : 'Address not available');
      return;
    }
    
    window.open(googleMapsUrl, '_blank');
  };

  // Accept assignment
  const acceptAssignment = async () => {
    if (!assignment) return;
    setUpdatingStatus(true);
    try {
      await axios.post(`${API}/api/driver/accept-assignment/${assignment.id}`);
      setDriverStatus('en_route');
      startGPSTracking();
      toast.success(language === 'sr' ? 'Zadatak prihvaćen! Krećete na put.' : 'Task accepted! Starting route.');
      fetchDriverData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška' : 'Error'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Reject assignment
  const rejectAssignment = async () => {
    if (!assignment) return;
    setUpdatingStatus(true);
    try {
      await axios.post(`${API}/api/driver/reject-assignment/${assignment.id}`);
      setDriverStatus('available');
      setAssignment(null);
      toast.success(language === 'sr' ? 'Zadatak odbijen. Čekate novi zadatak.' : 'Task rejected. Waiting for new task.');
      fetchDriverData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška' : 'Error'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Go online/offline
  const toggleOnline = () => {
    if (driverStatus === 'offline') {
      updateStatus('available');
    } else if (driverStatus === 'available') {
      updateStatus('offline');
    }
  };

  // Track previous assignment to detect new ones
  const prevAssignmentRef = useRef(null);
  const [showNewTaskPopup, setShowNewTaskPopup] = useState(false);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Play 3 beeps
      setTimeout(() => { gainNode.gain.value = 0; }, 200);
      setTimeout(() => { gainNode.gain.value = 0.3; }, 300);
      setTimeout(() => { gainNode.gain.value = 0; }, 500);
      setTimeout(() => { gainNode.gain.value = 0.3; }, 600);
      setTimeout(() => { gainNode.gain.value = 0; }, 800);
      setTimeout(() => { oscillator.stop(); }, 900);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDriverData();
    
    return () => {
      stopGPSTracking();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchDriverData, stopGPSTracking]);

  // Poll for new assignments every 5 seconds when online
  useEffect(() => {
    if (driverStatus === 'offline') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const [profileRes, assignmentRes] = await Promise.all([
          axios.get(`${API}/api/driver/profile`),
          axios.get(`${API}/api/driver/assignment`)
        ]);
        
        const newStatus = profileRes.data.status?.status || 'offline';
        setDriverStatus(newStatus);
        
        if (assignmentRes.data.has_assignment) {
          const newAssignment = assignmentRes.data.assignment;
          
          // Check if this is a NEW assignment (not seen before)
          if (newAssignment && (!prevAssignmentRef.current || prevAssignmentRef.current.id !== newAssignment.id)) {
            // New task received!
            setAssignment(newAssignment);
            prevAssignmentRef.current = newAssignment;
            
            // Show popup and play sound
            setShowNewTaskPopup(true);
            playNotificationSound();
            
            // Also show toast
            toast.success(
              language === 'sr' 
                ? '🚨 NOVI ZADATAK PRIMLJEN!' 
                : '🚨 NEW TASK RECEIVED!',
              { duration: 10000 }
            );
            
            // Try to vibrate the device
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
          } else {
            setAssignment(newAssignment);
          }
        } else {
          setAssignment(null);
          prevAssignmentRef.current = null;
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(pollInterval);
  }, [driverStatus, language, playNotificationSound]);

  // Handle logout
  const handleLogout = () => {
    updateStatus('offline');
    logout();
    navigate('/login');
  };

  // Get current action button based on status
  const getActionButton = () => {
    if (!assignment) return null;
    
    switch (driverStatus) {
      case 'assigned':
        // Show Accept/Reject buttons for new assignments
        return (
          <div className="space-y-3">
            <p className="text-center text-slate-400 text-sm mb-2">
              {language === 'sr' ? 'Novi zadatak čeka vašu potvrdu' : 'New task awaiting your confirmation'}
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={rejectAssignment}
                disabled={updatingStatus}
                className="flex-1 h-16 text-lg font-bold bg-red-600 hover:bg-red-700 gap-2"
                data-testid="reject-assignment-btn"
              >
                {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-6 h-6" />}
                {language === 'sr' ? 'ODBIJ' : 'REJECT'}
              </Button>
              <Button 
                onClick={acceptAssignment}
                disabled={updatingStatus}
                className="flex-1 h-16 text-lg font-bold bg-green-600 hover:bg-green-700 gap-2"
                data-testid="accept-assignment-btn"
              >
                {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                {language === 'sr' ? 'PRIHVATI' : 'ACCEPT'}
              </Button>
            </div>
          </div>
        );
      
      case 'en_route':
        return (
          <Button 
            onClick={() => updateStatus('on_site', assignment.id)}
            disabled={updatingStatus}
            className="w-full h-20 text-xl font-bold bg-amber-600 hover:bg-amber-700 gap-3"
            data-testid="arrived-btn"
          >
            {updatingStatus ? <Loader2 className="w-6 h-6 animate-spin" /> : <MapPin className="w-8 h-8" />}
            {language === 'sr' ? 'STIGAO NA LOKACIJU' : 'ARRIVED AT PICKUP'}
          </Button>
        );
      
      case 'on_site':
        return (
          <Button 
            onClick={() => updateStatus('transporting', assignment.id)}
            disabled={updatingStatus}
            className="w-full h-20 text-xl font-bold bg-red-600 hover:bg-red-700 gap-3"
            data-testid="start-transport-btn"
          >
            {updatingStatus ? <Loader2 className="w-6 h-6 animate-spin" /> : <Truck className="w-8 h-8" />}
            {language === 'sr' ? 'ZAPOČNI TRANSPORT' : 'START TRANSPORT'}
          </Button>
        );
      
      case 'transporting':
        return (
          <Button 
            onClick={completeTransport}
            disabled={updatingStatus}
            className="w-full h-20 text-xl font-bold bg-green-600 hover:bg-green-700 gap-3"
            data-testid="complete-transport-btn"
          >
            {updatingStatus ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-8 h-8" />}
            {language === 'sr' ? 'ZAVRŠI TRANSPORT' : 'COMPLETE TRANSPORT'}
          </Button>
        );
      
      default:
        return null;
    }
  };

  // Get mobility icon/badge
  const getMobilityBadge = (mobility) => {
    const labels = {
      walking: { sr: 'Hoda', en: 'Walking', color: 'bg-green-100 text-green-700' },
      wheelchair: { sr: 'Kolica', en: 'Wheelchair', color: 'bg-amber-100 text-amber-700' },
      stretcher: { sr: 'Nosila', en: 'Stretcher', color: 'bg-red-100 text-red-700' }
    };
    const badge = labels[mobility] || labels.walking;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge[language]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col" data-testid="driver-dashboard">
      {/* NEW TASK POPUP */}
      {showNewTaskPopup && assignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-gradient-to-b from-red-600 to-red-800 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl border-2 border-red-400 animate-in zoom-in-95">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <AlertCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {language === 'sr' ? '🚨 NOVI ZADATAK!' : '🚨 NEW TASK!'}
              </h2>
              <p className="text-red-100 mb-4">
                {language === 'sr' ? 'Primili ste novi zadatak za transport' : 'You have received a new transport task'}
              </p>
              
              <div className="bg-white/10 rounded-lg p-4 mb-4 text-left">
                <p className="text-white font-semibold">{assignment.patient_name}</p>
                {assignment.pickup_address && (
                  <p className="text-red-100 text-sm flex items-center gap-2 mt-2">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{assignment.pickup_address}</span>
                  </p>
                )}
                {assignment.destination_address && (
                  <p className="text-red-100 text-sm flex items-center gap-2 mt-1">
                    <Navigation className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{assignment.destination_address}</span>
                  </p>
                )}
                {assignment.contact_phone && (
                  <p className="text-red-100 text-sm flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{assignment.contact_phone}</span>
                  </p>
                )}
              </div>
              
              {/* Accept and Reject buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setShowNewTaskPopup(false);
                    acceptAssignment();
                  }}
                  className="w-full h-14 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                  data-testid="popup-accept-btn"
                >
                  <ThumbsUp className="w-6 h-6" />
                  {language === 'sr' ? 'PRIHVATI' : 'ACCEPT'}
                </Button>
                
                <Button 
                  onClick={() => {
                    setShowNewTaskPopup(false);
                    rejectAssignment();
                  }}
                  variant="outline"
                  className="w-full h-12 font-semibold border-white/50 text-white hover:bg-white/10 gap-2"
                  data-testid="popup-reject-btn"
                >
                  <ThumbsDown className="w-5 h-5" />
                  {language === 'sr' ? 'ODBIJ' : 'REJECT'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden">
              <img src="/logo.jpg" alt="Paramedic Care 018" className="w-full h-full object-cover" />
            </div>
            <div className={`w-3 h-3 rounded-full ${statusLabels[driverStatus]?.color || 'bg-slate-500'}`} />
            <div>
              <p className="font-semibold">{user?.full_name}</p>
              <p className="text-xs text-slate-400">{statusLabels[driverStatus]?.[language] || driverStatus}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleLanguage} 
              className="text-slate-400 hover:text-emerald-400"
              data-testid="language-toggle"
            >
              <Globe className="w-5 h-5" />
            </Button>
            {/* Connection indicator */}
            {connectionStatus === 'connected' ? (
              <Wifi className="w-5 h-5 text-green-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            {/* GPS indicator */}
            {isTracking && (
              <Compass className="w-5 h-5 text-blue-400 animate-pulse" />
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400" data-testid="driver-logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4">
        {/* Online/Offline Toggle - only show when no assignment */}
        {!assignment && (
          <Button
            onClick={toggleOnline}
            className={`w-full h-16 text-lg font-bold ${
              driverStatus === 'offline' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-slate-600 hover:bg-slate-700'
            }`}
            data-testid={driverStatus === 'offline' ? 'driver-go-online-btn' : 'driver-go-offline-btn'}
          >
            {driverStatus === 'offline' 
              ? (language === 'sr' ? 'PRIJAVI SE NA POSAO' : 'GO ONLINE')
              : (language === 'sr' ? 'ODJAVI SE' : 'GO OFFLINE')
            }
          </Button>
        )}

        {/* No Assignment State */}
        {!assignment && driverStatus === 'available' && (
          <div className="bg-slate-800 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {language === 'sr' ? 'Čekanje na zadatak' : 'Waiting for Assignment'}
            </h2>
            <p className="text-slate-400">
              {language === 'sr' 
                ? 'Bićete obavešteni kada dobijete novi zadatak'
                : 'You will be notified when you get a new task'}
            </p>
          </div>
        )}

        {/* Assignment Card */}
        {assignment && (
          <div className="bg-slate-800 rounded-2xl overflow-hidden">
            {/* Patient Info */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-slate-400" />
                  <span className="text-lg font-semibold">{assignment.patient_name}</span>
                </div>
                {getMobilityBadge(assignment.mobility_status)}
              </div>
              <a 
                href={`tel:${assignment.contact_phone}`}
                className="flex items-center gap-2 text-sky-400 hover:text-sky-300"
              >
                <Phone className="w-4 h-4" />
                {assignment.contact_phone}
              </a>
            </div>

            {/* Pickup Location */}
            <div 
              className="p-4 border-b border-slate-700 cursor-pointer hover:bg-slate-750 active:bg-slate-700 transition-colors"
              onClick={() => openNavigation(assignment.pickup_lat, assignment.pickup_lng, assignment.pickup_address)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-green-400 uppercase tracking-wide font-medium mb-1">
                    {language === 'sr' ? 'PREUZIMANJE' : 'PICKUP'}
                  </p>
                  <p className="text-white font-medium">{assignment.pickup_address}</p>
                </div>
                <Navigation className="w-6 h-6 text-slate-400" />
              </div>
            </div>

            {/* Destination Location */}
            <div 
              className="p-4 cursor-pointer hover:bg-slate-750 active:bg-slate-700 transition-colors"
              onClick={() => openNavigation(assignment.destination_lat, assignment.destination_lng, assignment.destination_address)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-red-400 uppercase tracking-wide font-medium mb-1">
                    {language === 'sr' ? 'ODREDIŠTE' : 'DESTINATION'}
                  </p>
                  <p className="text-white font-medium">{assignment.destination_address}</p>
                </div>
                <Navigation className="w-6 h-6 text-slate-400" />
              </div>
            </div>

            {/* Time */}
            <div className="px-4 py-3 bg-slate-750 flex items-center justify-between text-sm">
              <span className="text-slate-400">{language === 'sr' ? 'Zakazano' : 'Scheduled'}</span>
              <span className="font-medium">{assignment.preferred_date} • {assignment.preferred_time}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        {assignment && (
          <div className="pt-2">
            {getActionButton()}
          </div>
        )}

        {/* GPS Status (when tracking) */}
        {isTracking && lastLocation && (
          <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Compass className="w-4 h-4 text-blue-400" />
              <span>{language === 'sr' ? 'GPS aktivan' : 'GPS active'}</span>
            </div>
            <div className="text-slate-500">
              {lastLocation.speed ? `${Math.round(lastLocation.speed)} km/h` : '—'}
            </div>
          </div>
        )}
      </main>

      {/* FULL SCREEN MAP - Shows automatically during transport */}
      {assignment && showFullScreenMap && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col" data-testid="fullscreen-map">
          {/* Map Header */}
          <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <div>
                <p className="text-white font-semibold text-sm">
                  {language === 'sr' ? 'U TRANSPORTU' : 'TRANSPORTING'}
                </p>
                <p className="text-slate-400 text-xs truncate max-w-[200px]">
                  → {assignment.destination_address}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-400 text-right">
              <p>{language === 'sr' ? 'Ekran aktivan' : 'Screen active'}</p>
              {lastLocation?.speed && (
                <p className="text-white">{Math.round(lastLocation.speed)} km/h</p>
              )}
            </div>
          </div>
          
          {/* Full Screen Map */}
          <div className="flex-1">
            <MapContainer
              center={[
                lastLocation?.latitude || assignment.destination_lat || 43.3209,
                lastLocation?.longitude || assignment.destination_lng || 21.8958
              ]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Driver's current location */}
              {lastLocation && (
                <Marker 
                  position={[lastLocation.latitude, lastLocation.longitude]} 
                  icon={driverIcon}
                >
                  <Popup>
                    <div className="text-center">
                      <strong>{language === 'sr' ? 'Vaša lokacija' : 'Your location'}</strong>
                      {lastLocation.speed && (
                        <div className="text-sm">{Math.round(lastLocation.speed)} km/h</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Destination marker */}
              {(assignment.destination_lat && assignment.destination_lng) && (
                <Marker 
                  position={[assignment.destination_lat, assignment.destination_lng]} 
                  icon={destinationIcon}
                >
                  <Popup>
                    <div className="text-center">
                      <strong>{language === 'sr' ? 'Odredište' : 'Destination'}</strong>
                      <div className="text-sm">{assignment.destination_address}</div>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Line from driver to destination */}
              {lastLocation && assignment.destination_lat && assignment.destination_lng && (
                <Polyline
                  positions={[
                    [lastLocation.latitude, lastLocation.longitude],
                    [assignment.destination_lat, assignment.destination_lng]
                  ]}
                  color="#3b82f6"
                  weight={4}
                  opacity={0.7}
                  dashArray="10, 10"
                />
              )}
              
              <MapBoundsUpdater 
                driverLocation={lastLocation}
                destination={
                  assignment.destination_lat && assignment.destination_lng
                    ? { lat: assignment.destination_lat, lng: assignment.destination_lng }
                    : null
                }
              />
            </MapContainer>
          </div>
          
          {/* Bottom Action Buttons */}
          <div className="bg-slate-800 p-4 space-y-3 border-t border-slate-700">
            {/* Open in Google Maps */}
            <Button
              onClick={() => openNavigation(assignment.destination_lat, assignment.destination_lng, assignment.destination_address)}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Navigation className="w-5 h-5" />
              {language === 'sr' ? 'OTVORI U GOOGLE MAPS' : 'OPEN IN GOOGLE MAPS'}
            </Button>
            
            {/* Complete Transport Button */}
            <Button
              onClick={completeTransport}
              disabled={updatingStatus}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 gap-2 text-lg font-bold"
              data-testid="complete-transport-btn"
            >
              {updatingStatus ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <CheckCircle className="w-6 h-6" />
              )}
              {language === 'sr' ? 'ZAVRŠI TRANSPORT' : 'COMPLETE TRANSPORT'}
            </Button>
          </div>
        </div>
      )}

      {/* Footer with emergency */}
      <footer className="bg-slate-800 border-t border-slate-700 p-4">
        <a href="tel:+381181234567" className="block" data-testid="driver-emergency-link">
          <Button variant="outline" className="w-full border-red-600 text-red-400 hover:bg-red-950 gap-2">
            <AlertCircle className="w-5 h-5" />
            {language === 'sr' ? 'HITNA POMOĆ: +381 18 123 456' : 'EMERGENCY: +381 18 123 456'}
          </Button>
        </a>
      </footer>
    </div>
  );
};

export default DriverDashboard;
