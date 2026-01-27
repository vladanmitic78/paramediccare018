import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { usePWA } from '../contexts/PWAContext';
import {
  Truck,
  MapPin,
  Navigation,
  Phone,
  PhoneOff,
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
  Heart,
  Thermometer,
  ThumbsUp,
  ThumbsDown,
  Play,
  Square,
  Bell,
  Home,
  Settings,
  ClipboardList,
  Stethoscope,
  Plus,
  Minimize2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Copy,
  ExternalLink,
  Download,
  Menu,
  CalendarDays,
  LayoutDashboard,
  FileText,
  Car
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Push notification utilities
const usePushNotifications = () => {
  // Check iOS and standalone on initial render
  const isIOS = typeof window !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
  
  const isSupported = typeof window !== 'undefined' && 
    'Notification' in window && 
    'serviceWorker' in navigator;

  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const requestPermission = async () => {
    if (!isSupported) {
      return { success: false, reason: 'not_supported' };
    }

    // iOS requires PWA to be installed first
    if (isIOS && !isStandalone) {
      return { success: false, reason: 'ios_not_installed' };
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Register service worker if not already
        await registerServiceWorker();
        return { success: true };
      }
      
      return { success: false, reason: result };
    } catch (error) {
      console.error('Push permission error:', error);
      return { success: false, reason: 'error', error };
    }
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration.scope);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  };

  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      const result = await requestPermission();
      if (!result.success) return result;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active.postMessage({
        type: 'TEST_NOTIFICATION',
        body: 'Push notifications are working! 🚑'
      });
      return { success: true };
    } catch (error) {
      console.error('Test notification error:', error);
      return { success: false, error };
    }
  };

  return {
    permission,
    isSupported,
    isIOS,
    isStandalone,
    requestPermission,
    sendTestNotification,
    canRequestPermission: isSupported && (!isIOS || isStandalone)
  };
};

// Custom hook for PWA manifest
const usePWAManifest = () => {
  useEffect(() => {
    const manifestLink = document.getElementById('pwa-manifest');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const originalManifest = manifestLink?.href;
    const originalThemeColor = themeColorMeta?.content;
    
    document.title = 'PC018 Mobile - Paramedic Care 018';
    if (manifestLink) manifestLink.href = '/manifest-mobile.json';
    if (themeColorMeta) themeColorMeta.content = '#0f172a';
    
    return () => {
      document.title = 'Paramedic Care 018';
      if (manifestLink && originalManifest) manifestLink.href = originalManifest;
      if (themeColorMeta && originalThemeColor) themeColorMeta.content = originalThemeColor;
    };
  }, []);
};

// Wake Lock hook
const useWakeLock = (enabled) => {
  const wakeLockRef = useRef(null);
  
  useEffect(() => {
    const requestWakeLock = async () => {
      if (enabled && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('Wake Lock error:', err.message);
        }
      }
    };
    
    if (enabled) {
      requestWakeLock();
      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && enabled) requestWakeLock();
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        if (wakeLockRef.current) wakeLockRef.current.release();
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [enabled]);
};

// State persistence hook - saves app state to localStorage so it survives calls/interruptions
const useStatePersistence = (key, state, enabled) => {
  useEffect(() => {
    if (enabled && state) {
      try {
        sessionStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        console.log('State persistence error:', e);
      }
    }
  }, [key, state, enabled]);
};

// Restore state from session storage
const getPersistedState = (key) => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

// Map icons
const driverIcon = new L.DivIcon({
  className: 'driver-marker',
  html: `<div style="background: #3b82f6; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
    <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const destinationIcon = new L.DivIcon({
  className: 'destination-marker',
  html: `<div style="background: #ef4444; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

// Map bounds updater
const MapBoundsUpdater = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);
  return null;
};

// Status configurations
const statusConfig = {
  pending: { label: { sr: 'Čeka', en: 'Pending' }, color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-500' },
  confirmed: { label: { sr: 'Potvrđeno', en: 'Confirmed' }, color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50', border: 'border-blue-500' },
  en_route: { label: { sr: 'Na putu', en: 'En Route' }, color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50', border: 'border-purple-500', pulse: true },
  on_site: { label: { sr: 'Na lokaciji', en: 'On Site' }, color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50', border: 'border-orange-500', pulse: true },
  transporting: { label: { sr: 'U transportu', en: 'Transporting' }, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50', border: 'border-emerald-500', pulse: true },
  completed: { label: { sr: 'Završeno', en: 'Completed' }, color: 'bg-slate-400', textColor: 'text-slate-700', bgLight: 'bg-slate-50', border: 'border-slate-400' }
};

const UnifiedPWA = () => {
  usePWAManifest();
  const pushNotifications = usePushNotifications();
  const pwaInstall = usePWA();
  
  const { language, toggleLanguage } = useLanguage();
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to login if not authenticated (after auth has loaded)
  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;
    
    // If no user after auth finished loading, redirect to login
    if (user === null) {
      navigate('/login');
    }
  }, [user, navigate, authLoading]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [fetchError, setFetchError] = useState(null);
  const [showNotificationSetup, setShowNotificationSetup] = useState(false);
  
  // Burger menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFutureBookings, setShowFutureBookings] = useState(false);
  const [futureBookings, setFutureBookings] = useState([]);
  const [loadingFutureBookings, setLoadingFutureBookings] = useState(false);
  
  // Set a timeout to prevent infinite loading - if data doesn't load in 10s, show error state
  useEffect(() => {
    if (loading && user?.role) {
      const timeout = setTimeout(() => {
        if (loading) {
          console.error('Loading timeout - data fetch took too long');
          setLoading(false);
          setFetchError('Connection timeout. Please check your internet connection.');
        }
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [loading, user?.role]);
  
  // Shared state
  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  
  // Driver-specific state
  const [driverStatus, setDriverStatus] = useState('offline');
  const [assignment, setAssignment] = useState(null);
  const [lastLocation, setLastLocation] = useState(null);
  const [showNewTaskPopup, setShowNewTaskPopup] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [nearPickup, setNearPickup] = useState(false);
  const [distanceToPickup, setDistanceToPickup] = useState(null);
  const prevAssignmentRef = useRef(null);
  const watchIdRef = useRef(null);
  
  // Call state - for floating call interface
  const [activeCall, setActiveCall] = useState(null);
  const [callMinimized, setCallMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef(null);
  
  // Video call state
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [videoCallRoom, setVideoCallRoom] = useState(null);
  const [videoCallParticipants, setVideoCallParticipants] = useState([]);
  const [recentVideoCalls, setRecentVideoCalls] = useState([]);
  
  // Admin-specific state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  
  // Medical-specific state
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vitals, setVitals] = useState({
    heart_rate: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    temperature: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    notes: ''
  });
  const [savingVitals, setSavingVitals] = useState(false);
  
  // Role checks
  const isDriver = user?.role === 'driver';
  const isMedical = ['doctor', 'nurse'].includes(user?.role);
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  
  // Keep screen awake during active transport (driver) or during a call
  const isActiveTransport = ['en_route', 'on_site', 'transporting'].includes(driverStatus);
  useWakeLock((isDriver && isActiveTransport) || activeCall !== null);

  // Persist critical state to survive phone calls and app switches
  useStatePersistence('pwa_driver_state', {
    driverStatus,
    assignment,
    showRouteMap,
    routeCoordinates,
    lastLocation
  }, isDriver && isActiveTransport);

  // Restore state on mount (after coming back from a phone call)
  useEffect(() => {
    if (isDriver) {
      const savedState = getPersistedState('pwa_driver_state');
      if (savedState) {
        if (savedState.showRouteMap) setShowRouteMap(true);
        if (savedState.routeCoordinates?.length > 0) setRouteCoordinates(savedState.routeCoordinates);
        if (savedState.lastLocation) setLastLocation(savedState.lastLocation);
      }
    }
  }, [isDriver]);

  // Call timer
  useEffect(() => {
    if (activeCall && !callTimerRef.current) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else if (!activeCall && callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [activeCall]);

  // Format call duration
  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start in-app call (minimizable)
  const startCall = (phoneNumber, contactName) => {
    setActiveCall({ phoneNumber, contactName, startTime: Date.now() });
    setCallMinimized(true);
    // Open native phone dialer
    window.location.href = `tel:${phoneNumber}`;
  };

  // End call
  const endCall = () => {
    setActiveCall(null);
    setCallMinimized(false);
    setCallDuration(0);
  };

  // ============ VIDEO CALL FUNCTIONS ============
  
  // Generate a unique room ID for video calls
  const generateVideoRoomId = (context = 'general') => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const prefix = 'PC018';
    return `${prefix}-${context}-${timestamp}-${random}`.toUpperCase();
  };

  // Start a new video call
  const startVideoCall = (contextName, participants = []) => {
    const roomId = generateVideoRoomId(contextName?.replace(/\s+/g, '') || 'call');
    setVideoCallRoom({
      id: roomId,
      name: contextName || (language === 'sr' ? 'Video poziv' : 'Video Call'),
      startedAt: new Date().toISOString(),
      startedBy: user?.full_name
    });
    setVideoCallParticipants(participants);
    setShowVideoCallModal(true);
    
    // Save to recent calls
    setRecentVideoCalls(prev => [{
      id: roomId,
      name: contextName,
      startedAt: new Date().toISOString()
    }, ...prev.slice(0, 4)]);
  };

  // Join an existing video call
  const joinVideoCall = (roomId, roomName) => {
    setVideoCallRoom({
      id: roomId,
      name: roomName || (language === 'sr' ? 'Video poziv' : 'Video Call'),
      joinedAt: new Date().toISOString()
    });
    setShowVideoCallModal(true);
  };

  // Open Jitsi Meet in new window/tab
  const openJitsiCall = () => {
    if (!videoCallRoom?.id) return;
    const displayName = encodeURIComponent(user?.full_name || 'User');
    const jitsiUrl = `https://meet.jit.si/${videoCallRoom.id}#userInfo.displayName="${displayName}"&config.prejoinPageEnabled=false`;
    window.open(jitsiUrl, '_blank', 'width=1200,height=800,menubar=no,toolbar=no');
  };

  // Copy room link to clipboard
  const copyVideoCallLink = () => {
    if (!videoCallRoom?.id) return;
    const link = `https://meet.jit.si/${videoCallRoom.id}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success(language === 'sr' ? 'Link kopiran!' : 'Link copied!');
    });
  };

  // Quick video call to a specific person
  const quickVideoCall = (personName, personRole) => {
    const contextName = `${personName} - ${personRole}`;
    startVideoCall(contextName, [{ name: personName, role: personRole }]);
  };

  // Fetch data based on role
  const fetchData = useCallback(async (isRefresh = false, retryCount = 0) => {
    if (isRefresh) setRefreshing(true);
    setFetchError(null);
    
    try {
      console.log('[PWA] Fetching data for role:', user?.role, 'isDriver:', isDriver);
      
      if (isDriver) {
        // Driver: fetch profile and assignment
        const [profileRes, assignmentRes] = await Promise.all([
          axios.get(`${API}/api/driver/profile`),
          axios.get(`${API}/api/driver/assignment`)
        ]);
        
        console.log('[PWA] Driver profile response:', profileRes.data);
        setDriverStatus(profileRes.data.status?.status || 'offline');
        
        if (assignmentRes.data.has_assignment) {
          const newAssignment = assignmentRes.data.assignment;
          // Check if this is a NEW assignment
          if (!prevAssignmentRef.current || prevAssignmentRef.current.id !== newAssignment.id) {
            if (prevAssignmentRef.current !== null) {
              setShowNewTaskPopup(true);
              // Audio/vibration alert
              try {
                if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
              } catch (e) {
                // Vibration failed - ignore
              }
            }
            prevAssignmentRef.current = newAssignment;
          }
          setAssignment(newAssignment);
        } else {
          setAssignment(null);
          prevAssignmentRef.current = null;
        }
      } else {
        // Admin/Medical: fetch bookings and optionally drivers
        // Note: /api/users requires admin role, so medical staff only get bookings
        const fetchPromises = [axios.get(`${API}/api/bookings`)];
        
        // Only admins can fetch all users
        if (isAdmin) {
          fetchPromises.push(axios.get(`${API}/api/users`));
        }
        
        const results = await Promise.all(fetchPromises);
        
        const bookingsData = Array.isArray(results[0].data) ? results[0].data : [];
        setBookings(bookingsData);
        
        // Set drivers only if admin fetched users
        if (isAdmin && results[1]) {
          const usersData = Array.isArray(results[1].data) ? results[1].data : [];
          setDrivers(usersData.filter(u => u.role === 'driver'));
        } else {
          setDrivers([]);
        }
      }
      
      if (isRefresh) toast.success(language === 'sr' ? 'Osveženo!' : 'Refreshed!');
    } catch (error) {
      console.error('[PWA] Error fetching data:', error);
      
      // More descriptive error messages
      let errorMsg = 'Failed to load data';
      if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
        errorMsg = language === 'sr' ? 'Nema internet konekcije' : 'No internet connection';
      } else if (error.response?.status === 401) {
        errorMsg = language === 'sr' ? 'Sesija je istekla' : 'Session expired';
      } else if (error.response?.status === 403) {
        errorMsg = language === 'sr' ? 'Pristup odbijen' : 'Access denied';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setFetchError(errorMsg);
      
      // Retry up to 3 times with exponential backoff (only for network errors)
      if (retryCount < 3 && !isRefresh && (error.code === 'ERR_NETWORK' || error.message?.includes('Network'))) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[PWA] Retrying in ${delay}ms (attempt ${retryCount + 1})`);
        setTimeout(() => fetchData(false, retryCount + 1), delay);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDriver, isAdmin, language, user?.role]);

  useEffect(() => {
    // Don't fetch until we know the user's role
    if (!user?.role) return;
    
    fetchData();
    const interval = setInterval(() => fetchData(), 5000);
    return () => clearInterval(interval);
  }, [fetchData, user?.role]);

  // GPS tracking for drivers
  useEffect(() => {
    if (isDriver && isActiveTransport && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setLastLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed ? position.coords.speed * 3.6 : null
          });
        },
        (error) => console.error('GPS error:', error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return () => {
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      };
    }
  }, [isDriver, isActiveTransport]);

  // Handle visibility change - restore wake lock and refresh data when coming back from a call
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App is back in foreground (e.g., after a phone call)
        fetchData();
        // Re-request wake lock
        if ((isDriver && isActiveTransport) || activeCall !== null) {
          if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').catch(() => {});
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isDriver, isActiveTransport, activeCall, fetchData]);

  // Fetch future bookings for the menu
  const fetchFutureBookings = async () => {
    setLoadingFutureBookings(true);
    try {
      const response = await axios.get(`${API}/api/bookings`);
      const allBookings = Array.isArray(response.data) ? response.data : [];
      
      // Filter for upcoming/active bookings
      const now = new Date();
      const upcoming = allBookings.filter(b => {
        const bookingDate = new Date(b.scheduled_date || b.created_at);
        const isUpcoming = bookingDate >= now || ['pending', 'confirmed', 'en_route', 'on_site', 'transporting'].includes(b.status);
        return isUpcoming;
      }).sort((a, b) => {
        const dateA = new Date(a.scheduled_date || a.created_at);
        const dateB = new Date(b.scheduled_date || b.created_at);
        return dateA - dateB;
      }).slice(0, 10);
      
      setFutureBookings(upcoming);
    } catch (error) {
      console.error('Error fetching future bookings:', error);
      setFutureBookings([]);
    } finally {
      setLoadingFutureBookings(false);
    }
  };

  // Fetch future bookings when menu section is expanded
  useEffect(() => {
    if (showFutureBookings && menuOpen) {
      fetchFutureBookings();
    }
  }, [showFutureBookings, menuOpen]);

  // Format booking date for display
  const formatBookingDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get booking status color for menu
  const getBookingStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      en_route: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      on_site: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      transporting: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      completed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  // Get booking status label
  const getBookingStatusLabel = (status) => {
    const labels = {
      pending: language === 'sr' ? 'Na čekanju' : 'Pending',
      confirmed: language === 'sr' ? 'Potvrđeno' : 'Confirmed',
      en_route: language === 'sr' ? 'Na putu' : 'En Route',
      on_site: language === 'sr' ? 'Na lokaciji' : 'On Site',
      transporting: language === 'sr' ? 'U transportu' : 'Transporting',
      completed: language === 'sr' ? 'Završeno' : 'Completed',
      cancelled: language === 'sr' ? 'Otkazano' : 'Cancelled'
    };
    return labels[status] || status;
  };

  // Driver actions
  const acceptAssignment = async () => {
    if (!assignment) return;
    setUpdatingStatus(true);
    try {
      await axios.post(`${API}/api/driver/accept-assignment/${assignment.id}`);
      toast.success(language === 'sr' ? 'Zadatak prihvaćen!' : 'Task accepted!');
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const rejectAssignment = async () => {
    if (!assignment) return;
    setUpdatingStatus(true);
    try {
      await axios.post(`${API}/api/driver/reject-assignment/${assignment.id}`);
      toast.success(language === 'sr' ? 'Zadatak odbijen' : 'Task rejected');
      setAssignment(null);
      prevAssignmentRef.current = null;
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateDriverStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await axios.put(`${API}/api/driver/status`, {
        status: newStatus,
        booking_id: assignment?.id
      });
      setDriverStatus(newStatus);
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const completeTransport = async () => {
    if (!assignment) return;
    setUpdatingStatus(true);
    try {
      await axios.post(`${API}/api/driver/complete-transport/${assignment.id}`);
      toast.success(language === 'sr' ? 'Transport završen!' : 'Transport completed!');
      setAssignment(null);
      prevAssignmentRef.current = null;
      setDriverStatus('available');
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Calculate distance between two points in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Fetch route from OSRM
  const fetchRoute = async (startLat, startLng, endLat, endLng) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRouteCoordinates(coords);
        return coords;
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
    return [];
  };

  // Start route with map - called when driver clicks "Start Route"
  const startRouteWithMap = async () => {
    if (!assignment) return;
    
    setUpdatingStatus(true);
    try {
      // Update status to en_route
      await axios.put(`${API}/api/driver/status`, {
        status: 'en_route',
        booking_id: assignment?.id
      });
      setDriverStatus('en_route');
      
      // Get current location and fetch route
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setLastLocation({ latitude, longitude });
            
            // Get pickup coordinates
            const pickupLat = assignment.start_coords?.lat || assignment.pickup_lat;
            const pickupLng = assignment.start_coords?.lng || assignment.pickup_lng;
            
            if (pickupLat && pickupLng) {
              await fetchRoute(latitude, longitude, pickupLat, pickupLng);
            }
            
            // Show full-screen map
            setShowRouteMap(true);
          },
          (error) => {
            console.error('Geolocation error:', error);
            setShowRouteMap(true); // Still show map even without location
          },
          { enableHighAccuracy: true }
        );
      } else {
        setShowRouteMap(true);
      }
      
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Check proximity to pickup location
  useEffect(() => {
    if (isDriver && driverStatus === 'en_route' && lastLocation && assignment) {
      const pickupLat = assignment.start_coords?.lat || assignment.pickup_lat;
      const pickupLng = assignment.start_coords?.lng || assignment.pickup_lng;
      
      if (pickupLat && pickupLng && lastLocation.latitude && lastLocation.longitude) {
        const distance = calculateDistance(
          lastLocation.latitude, lastLocation.longitude,
          pickupLat, pickupLng
        );
        setDistanceToPickup(Math.round(distance));
        
        // Consider "near" if within 100 meters
        if (distance < 100) {
          setNearPickup(true);
          // Vibrate to alert driver
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        } else {
          setNearPickup(false);
        }
      }
    }
  }, [isDriver, driverStatus, lastLocation, assignment]);

  // Update route when location changes during en_route
  useEffect(() => {
    if (isDriver && driverStatus === 'en_route' && showRouteMap && lastLocation && assignment) {
      const pickupLat = assignment.start_coords?.lat || assignment.pickup_lat;
      const pickupLng = assignment.start_coords?.lng || assignment.pickup_lng;
      
      if (pickupLat && pickupLng && lastLocation.latitude && lastLocation.longitude) {
        // Throttle route updates - only fetch every 30 seconds
        const now = Date.now();
        if (!window.lastRouteUpdate || now - window.lastRouteUpdate > 30000) {
          window.lastRouteUpdate = now;
          fetchRoute(lastLocation.latitude, lastLocation.longitude, pickupLat, pickupLng);
        }
      }
    }
  }, [isDriver, driverStatus, showRouteMap, lastLocation, assignment]);

  const openNavigation = (lat, lng, address) => {
    let url;
    if (lat && lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else if (address) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    } else {
      toast.error(language === 'sr' ? 'Adresa nije dostupna' : 'Address not available');
      return;
    }
    window.open(url, '_blank');
  };

  // Admin actions
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
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška' : 'Error'));
    } finally {
      setAssigning(false);
    }
  };

  // Medical actions
  const saveVitals = async () => {
    if (!selectedPatient) return;
    setSavingVitals(true);
    try {
      await axios.post(`${API}/api/medical/vitals`, {
        booking_id: selectedPatient.id,
        patient_name: selectedPatient.patient_name,
        ...vitals,
        recorded_by: user?.full_name,
        recorded_at: new Date().toISOString()
      });
      toast.success(language === 'sr' ? 'Vitalni znaci sačuvani!' : 'Vitals saved!');
      setShowVitalsModal(false);
      setSelectedPatient(null);
      setVitals({
        heart_rate: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        temperature: '',
        oxygen_saturation: '',
        respiratory_rate: '',
        notes: ''
      });
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri čuvanju' : 'Error saving');
    } finally {
      setSavingVitals(false);
    }
  };

  // Check for critical vitals
  const checkCriticalVitals = (v) => {
    const alerts = [];
    if (v.heart_rate && (v.heart_rate < 50 || v.heart_rate > 120)) alerts.push('HR');
    if (v.oxygen_saturation && v.oxygen_saturation < 92) alerts.push('SpO2');
    if (v.blood_pressure_systolic && (v.blood_pressure_systolic < 90 || v.blood_pressure_systolic > 180)) alerts.push('BP');
    if (v.temperature && (v.temperature < 35 || v.temperature > 39)) alerts.push('Temp');
    return alerts;
  };

  // Logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Computed values
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const activeBookings = bookings.filter(b => ['confirmed', 'en_route', 'on_site', 'transporting'].includes(b.status));
  const availableDrivers = drivers.filter(d => !bookings.some(b => b.assigned_driver === d.id && ['confirmed', 'en_route', 'on_site', 'transporting'].includes(b.status)));

  // Get role label
  const getRoleLabel = () => {
    const labels = {
      driver: { sr: 'Vozač', en: 'Driver' },
      doctor: { sr: 'Lekar', en: 'Doctor' },
      nurse: { sr: 'Medicinska sestra', en: 'Nurse' },
      admin: { sr: 'Administrator', en: 'Admin' },
      superadmin: { sr: 'Super Admin', en: 'Super Admin' }
    };
    return labels[user?.role]?.[language] || user?.role;
  };

  // Get status label
  const getDriverStatusLabel = () => {
    const labels = {
      offline: { sr: 'Odjavljeni', en: 'Offline' },
      available: { sr: 'Dostupan', en: 'Available' },
      assigned: { sr: 'Dodeljen', en: 'Assigned' },
      en_route: { sr: 'Na putu', en: 'En Route' },
      on_site: { sr: 'Na lokaciji', en: 'On Site' },
      transporting: { sr: 'U transportu', en: 'Transporting' }
    };
    return labels[driverStatus]?.[language] || driverStatus;
  };

  const getStatusColor = () => {
    const colors = {
      offline: 'bg-slate-500',
      available: 'bg-emerald-500',
      assigned: 'bg-blue-500',
      en_route: 'bg-purple-500',
      on_site: 'bg-orange-500',
      transporting: 'bg-emerald-500'
    };
    return colors[driverStatus] || 'bg-slate-500';
  };

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
        <p className="text-slate-400 mt-4 text-sm">{language === 'sr' ? 'Provera prijave...' : 'Checking login...'}</p>
      </div>
    );
  }
  
  // If auth finished but no user, we'll be redirected by the useEffect above
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
        <p className="text-slate-400 mt-4 text-sm">{language === 'sr' ? 'Preusmeravanje...' : 'Redirecting...'}</p>
      </div>
    );
  }
  
  // Show loading while fetching data (but only if we haven't hit an error)
  if (loading && !fetchError) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
        <p className="text-slate-400 mt-4 text-sm">{language === 'sr' ? 'Učitavanje podataka...' : 'Loading data...'}</p>
      </div>
    );
  }
  
  // Show full-screen error if initial data fetch failed
  if (fetchError && !bookings.length && !assignment) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 mb-4 text-red-400" />
        <h3 className="text-lg font-semibold text-red-400 mb-2 text-center">
          {language === 'sr' ? 'Greška pri učitavanju' : 'Failed to load'}
        </h3>
        <p className="text-slate-400 mb-6 text-sm text-center max-w-xs">{fetchError}</p>
        <div className="flex gap-3">
          <Button 
            onClick={() => { setFetchError(null); setLoading(true); fetchData(); }}
            className="bg-sky-600 hover:bg-sky-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'sr' ? 'Pokušaj ponovo' : 'Try Again'}
          </Button>
          <Button 
            variant="outline"
            onClick={handleLogout}
            className="border-slate-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {language === 'sr' ? 'Odjava' : 'Logout'}
          </Button>
        </div>
      </div>
    );
  }

  // Driver full-screen map during transport
  if (isDriver && driverStatus === 'transporting' && assignment) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col" data-testid="driver-transport-map">
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
            {lastLocation?.speed && <p className="text-white">{Math.round(lastLocation.speed)} km/h</p>}
          </div>
        </div>
        
        <div className="flex-1">
          <MapContainer
            center={[lastLocation?.latitude || assignment.destination_lat || 43.3209, lastLocation?.longitude || assignment.destination_lng || 21.8958]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {lastLocation?.latitude && lastLocation?.longitude && (
              <Marker position={[lastLocation.latitude, lastLocation.longitude]} icon={driverIcon} />
            )}
            {assignment.destination_lat && assignment.destination_lng && (
              <Marker position={[assignment.destination_lat, assignment.destination_lng]} icon={destinationIcon} />
            )}
            {lastLocation?.latitude && lastLocation?.longitude && assignment.destination_lat && assignment.destination_lng && (
              <Polyline positions={[[lastLocation.latitude, lastLocation.longitude], [assignment.destination_lat, assignment.destination_lng]]} color="#3b82f6" weight={4} dashArray="10, 10" />
            )}
          </MapContainer>
        </div>
        
        <div className="bg-slate-800 p-4 space-y-3 border-t border-slate-700">
          <Button onClick={() => openNavigation(assignment.destination_lat, assignment.destination_lng, assignment.destination_address)} className="w-full h-12 bg-blue-600 hover:bg-blue-700 gap-2">
            <Navigation className="w-5 h-5" />
            {language === 'sr' ? 'GOOGLE MAPS' : 'GOOGLE MAPS'}
          </Button>
          <Button onClick={completeTransport} disabled={updatingStatus} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 gap-2 text-lg font-bold">
            {updatingStatus ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
            {language === 'sr' ? 'ZAVRŠI TRANSPORT' : 'COMPLETE TRANSPORT'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col" data-testid="unified-pwa">
      {/* New Task Popup for Drivers */}
      {isDriver && showNewTaskPopup && assignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-red-600 to-red-800 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl border-2 border-red-400">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <AlertCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">🚨 {language === 'sr' ? 'NOVI ZADATAK!' : 'NEW TASK!'}</h2>
              <div className="bg-white/10 rounded-lg p-4 mb-4 text-left">
                <p className="text-white font-semibold">{assignment.patient_name}</p>
                {assignment.pickup_address && <p className="text-red-100 text-sm mt-2"><MapPin className="w-4 h-4 inline mr-1" />{assignment.pickup_address}</p>}
                {assignment.destination_address && <p className="text-red-100 text-sm mt-1"><Navigation className="w-4 h-4 inline mr-1" />{assignment.destination_address}</p>}
              </div>
              <div className="space-y-3">
                <Button onClick={() => { setShowNewTaskPopup(false); acceptAssignment(); }} className="w-full h-14 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 gap-2">
                  <ThumbsUp className="w-6 h-6" />{language === 'sr' ? 'PRIHVATI' : 'ACCEPT'}
                </Button>
                <Button onClick={() => { setShowNewTaskPopup(false); rejectAssignment(); }} variant="outline" className="w-full h-12 border-white/50 text-white hover:bg-white/10 gap-2">
                  <ThumbsDown className="w-5 h-5" />{language === 'sr' ? 'ODBIJ' : 'REJECT'}
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
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <img src="/logo.jpg" alt="PC018" className="w-full h-full object-cover" />
                </div>
            <div>
              <p className="font-semibold text-sm">{user?.full_name}</p>
              <div className="flex items-center gap-2">
                <Badge className={`text-[10px] ${isDriver ? getStatusColor() : 'bg-sky-600'}`}>
                  {isDriver ? getDriverStatusLabel() : getRoleLabel()}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* PWA Install Button - Show only when installable */}
            {pwaInstall.isInstallable && !pwaInstall.isInstalled && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={pwaInstall.promptInstall}
                className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/20 relative animate-pulse"
                data-testid="pwa-install-header-btn"
              >
                <Download className="w-5 h-5" />
              </Button>
            )}
            {/* Video Call Button - Quick Access */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowVideoCallModal(true)} 
              className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 relative"
              data-testid="video-call-header-btn"
            >
              <Video className="w-5 h-5" />
            </Button>
            {/* Notification Bell */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowNotificationSetup(true)}
              className={`relative ${pushNotifications.permission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}`}
              data-testid="notification-btn"
            >
              <Bell className="w-5 h-5" />
              {pushNotifications.permission !== 'granted' && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fetchData(true)} disabled={refreshing} className="text-slate-400">
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            {/* Burger Menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-slate-400 hover:text-white"
                  data-testid="pwa-burger-menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] bg-slate-900 border-slate-700 p-0 text-white">
                <SheetHeader className="p-4 border-b border-slate-700 bg-slate-800">
                  <SheetTitle className="flex items-center gap-3 text-white">
                    <div className="w-10 h-10 rounded-lg overflow-hidden">
                      <img src="/logo.jpg" alt="PC018" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">PC018</p>
                      <p className="text-xs text-slate-400 font-normal">{language === 'sr' ? 'Mobilna aplikacija' : 'Mobile App'}</p>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col h-[calc(100vh-80px)] overflow-y-auto">
                  {/* User Profile Section */}
                  <div className="p-4 bg-gradient-to-r from-sky-900/50 to-indigo-900/50 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-sky-600 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {user?.full_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{user?.full_name}</p>
                        <Badge className={`text-[10px] mt-1 ${isDriver ? getStatusColor() : 'bg-sky-600'}`}>
                          {isDriver ? getDriverStatusLabel() : getRoleLabel()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-4 border-b border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      {language === 'sr' ? 'Brze akcije' : 'Quick Actions'}
                    </p>
                    <div className="space-y-2">
                      {/* Future Bookings */}
                      <button
                        onClick={() => setShowFutureBookings(!showFutureBookings)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                        data-testid="pwa-menu-bookings"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-sky-600/20 flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-sky-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-white">
                              {language === 'sr' ? 'Buduće rezervacije' : 'Future Bookings'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {language === 'sr' ? 'Pregled zakazanih vožnji' : 'View scheduled transports'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${showFutureBookings ? 'rotate-90' : ''}`} />
                      </button>

                      {/* Future Bookings Panel */}
                      {showFutureBookings && (
                        <div className="ml-4 pl-4 border-l-2 border-sky-600/30 space-y-2 py-2">
                          {loadingFutureBookings ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                            </div>
                          ) : futureBookings.length > 0 ? (
                            <>
                              {futureBookings.map((booking, idx) => (
                                <div 
                                  key={booking.id || idx}
                                  className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <p className="font-medium text-white text-sm truncate flex-1 mr-2">
                                      {booking.patient_name || 'Transport'}
                                    </p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getBookingStatusColor(booking.status)}`}>
                                      {getBookingStatusLabel(booking.status)}
                                    </span>
                                  </div>
                                  {(booking.scheduled_date || booking.pickup_time) && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                                      <Clock className="w-3 h-3" />
                                      {formatBookingDateTime(booking.scheduled_date || booking.pickup_time)}
                                    </div>
                                  )}
                                  {(booking.pickup_address || booking.start_point) && (
                                    <div className="flex items-start gap-1.5 text-xs text-slate-400">
                                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-emerald-400" />
                                      <span className="line-clamp-1">{booking.pickup_address || booking.start_point}</span>
                                    </div>
                                  )}
                                  {(booking.destination_address || booking.end_point) && (
                                    <div className="flex items-start gap-1.5 text-xs text-slate-400 mt-1">
                                      <Navigation className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-400" />
                                      <span className="line-clamp-1">{booking.destination_address || booking.end_point}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                              <button 
                                onClick={() => { setMenuOpen(false); setActiveTab('home'); }}
                                className="w-full text-center text-sm text-sky-400 hover:text-sky-300 font-medium py-2"
                              >
                                {language === 'sr' ? 'Prikaži sve →' : 'View all →'}
                              </button>
                            </>
                          ) : (
                            <p className="text-sm text-slate-500 py-3 text-center">
                              {language === 'sr' ? 'Nema zakazanih rezervacija' : 'No scheduled bookings'}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Dashboard - for admin/staff */}
                      {(isAdmin || isMedical) && (
                        <button
                          onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center">
                            <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-white">
                              {language === 'sr' ? 'Kontrolna tabla' : 'Dashboard'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {language === 'sr' ? 'Desktop verzija' : 'Desktop version'}
                            </p>
                          </div>
                        </button>
                      )}

                      {/* Fleet Status - for admin */}
                      {isAdmin && (
                        <button
                          onClick={() => { setMenuOpen(false); setActiveTab('drivers'); }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
                            <Car className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-white">
                              {language === 'sr' ? 'Status vozila' : 'Fleet Status'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {language === 'sr' ? 'Pregled vozača' : 'View drivers'}
                            </p>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Settings Section */}
                  <div className="p-4 border-b border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      {language === 'sr' ? 'Podešavanja' : 'Settings'}
                    </p>
                    <div className="space-y-2">
                      {/* Language Toggle */}
                      <button
                        onClick={toggleLanguage}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium text-white">
                            {language === 'sr' ? 'Jezik' : 'Language'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {language === 'sr' ? 'Srpski' : 'English'}
                          </p>
                        </div>
                        <img 
                          src={language === 'sr' 
                            ? 'https://flagcdn.com/w40/rs.png'
                            : 'https://flagcdn.com/w40/gb.png'
                          }
                          alt={language === 'sr' ? 'Serbian' : 'English'}
                          className="w-6 h-4 object-cover rounded-sm"
                        />
                      </button>

                      {/* Notifications */}
                      <button
                        onClick={() => { setMenuOpen(false); setShowNotificationSetup(true); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-medium text-white">
                            {language === 'sr' ? 'Obaveštenja' : 'Notifications'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {pushNotifications.permission === 'granted' 
                              ? (language === 'sr' ? 'Omogućeno' : 'Enabled')
                              : (language === 'sr' ? 'Onemogućeno' : 'Disabled')
                            }
                          </p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${pushNotifications.permission === 'granted' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Logout Section */}
                  <div className="p-4 mt-auto">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
                      onClick={() => { setMenuOpen(false); handleLogout(); }}
                    >
                      <LogOut className="w-5 h-5" />
                      {language === 'sr' ? 'Odjavi se' : 'Logout'}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Push Notification Setup Banner - Show if not granted */}
      {pushNotifications.canRequestPermission && pushNotifications.permission !== 'granted' && !showNotificationSetup && (
        <div 
          className="bg-amber-600/20 border-b border-amber-600/30 px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-amber-600/30"
          onClick={() => setShowNotificationSetup(true)}
        >
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-200 flex-1">
            {language === 'sr' ? 'Omogućite obaveštenja za nove zadatke' : 'Enable notifications for new tasks'}
          </span>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </div>
      )}

      {/* PWA Install Banner - Show if app is installable and not already installed */}
      {pwaInstall.isInstallable && !pwaInstall.isInstalled && (
        <div 
          className="bg-sky-600/20 border-b border-sky-600/30 px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-sky-600/30"
          onClick={pwaInstall.promptInstall}
          data-testid="pwa-install-banner"
        >
          <Plus className="w-4 h-4 text-sky-400" />
          <span className="text-sm text-sky-200 flex-1">
            {language === 'sr' ? 'Instalirajte aplikaciju za bolji doživljaj' : 'Install app for better experience'}
          </span>
          <Button 
            size="sm" 
            className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs"
            onClick={(e) => { e.stopPropagation(); pwaInstall.promptInstall(); }}
            data-testid="pwa-install-btn"
          >
            {language === 'sr' ? 'Instaliraj' : 'Install'}
          </Button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="bg-slate-800/50 px-4 py-3 grid grid-cols-3 gap-3 border-b border-slate-700">
        {isDriver ? (
          <>
            <div className="text-center">
              <p className="text-2xl font-bold text-sky-400">{assignment ? 1 : 0}</p>
              <p className="text-xs text-slate-400">{language === 'sr' ? 'Aktivan' : 'Active'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{driverStatus === 'available' ? '✓' : '—'}</p>
              <p className="text-xs text-slate-400">{language === 'sr' ? 'Status' : 'Status'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{lastLocation ? '📍' : '—'}</p>
              <p className="text-xs text-slate-400">GPS</p>
            </div>
          </>
        ) : (
          <>
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
              <p className="text-xs text-slate-400">{language === 'sr' ? 'Vozači' : 'Drivers'}</p>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-4" />
            <p className="text-slate-400">{language === 'sr' ? 'Učitavanje...' : 'Loading...'}</p>
          </div>
        )}

        {/* Error State with Retry */}
        {!loading && fetchError && (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400 mb-2">
              {language === 'sr' ? 'Greška pri učitavanju' : 'Failed to load'}
            </h3>
            <p className="text-slate-400 mb-4 text-sm">{fetchError}</p>
            <Button 
              onClick={() => fetchData(true)}
              className="bg-sky-600 hover:bg-sky-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {language === 'sr' ? 'Pokušaj ponovo' : 'Try Again'}
            </Button>
          </div>
        )}

        {/* DRIVER VIEW */}
        {!loading && !fetchError && isDriver && (
          <>
            {/* Driver Status Toggle */}
            {!assignment && (
              <div className="mb-4">
                <Button
                  onClick={() => updateDriverStatus(driverStatus === 'available' ? 'offline' : 'available')}
                  disabled={updatingStatus}
                  className={`w-full h-14 text-lg font-bold gap-2 ${driverStatus === 'available' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : driverStatus === 'available' ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {driverStatus === 'available' ? (language === 'sr' ? 'ODJAVI SE' : 'GO OFFLINE') : (language === 'sr' ? 'PRIJAVI SE' : 'GO ONLINE')}
                </Button>
              </div>
            )}

            {/* Current Assignment */}
            {assignment ? (
              <div className="bg-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-sky-600 to-emerald-600 px-4 py-3">
                  <p className="text-sm font-medium opacity-90">{language === 'sr' ? 'Trenutni zadatak' : 'Current Task'}</p>
                  <p className="text-xl font-bold">{assignment.patient_name}</p>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <button onClick={() => openNavigation(assignment.pickup_lat, assignment.pickup_lng, assignment.pickup_address)} className="w-full flex items-start gap-3 p-3 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors text-left">
                      <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400">{language === 'sr' ? 'Preuzimanje' : 'Pickup'}</p>
                        <p className="text-sm">{assignment.pickup_address || assignment.start_point}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    </button>
                    <button onClick={() => openNavigation(assignment.destination_lat, assignment.destination_lng, assignment.destination_address)} className="w-full flex items-start gap-3 p-3 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors text-left">
                      <Navigation className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400">{language === 'sr' ? 'Odredište' : 'Destination'}</p>
                        <p className="text-sm">{assignment.destination_address || assignment.end_point}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  {assignment.contact_phone && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => startCall(assignment.contact_phone, assignment.patient_name)}
                        className="flex-1 flex items-center gap-3 p-3 bg-sky-600/20 rounded-xl hover:bg-sky-600/30 transition-colors"
                        data-testid="call-patient-btn"
                      >
                        <Phone className="w-5 h-5 text-sky-400" />
                        <span className="flex-1 text-left truncate">{assignment.contact_phone}</span>
                      </button>
                      <button 
                        onClick={() => quickVideoCall(assignment.patient_name, language === 'sr' ? 'Pacijent' : 'Patient')}
                        className="p-3 bg-indigo-600/20 rounded-xl hover:bg-indigo-600/30 transition-colors"
                        data-testid="video-call-patient-btn"
                        title={language === 'sr' ? 'Video poziv' : 'Video call'}
                      >
                        <Video className="w-5 h-5 text-indigo-400" />
                      </button>
                    </div>
                  )}
                  
                  {/* Quick call buttons row */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => quickVideoCall(language === 'sr' ? 'Dispečer' : 'Dispatch', language === 'sr' ? 'Centar' : 'Center')}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-sm"
                    >
                      <Video className="w-4 h-4 text-indigo-400" />
                      <span className="text-slate-300">{language === 'sr' ? 'Dispečer' : 'Dispatch'}</span>
                    </button>
                    <button 
                      onClick={() => quickVideoCall(language === 'sr' ? 'Medicinski tim' : 'Medical Team', language === 'sr' ? 'Lekar' : 'Doctor')}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-sm"
                    >
                      <Video className="w-4 h-4 text-purple-400" />
                      <span className="text-slate-300">{language === 'sr' ? 'Lekar' : 'Doctor'}</span>
                    </button>
                  </div>
                  
                  {/* Action Buttons based on status */}
                  <div className="space-y-2 pt-2">
                    {driverStatus === 'assigned' && (
                      <Button onClick={startRouteWithMap} disabled={updatingStatus} className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-lg font-bold gap-2" data-testid="start-route-btn">
                        {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                        {language === 'sr' ? 'KRENI KA LOKACIJI' : 'START ROUTE'}
                      </Button>
                    )}
                    {driverStatus === 'en_route' && !showRouteMap && (
                      <Button onClick={() => setShowRouteMap(true)} className="w-full h-12 bg-slate-700 hover:bg-slate-600 text-base font-medium gap-2 mb-2">
                        <MapPin className="w-4 h-4" />
                        {language === 'sr' ? 'PRIKAŽI MAPU' : 'SHOW MAP'}
                      </Button>
                    )}
                    {driverStatus === 'en_route' && (
                      <>
                        {distanceToPickup !== null && (
                          <div className={`text-center py-2 px-4 rounded-lg ${nearPickup ? 'bg-green-600/30 border border-green-500' : 'bg-slate-700/50'}`}>
                            <p className="text-sm text-slate-400">{language === 'sr' ? 'Udaljenost do preuzimanja' : 'Distance to pickup'}</p>
                            <p className={`text-xl font-bold ${nearPickup ? 'text-green-400' : 'text-white'}`}>
                              {distanceToPickup < 1000 ? `${distanceToPickup} m` : `${(distanceToPickup / 1000).toFixed(1)} km`}
                            </p>
                            {nearPickup && (
                              <p className="text-green-400 text-sm font-medium animate-pulse">
                                {language === 'sr' ? '✓ Stigli ste na lokaciju!' : '✓ You have arrived!'}
                              </p>
                            )}
                          </div>
                        )}
                        <Button 
                          onClick={() => { updateDriverStatus('on_site'); setShowRouteMap(false); }} 
                          disabled={updatingStatus} 
                          className={`w-full h-14 text-lg font-bold gap-2 ${nearPickup ? 'bg-green-600 hover:bg-green-700 animate-pulse' : 'bg-orange-600 hover:bg-orange-700'}`}
                          data-testid="arrived-btn"
                        >
                          {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                          {language === 'sr' ? 'STIGAO NA LOKACIJU' : 'ARRIVED'}
                        </Button>
                      </>
                    )}
                    {driverStatus === 'on_site' && (
                      <Button onClick={() => updateDriverStatus('transporting')} disabled={updatingStatus} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-lg font-bold gap-2" data-testid="start-transport-btn">
                        {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
                        {language === 'sr' ? 'ZAPOČNI TRANSPORT' : 'START TRANSPORT'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : driverStatus === 'available' ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{language === 'sr' ? 'Čekanje na zadatak' : 'Waiting for Task'}</h3>
                <p className="text-slate-400">{language === 'sr' ? 'Bićete obavešteni kada dobijete novi zadatak' : "You'll be notified when you get a new task"}</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{language === 'sr' ? 'Odjavljeni ste' : "You're Offline"}</h3>
                <p className="text-slate-400">{language === 'sr' ? 'Prijavite se da biste primali zadatke' : 'Go online to receive tasks'}</p>
              </div>
            )}
          </>
        )}

        {/* ADMIN/MEDICAL VIEW */}
        {!loading && !fetchError && (isAdmin || isMedical) && (
          <>
            {activeTab === 'home' && (
              <div className="space-y-4">
                {/* Medical Staff - Show Active Transports with Vitals Entry */}
                {isMedical && activeBookings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      {language === 'sr' ? 'AKTIVNI PACIJENTI' : 'ACTIVE PATIENTS'} ({activeBookings.length})
                    </h3>
                    {activeBookings.map(booking => (
                      <MedicalBookingCard 
                        key={booking.id} 
                        booking={booking} 
                        language={language} 
                        onVitals={() => { setSelectedPatient(booking); setShowVitalsModal(true); }}
                      />
                    ))}
                  </div>
                )}

                {/* Admin - Show Pending Bookings */}
                {isAdmin && pendingBookings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {language === 'sr' ? 'ČEKAJU DODELU' : 'WAITING'} ({pendingBookings.length})
                    </h3>
                    {pendingBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} language={language} onAssign={() => { setSelectedBooking(booking); setShowAssignModal(true); }} />
                    ))}
                  </div>
                )}
                
                {/* Active Transports - Both roles */}
                {(isAdmin || (isMedical && activeBookings.length === 0)) && activeBookings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {language === 'sr' ? 'AKTIVNI' : 'ACTIVE'} ({activeBookings.length})
                    </h3>
                    {activeBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} language={language} />
                    ))}
                  </div>
                )}

                {/* Medical - Empty State */}
                {isMedical && activeBookings.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Stethoscope className="w-16 h-16 mx-auto mb-3 text-slate-600" />
                    <p className="text-lg font-medium">{language === 'sr' ? 'Nema aktivnih pacijenata' : 'No active patients'}</p>
                    <p className="text-sm mt-2">{language === 'sr' ? 'Pacijenti će se pojaviti kada vozač započne transport' : 'Patients will appear when driver starts transport'}</p>
                  </div>
                )}

                {/* Admin - Empty State */}
                {isAdmin && pendingBookings.length === 0 && activeBookings.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle className="w-16 h-16 mx-auto mb-3 text-slate-600" />
                    <p>{language === 'sr' ? 'Nema rezervacija' : 'No bookings'}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'vitals' && isMedical && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  {language === 'sr' ? 'BRZI UNOS VITALA' : 'QUICK VITALS ENTRY'}
                </h3>
                {activeBookings.length > 0 ? (
                  activeBookings.map(booking => (
                    <div key={booking.id} className="bg-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold">{booking.patient_name}</p>
                          <p className="text-xs text-slate-400">{statusConfig[booking.status]?.label[language]}</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => { setSelectedPatient(booking); setShowVitalsModal(true); }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {language === 'sr' ? 'Vitali' : 'Vitals'}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Heart className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                    <p>{language === 'sr' ? 'Nema aktivnih pacijenata' : 'No active patients'}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'map' && (
              <div style={{ height: 'calc(100vh - 240px)', marginLeft: '-1rem', marginRight: '-1rem', marginTop: '-1rem' }}>
                <MapContainer center={[43.3209, 21.8958]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {activeBookings.map(b => b.pickup_lat && b.pickup_lng && (
                    <Marker key={b.id} position={[b.pickup_lat, b.pickup_lng]} icon={driverIcon}>
                      <Popup><strong>{b.patient_name}</strong><br/>{b.assigned_driver_name}<br/>{statusConfig[b.status]?.label[language]}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}

            {activeTab === 'drivers' && (
              <div className="space-y-3">
                {drivers.map(driver => {
                  const activeBooking = bookings.find(b => b.assigned_driver === driver.id && ['confirmed', 'en_route', 'on_site', 'transporting'].includes(b.status));
                  const isAvailable = !activeBooking;
                  return (
                    <div key={driver.id} className={`rounded-xl p-4 ${isAvailable ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
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
                          {isAvailable ? (language === 'sr' ? 'Slobodan' : 'Free') : (language === 'sr' ? 'Zauzet' : 'Busy')}
                        </Badge>
                      </div>
                      {activeBooking && (
                        <div className="mt-3 pt-3 border-t border-slate-700 text-sm text-slate-400">
                          <p><User className="w-3 h-3 inline mr-1" />{activeBooking.patient_name}</p>
                          <p className="mt-1"><Activity className="w-3 h-3 inline mr-1" />{statusConfig[activeBooking.status]?.label[language]}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation - Only for Admin/Medical */}
      {(isAdmin || isMedical) && (
        <nav className={`bg-slate-800 border-t border-slate-700 grid ${isMedical ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <button onClick={() => setActiveTab('home')} className={`py-4 flex flex-col items-center gap-1 relative ${activeTab === 'home' ? 'text-sky-400' : 'text-slate-500'}`}>
            <Home className="w-5 h-5" />
            <span className="text-xs">{language === 'sr' ? 'Početna' : 'Home'}</span>
            {pendingBookings.length > 0 && <span className="absolute top-2 right-1/4 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center">{pendingBookings.length}</span>}
          </button>
          {isMedical && (
            <button onClick={() => setActiveTab('vitals')} className={`py-4 flex flex-col items-center gap-1 relative ${activeTab === 'vitals' ? 'text-purple-400' : 'text-slate-500'}`}>
              <Heart className="w-5 h-5" />
              <span className="text-xs">{language === 'sr' ? 'Vitali' : 'Vitals'}</span>
              {activeBookings.length > 0 && <span className="absolute top-2 right-1/4 w-4 h-4 bg-purple-500 rounded-full text-[10px] flex items-center justify-center">{activeBookings.length}</span>}
            </button>
          )}
          <button onClick={() => setActiveTab('map')} className={`py-4 flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-sky-400' : 'text-slate-500'}`}>
            <MapPin className="w-5 h-5" />
            <span className="text-xs">{language === 'sr' ? 'Mapa' : 'Map'}</span>
          </button>
          <button onClick={() => setActiveTab('drivers')} className={`py-4 flex flex-col items-center gap-1 ${activeTab === 'drivers' ? 'text-sky-400' : 'text-slate-500'}`}>
            <Users className="w-5 h-5" />
            <span className="text-xs">{language === 'sr' ? 'Vozači' : 'Drivers'}</span>
          </button>
        </nav>
      )}

      {/* Floating Call Widget - Shows during active call */}
      {activeCall && (
        <div 
          className={`fixed z-[60] transition-all duration-300 ${
            callMinimized 
              ? 'bottom-20 right-4 w-auto' 
              : 'inset-x-4 bottom-20'
          }`}
          data-testid="floating-call-widget"
        >
          {callMinimized ? (
            // Minimized pill - floats over map
            <button
              onClick={() => setCallMinimized(false)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-full shadow-lg animate-pulse hover:bg-green-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="font-medium">{formatCallDuration(callDuration)}</span>
            </button>
          ) : (
            // Expanded call card
            <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
              <div className="bg-green-600 px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{activeCall.contactName || language === 'sr' ? 'Poziv u toku' : 'Call in progress'}</p>
                  <p className="text-sm text-green-100">{activeCall.phoneNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-mono font-bold">{formatCallDuration(callDuration)}</p>
                </div>
              </div>
              <div className="p-3 flex gap-2">
                <Button 
                  onClick={() => setCallMinimized(true)}
                  variant="outline"
                  className="flex-1 border-slate-600 hover:bg-slate-700"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  {language === 'sr' ? 'Nazad na mapu' : 'Back to Map'}
                </Button>
                <Button 
                  onClick={endCall}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  {language === 'sr' ? 'Završi' : 'End Call'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="bg-slate-800 rounded-t-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{language === 'sr' ? 'Dodeli vozača' : 'Assign Driver'}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAssignModal(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <p className="font-semibold">{selectedBooking.patient_name}</p>
              <p className="text-sm text-slate-400 mt-2"><MapPin className="w-4 h-4 inline mr-1 text-emerald-400" />{selectedBooking.start_point || selectedBooking.pickup_address}</p>
              <p className="text-sm text-slate-400 mt-1"><Navigation className="w-4 h-4 inline mr-1 text-red-400" />{selectedBooking.end_point || selectedBooking.destination_address}</p>
            </div>
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">{language === 'sr' ? 'Izaberi vozača' : 'Select Driver'}</label>
              {availableDrivers.length > 0 ? (
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue placeholder={language === 'sr' ? 'Izaberi...' : 'Select...'} /></SelectTrigger>
                  <SelectContent>{availableDrivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <p className="text-amber-400 text-sm">{language === 'sr' ? 'Nema slobodnih vozača' : 'No available drivers'}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowAssignModal(false)}>{language === 'sr' ? 'Otkaži' : 'Cancel'}</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={assignDriver} disabled={!selectedDriver || assigning}>
                {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{language === 'sr' ? 'Dodeli' : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Vitals Modal - Full Screen for Medical Staff */}
      {showVitalsModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col" data-testid="vitals-modal">
          {/* Header */}
          <div className="bg-purple-900/80 px-4 py-3 flex items-center justify-between border-b border-purple-700">
            <div>
              <p className="text-xs text-purple-300">{language === 'sr' ? 'Unos vitalnih znakova' : 'Recording Vitals'}</p>
              <p className="font-bold text-white">{selectedPatient.patient_name}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setShowVitalsModal(false); setSelectedPatient(null); }}
              className="text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Vitals Form - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Critical Alert Banner */}
            {checkCriticalVitals(vitals).length > 0 && (
              <div className="bg-red-600/30 border border-red-500 rounded-xl p-3 flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-200 text-sm font-medium">
                  {language === 'sr' ? 'KRITIČNE VREDNOSTI: ' : 'CRITICAL VALUES: '}
                  {checkCriticalVitals(vitals).join(', ')}
                </span>
              </div>
            )}

            {/* Blood Pressure */}
            <div className="bg-slate-800 rounded-xl p-4">
              <label className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-400" />
                {language === 'sr' ? 'Krvni pritisak (mmHg)' : 'Blood Pressure (mmHg)'}
              </label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder={language === 'sr' ? 'Sistolni' : 'Systolic'}
                  value={vitals.blood_pressure_systolic}
                  onChange={(e) => setVitals({...vitals, blood_pressure_systolic: e.target.value})}
                  className={`h-14 text-xl text-center bg-slate-700 border-slate-600 ${vitals.blood_pressure_systolic && (vitals.blood_pressure_systolic < 90 || vitals.blood_pressure_systolic > 180) ? 'border-red-500 bg-red-900/30' : ''}`}
                />
                <span className="text-2xl text-slate-500">/</span>
                <Input
                  type="number"
                  placeholder={language === 'sr' ? 'Dijastolni' : 'Diastolic'}
                  value={vitals.blood_pressure_diastolic}
                  onChange={(e) => setVitals({...vitals, blood_pressure_diastolic: e.target.value})}
                  className="h-14 text-xl text-center bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            {/* Heart Rate */}
            <div className="bg-slate-800 rounded-xl p-4">
              <label className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" />
                {language === 'sr' ? 'Puls (bpm)' : 'Heart Rate (bpm)'}
              </label>
              <Input
                type="number"
                placeholder="75"
                value={vitals.heart_rate}
                onChange={(e) => setVitals({...vitals, heart_rate: e.target.value})}
                className={`h-14 text-xl text-center bg-slate-700 border-slate-600 ${vitals.heart_rate && (vitals.heart_rate < 50 || vitals.heart_rate > 120) ? 'border-red-500 bg-red-900/30' : ''}`}
              />
            </div>

            {/* SpO2 */}
            <div className="bg-slate-800 rounded-xl p-4">
              <label className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                {language === 'sr' ? 'Saturacija kiseonikom (%)' : 'Oxygen Saturation (%)'}
              </label>
              <Input
                type="number"
                placeholder="98"
                value={vitals.oxygen_saturation}
                onChange={(e) => setVitals({...vitals, oxygen_saturation: e.target.value})}
                className={`h-14 text-xl text-center bg-slate-700 border-slate-600 ${vitals.oxygen_saturation && vitals.oxygen_saturation < 92 ? 'border-red-500 bg-red-900/30' : ''}`}
              />
            </div>

            {/* Temperature */}
            <div className="bg-slate-800 rounded-xl p-4">
              <label className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-400" />
                {language === 'sr' ? 'Temperatura (°C)' : 'Temperature (°C)'}
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="36.6"
                value={vitals.temperature}
                onChange={(e) => setVitals({...vitals, temperature: e.target.value})}
                className={`h-14 text-xl text-center bg-slate-700 border-slate-600 ${vitals.temperature && (vitals.temperature < 35 || vitals.temperature > 39) ? 'border-red-500 bg-red-900/30' : ''}`}
              />
            </div>

            {/* Respiratory Rate */}
            <div className="bg-slate-800 rounded-xl p-4">
              <label className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                {language === 'sr' ? 'Disanje (udaha/min)' : 'Respiratory Rate (/min)'}
              </label>
              <Input
                type="number"
                placeholder="16"
                value={vitals.respiratory_rate}
                onChange={(e) => setVitals({...vitals, respiratory_rate: e.target.value})}
                className="h-14 text-xl text-center bg-slate-700 border-slate-600"
              />
            </div>

            {/* Notes */}
            <div className="bg-slate-800 rounded-xl p-4">
              <label className="text-sm text-slate-400 mb-2 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-400" />
                {language === 'sr' ? 'Napomene' : 'Notes'}
              </label>
              <textarea
                placeholder={language === 'sr' ? 'Dodatne napomene o stanju pacijenta...' : 'Additional notes about patient condition...'}
                value={vitals.notes}
                onChange={(e) => setVitals({...vitals, notes: e.target.value})}
                rows={3}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-slate-600 text-slate-300"
                onClick={() => setVitals({
                  heart_rate: '75',
                  blood_pressure_systolic: '120',
                  blood_pressure_diastolic: '80',
                  temperature: '36.6',
                  oxygen_saturation: '98',
                  respiratory_rate: '16',
                  notes: vitals.notes
                })}
              >
                {language === 'sr' ? 'Normalne vrednosti' : 'Normal Values'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-slate-600 text-slate-300"
                onClick={() => setVitals({
                  heart_rate: '',
                  blood_pressure_systolic: '',
                  blood_pressure_diastolic: '',
                  temperature: '',
                  oxygen_saturation: '',
                  respiratory_rate: '',
                  notes: ''
                })}
              >
                {language === 'sr' ? 'Obriši sve' : 'Clear All'}
              </Button>
            </div>
          </div>

          {/* Save Button - Fixed at bottom */}
          <div className="p-4 bg-slate-800 border-t border-slate-700">
            <Button
              onClick={saveVitals}
              disabled={savingVitals || (!vitals.heart_rate && !vitals.blood_pressure_systolic && !vitals.oxygen_saturation)}
              className="w-full h-16 bg-purple-600 hover:bg-purple-700 text-xl font-bold gap-3"
            >
              {savingVitals ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <CheckCircle className="w-6 h-6" />
              )}
              {language === 'sr' ? 'SAČUVAJ VITALE' : 'SAVE VITALS'}
            </Button>
          </div>
        </div>
      )}

      {/* Push Notification Setup Modal */}
      {showNotificationSetup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" data-testid="notification-setup-modal">
          <div className="bg-slate-800 rounded-t-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">{language === 'sr' ? 'Push Obaveštenja' : 'Push Notifications'}</h3>
              <p className="text-amber-100 text-sm mt-1">
                {language === 'sr' ? 'Dobijajte obaveštenja o novim zadacima' : 'Get notified about new tasks'}
              </p>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Current Status */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{language === 'sr' ? 'Status' : 'Status'}</span>
                  <Badge className={
                    pushNotifications.permission === 'granted' ? 'bg-emerald-600' :
                    pushNotifications.permission === 'denied' ? 'bg-red-600' :
                    'bg-amber-600'
                  }>
                    {pushNotifications.permission === 'granted' ? (language === 'sr' ? 'Aktivno' : 'Enabled') :
                     pushNotifications.permission === 'denied' ? (language === 'sr' ? 'Blokirano' : 'Blocked') :
                     (language === 'sr' ? 'Nije podešeno' : 'Not set up')}
                  </Badge>
                </div>
                
                {/* iOS specific info */}
                {pushNotifications.isIOS && (
                  <div className={`text-sm p-3 rounded-lg mt-2 ${pushNotifications.isStandalone ? 'bg-emerald-600/20 text-emerald-300' : 'bg-amber-600/20 text-amber-300'}`}>
                    {pushNotifications.isStandalone ? (
                      <>
                        <CheckCircle className="w-4 h-4 inline mr-2" />
                        {language === 'sr' ? 'Aplikacija je instalirana!' : 'App is installed!'}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        {language === 'sr' 
                          ? 'Za push obaveštenja na iOS-u, dodajte aplikaciju na početni ekran' 
                          : 'For push notifications on iOS, add this app to your home screen'}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* iOS Installation Instructions */}
              {pushNotifications.isIOS && !pushNotifications.isStandalone && (
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <h4 className="font-semibold mb-3">{language === 'sr' ? 'Kako instalirati:' : 'How to install:'}</h4>
                  <ol className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                      {language === 'sr' ? 'Pritisnite dugme za deljenje (Share) u Safari-ju' : 'Tap the Share button in Safari'}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                      {language === 'sr' ? 'Izaberite "Dodaj na početni ekran"' : 'Select "Add to Home Screen"'}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                      {language === 'sr' ? 'Otvorite aplikaciju sa početnog ekrana' : 'Open the app from your home screen'}
                    </li>
                  </ol>
                </div>
              )}

              {/* Android/Chrome Install Button */}
              {pwaInstall.isInstallable && !pwaInstall.isInstalled && (
                <div className="bg-sky-600/20 rounded-xl p-4" data-testid="pwa-install-section">
                  <h4 className="font-semibold mb-2 text-sky-300">
                    {language === 'sr' ? 'Instaliraj aplikaciju' : 'Install App'}
                  </h4>
                  <p className="text-sm text-slate-400 mb-3">
                    {language === 'sr' 
                      ? 'Instalirajte PC018 na vaš uređaj za brži pristup i rad bez mreže.' 
                      : 'Install PC018 on your device for faster access and offline use.'}
                  </p>
                  <Button 
                    onClick={pwaInstall.promptInstall}
                    className="w-full bg-sky-600 hover:bg-sky-700"
                    data-testid="pwa-install-modal-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {language === 'sr' ? 'Instaliraj aplikaciju' : 'Install App'}
                  </Button>
                </div>
              )}

              {/* App Installed Success */}
              {pwaInstall.isInstalled && (
                <div className="bg-emerald-600/20 text-emerald-300 p-3 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  {language === 'sr' 
                    ? 'Aplikacija je instalirana na vašem uređaju!' 
                    : 'App is installed on your device!'}
                </div>
              )}

              {/* Enable Button */}
              {pushNotifications.canRequestPermission && pushNotifications.permission !== 'granted' && (
                <Button 
                  onClick={async () => {
                    const result = await pushNotifications.requestPermission();
                    if (result.success) {
                      toast.success(language === 'sr' ? 'Obaveštenja su omogućena!' : 'Notifications enabled!');
                    } else if (result.reason === 'denied') {
                      toast.error(language === 'sr' ? 'Obaveštenja su blokirana u podešavanjima' : 'Notifications blocked in settings');
                    }
                  }}
                  className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-lg font-semibold"
                  disabled={pushNotifications.permission === 'denied'}
                >
                  <Bell className="w-5 h-5 mr-2" />
                  {language === 'sr' ? 'Omogući obaveštenja' : 'Enable Notifications'}
                </Button>
              )}

              {/* Test Button (if already enabled) */}
              {pushNotifications.permission === 'granted' && (
                <div className="flex gap-2">
                  <Button 
                    onClick={async () => {
                      const result = await pushNotifications.sendTestNotification();
                      if (result.success) {
                        toast.success(language === 'sr' ? 'Test obaveštenje poslato!' : 'Test notification sent!');
                      }
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    {language === 'sr' ? 'Test obaveštenje' : 'Test Notification'}
                  </Button>
                </div>
              )}

              {/* Denied State */}
              {pushNotifications.permission === 'denied' && (
                <div className="bg-red-600/20 text-red-300 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  {language === 'sr' 
                    ? 'Obaveštenja su blokirana. Promenite u podešavanjima pregledača.' 
                    : 'Notifications are blocked. Change this in your browser settings.'}
                </div>
              )}

              {/* Close Button */}
              <Button 
                variant="outline" 
                onClick={() => setShowNotificationSetup(false)}
                className="w-full border-slate-600"
              >
                {language === 'sr' ? 'Zatvori' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call Modal */}
      {showVideoCallModal && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col" data-testid="video-call-modal">
          {/* Header */}
          <div className="bg-indigo-900/90 px-4 py-3 flex items-center justify-between border-b border-indigo-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white">
                  {videoCallRoom?.name || (language === 'sr' ? 'Video poziv' : 'Video Call')}
                </p>
                <p className="text-xs text-indigo-300">
                  {videoCallRoom ? (language === 'sr' ? 'Soba aktivna' : 'Room active') : (language === 'sr' ? 'Kreirajte ili se pridružite pozivu' : 'Create or join a call')}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setShowVideoCallModal(false); setVideoCallRoom(null); }}
              className="text-white hover:bg-indigo-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!videoCallRoom ? (
              <>
                {/* Create New Call */}
                <div className="bg-slate-800 rounded-xl p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-400" />
                    {language === 'sr' ? 'Novi video poziv' : 'New Video Call'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => startVideoCall(language === 'sr' ? 'Tim sastanak' : 'Team Meeting')}
                      className="h-16 bg-indigo-600 hover:bg-indigo-700 flex-col gap-1"
                    >
                      <Users className="w-5 h-5" />
                      <span className="text-xs">{language === 'sr' ? 'Tim' : 'Team'}</span>
                    </Button>
                    <Button 
                      onClick={() => startVideoCall(language === 'sr' ? 'Medicinska konsultacija' : 'Medical Consultation')}
                      className="h-16 bg-purple-600 hover:bg-purple-700 flex-col gap-1"
                    >
                      <Stethoscope className="w-5 h-5" />
                      <span className="text-xs">{language === 'sr' ? 'Medicinski' : 'Medical'}</span>
                    </Button>
                    <Button 
                      onClick={() => startVideoCall(language === 'sr' ? 'Vozač poziv' : 'Driver Call')}
                      className="h-16 bg-emerald-600 hover:bg-emerald-700 flex-col gap-1"
                    >
                      <Truck className="w-5 h-5" />
                      <span className="text-xs">{language === 'sr' ? 'Vozač' : 'Driver'}</span>
                    </Button>
                    <Button 
                      onClick={() => startVideoCall(language === 'sr' ? 'Hitni poziv' : 'Emergency Call')}
                      className="h-16 bg-red-600 hover:bg-red-700 flex-col gap-1"
                    >
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-xs">{language === 'sr' ? 'Hitno' : 'Emergency'}</span>
                    </Button>
                  </div>
                </div>

                {/* Quick Call to Team Members */}
                {(isAdmin || isMedical) && availableDrivers.length > 0 && (
                  <div className="bg-slate-800 rounded-xl p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      {language === 'sr' ? 'Pozovi člana tima' : 'Call Team Member'}
                    </h3>
                    <div className="space-y-2">
                      {availableDrivers.slice(0, 4).map(driver => (
                        <button
                          key={driver.id}
                          onClick={() => quickVideoCall(driver.full_name, language === 'sr' ? 'Vozač' : 'Driver')}
                          className="w-full flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                          <div className="w-8 h-8 bg-emerald-600/30 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-emerald-400" />
                          </div>
                          <span className="flex-1 text-left">{driver.full_name}</span>
                          <Video className="w-4 h-4 text-indigo-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Calls */}
                {recentVideoCalls.length > 0 && (
                  <div className="bg-slate-800 rounded-xl p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {language === 'sr' ? 'Nedavni pozivi' : 'Recent Calls'}
                    </h3>
                    <div className="space-y-2">
                      {recentVideoCalls.map(call => (
                        <button
                          key={call.id}
                          onClick={() => joinVideoCall(call.id, call.name)}
                          className="w-full flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                          <Video className="w-4 h-4 text-indigo-400" />
                          <span className="flex-1 text-left truncate">{call.name}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(call.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Active Call Room */
              <>
                <div className="bg-indigo-900/30 border border-indigo-600/50 rounded-xl p-6 text-center">
                  <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{videoCallRoom.name}</h3>
                  <p className="text-indigo-300 text-sm mb-4">
                    {language === 'sr' ? 'Soba je spremna' : 'Room is ready'}
                  </p>
                  <div className="bg-slate-800 rounded-lg p-3 mb-4">
                    <p className="text-xs text-slate-400 mb-1">{language === 'sr' ? 'ID sobe' : 'Room ID'}</p>
                    <p className="font-mono text-sm text-white break-all">{videoCallRoom.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={copyVideoCallLink}
                      variant="outline"
                      className="flex-1 border-indigo-600"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {language === 'sr' ? 'Kopiraj link' : 'Copy Link'}
                    </Button>
                    <Button 
                      onClick={openJitsiCall}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {language === 'sr' ? 'Otvori' : 'Open'}
                    </Button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-slate-800 rounded-xl p-4">
                  <h4 className="font-semibold mb-2">{language === 'sr' ? 'Kako se pridružiti?' : 'How to join?'}</h4>
                  <ul className="text-sm text-slate-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                      {language === 'sr' ? 'Pritisnite "Otvori" da pokrenete video poziv' : 'Press "Open" to start the video call'}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                      {language === 'sr' ? 'Podelite link sa ostalim učesnicima' : 'Share the link with other participants'}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                      {language === 'sr' ? 'Poziv radi i na mobilnim uređajima' : 'The call works on mobile devices too'}
                    </li>
                  </ul>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setVideoCallRoom(null)}
                    variant="outline"
                    className="flex-1 border-slate-600"
                  >
                    {language === 'sr' ? 'Nova soba' : 'New Room'}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Bottom Safe Area */}
          <div className="h-4 bg-slate-900" />
        </div>
      )}

      {/* Full-Screen Route Map - for Driver en_route */}
      {isDriver && showRouteMap && assignment && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col" data-testid="route-map-fullscreen">
          {/* Header */}
          <div className="bg-purple-900/90 px-4 py-3 flex items-center justify-between border-b border-purple-700 z-10">
            <div className="flex-1">
              <p className="text-xs text-purple-300">{language === 'sr' ? 'Navigacija do' : 'Navigating to'}</p>
              <p className="font-bold text-white truncate">{assignment.pickup_address || assignment.start_point}</p>
            </div>
            <div className="flex items-center gap-2">
              {distanceToPickup !== null && (
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${nearPickup ? 'bg-green-500' : 'bg-slate-700'}`}>
                  {distanceToPickup < 1000 ? `${distanceToPickup}m` : `${(distanceToPickup / 1000).toFixed(1)}km`}
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowRouteMap(false)}
                className="text-white hover:bg-purple-800"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            <MapContainer
              center={[
                lastLocation?.latitude || assignment.start_coords?.lat || assignment.pickup_lat || 43.32,
                lastLocation?.longitude || assignment.start_coords?.lng || assignment.pickup_lng || 21.89
              ]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              
              {/* Driver current location */}
              {lastLocation?.latitude && lastLocation?.longitude && (
                <Marker 
                  position={[lastLocation.latitude, lastLocation.longitude]}
                  icon={L.divIcon({
                    className: 'driver-marker',
                    html: `<div style="background: #3b82f6; border: 3px solid white; border-radius: 50%; width: 24px; height: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                      <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
                    </div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  })}
                >
                  <Popup>{language === 'sr' ? 'Vaša lokacija' : 'Your location'}</Popup>
                </Marker>
              )}
              
              {/* Pickup location */}
              {((assignment.start_coords?.lat && assignment.start_coords?.lng) || (assignment.pickup_lat && assignment.pickup_lng)) && (
                <Marker 
                  position={[
                    assignment.start_coords?.lat || assignment.pickup_lat,
                    assignment.start_coords?.lng || assignment.pickup_lng
                  ]}
                  icon={L.divIcon({
                    className: 'pickup-marker',
                    html: `<div style="background: #22c55e; border: 3px solid white; border-radius: 50%; width: 32px; height: 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                      <span style="color: white; font-size: 16px; font-weight: bold;">P</span>
                    </div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                  })}
                >
                  <Popup>
                    <strong>{language === 'sr' ? 'Preuzimanje' : 'Pickup'}</strong><br/>
                    {assignment.pickup_address || assignment.start_point}
                  </Popup>
                </Marker>
              )}
              
              {/* Route line */}
              {routeCoordinates.length > 0 && (
                <Polyline 
                  positions={routeCoordinates} 
                  color="#8b5cf6" 
                  weight={5} 
                  opacity={0.8}
                />
              )}
            </MapContainer>

            {/* Near pickup notification overlay */}
            {nearPickup && (
              <div className="absolute top-4 left-4 right-4 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg animate-pulse z-[1000]">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6" />
                  <div>
                    <p className="font-bold">{language === 'sr' ? 'Stigli ste!' : "You've arrived!"}</p>
                    <p className="text-sm opacity-90">{language === 'sr' ? 'Pritisnite dugme ispod kada budete spremni' : 'Press the button below when ready'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="bg-slate-800 p-4 border-t border-slate-700 z-10">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-14 border-slate-600"
                onClick={() => {
                  const lat = assignment.start_coords?.lat || assignment.pickup_lat;
                  const lng = assignment.start_coords?.lng || assignment.pickup_lng;
                  openNavigation(lat, lng, assignment.pickup_address || assignment.start_point);
                }}
              >
                <Navigation className="w-5 h-5 mr-2" />
                Google Maps
              </Button>
              <Button 
                onClick={() => { updateDriverStatus('on_site'); setShowRouteMap(false); }} 
                disabled={updatingStatus}
                className={`flex-1 h-14 text-lg font-bold ${nearPickup ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
              >
                {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MapPin className="w-5 h-5 mr-2" />}
                {language === 'sr' ? 'STIGAO' : 'ARRIVED'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Medical Booking Card Component - for doctors/nurses
const MedicalBookingCard = ({ booking, language, onVitals }) => {
  const status = statusConfig[booking.status] || statusConfig.pending;
  
  return (
    <div className={`rounded-xl p-4 mb-3 bg-gradient-to-r from-slate-800 to-slate-800/80 border-l-4 ${status.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-white text-lg">{booking.patient_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-[10px] ${status.color} text-white flex items-center gap-1`}>
              {status.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              {status.label[language]}
            </Badge>
            {booking.assigned_driver_name && (
              <span className="text-xs text-slate-400">• <Truck className="w-3 h-3 inline" /> {booking.assigned_driver_name}</span>
            )}
          </div>
        </div>
        <Button 
          size="sm" 
          className="bg-purple-600 hover:bg-purple-700 h-10 px-4 gap-2"
          onClick={onVitals}
        >
          <Heart className="w-4 h-4" />
          {language === 'sr' ? 'Vitali' : 'Vitals'}
        </Button>
      </div>
      <div className="space-y-2 text-sm text-slate-300">
        <p className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{booking.start_point || booking.pickup_address}</span>
        </p>
        <p className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="truncate">{booking.end_point || booking.destination_address}</span>
        </p>
        <div className="flex items-center gap-4 pt-2 text-xs text-slate-500 border-t border-slate-700 mt-2">
          <span><Clock className="w-3 h-3 inline mr-1" />{booking.booking_time}</span>
          {booking.contact_phone && (
            <a href={`tel:${booking.contact_phone}`} className="text-sky-400 hover:text-sky-300">
              <Phone className="w-3 h-3 inline mr-1" />{booking.contact_phone}
            </a>
          )}
          {booking.mobility_status && (
            <span className="text-amber-400">{booking.mobility_status}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Booking Card Component
const BookingCard = ({ booking, language, onAssign }) => {
  const status = statusConfig[booking.status] || statusConfig.pending;
  
  return (
    <div className={`rounded-xl p-4 mb-3 bg-slate-800 border-l-4 ${status.border}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-white">{booking.patient_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-[10px] ${status.color} text-white flex items-center gap-1`}>
              {status.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              {status.label[language]}
            </Badge>
            {booking.assigned_driver_name && <span className="text-xs text-slate-400">• {booking.assigned_driver_name}</span>}
          </div>
        </div>
        {booking.status === 'pending' && onAssign && (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8" onClick={onAssign}>
            {language === 'sr' ? 'Dodeli' : 'Assign'}
          </Button>
        )}
      </div>
      <div className="space-y-1 text-sm text-slate-300">
        <p className="flex items-center gap-2"><MapPin className="w-3 h-3 text-emerald-400" /><span className="truncate">{booking.start_point || booking.pickup_address}</span></p>
        <p className="flex items-center gap-2"><Navigation className="w-3 h-3 text-red-400" /><span className="truncate">{booking.end_point || booking.destination_address}</span></p>
        <div className="flex items-center gap-4 pt-1 text-xs text-slate-500">
          <span><Clock className="w-3 h-3 inline mr-1" />{booking.booking_time}</span>
          {booking.contact_phone && <a href={`tel:${booking.contact_phone}`} className="text-sky-400"><Phone className="w-3 h-3 inline mr-1" />{booking.contact_phone}</a>}
        </div>
      </div>
    </div>
  );
};

export default UnifiedPWA;
