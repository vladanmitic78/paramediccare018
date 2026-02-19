import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import CriticalAlertsPanel from '../components/CriticalAlertsPanel';
import FleetDispatch from '../components/FleetDispatch';
import FleetHistory from '../components/FleetHistory';
import BookingCalendar from '../components/BookingCalendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  MessageSquare,
  Settings,
  Loader2,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  AlertCircle,
  LogOut,
  Globe,
  Activity,
  HeartPulse,
  Navigation,
  Ambulance,
  Map,
  Search,
  MapPin,
  ChevronDown,
  ChevronRight,
  Stethoscope,
  Receipt,
  BarChart3,
  Moon,
  Sun,
  X,
  Key,
  Copy,
  RefreshCw,
  Shield,
  ExternalLink,
  Phone,
  Image as ImageIcon,
  Menu,
  CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import CMSManager from '../components/CMSManager';
import GalleryManager from '../components/GalleryManager';
import OperationsDashboard from '../components/OperationsDashboard';
import AdminBookingNotifications from '../components/AdminBookingNotifications';
import StaffAvailabilityCalendar from '../components/StaffAvailabilityCalendar';
import InvoiceManager from '../components/InvoiceManager';
import ScheduleGantt from '../components/ScheduleGantt';
import AdminLiveMap from '../components/AdminLiveMap';
import SMSSettings from '../components/SMSSettings';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const Dashboard = () => {
  const { user, logout, isAdmin, loading: authLoading } = useAuth();
  const { language, t, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [patientBookings, setPatientBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedPatientBooking, setSelectedPatientBooking] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [assigningDriver, setAssigningDriver] = useState(null);
  
  // Search states
  const [patientBookingSearch, setPatientBookingSearch] = useState('');
  const [publicBookingSearch, setPublicBookingSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  
  // Delete user confirmation dialog
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);
  
  // API Keys management state (Outgoing APIs)
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyPermissions, setNewApiKeyPermissions] = useState(['read']);
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  
  // Incoming APIs state
  const [incomingApis, setIncomingApis] = useState({});
  const [loadingIncomingApis, setLoadingIncomingApis] = useState(false);
  const [savingIncomingApi, setSavingIncomingApi] = useState(null);
  const [testingApi, setTestingApi] = useState(null);
  const [apiTestResults, setApiTestResults] = useState({});
  
  // Sidebar expanded groups state
  const [expandedGroups, setExpandedGroups] = useState(['operations']); // Default: operations expanded
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('adminDarkMode') === 'true';
  });

  const isSuperAdmin = () => user?.role === 'superadmin';
  
  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('adminDarkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Toggle group expansion
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Get drivers sorted by distance to a pickup location
  const getDriversSortedByDistance = (pickupLat, pickupLng) => {
    return availableDrivers
      .filter(d => d.driver_status === 'available' || d.driver_status === 'offline')
      .map(driver => {
        const loc = driver.last_location;
        const distance = loc 
          ? calculateDistance(loc.latitude, loc.longitude, pickupLat, pickupLng)
          : Infinity;
        return { ...driver, distance };
      })
      .sort((a, b) => a.distance - b.distance);
  };

  // Filter patient bookings based on search
  const filteredPatientBookings = patientBookings.filter(booking => {
    if (!patientBookingSearch.trim()) return true;
    const search = patientBookingSearch.toLowerCase();
    return (
      booking.patient_name?.toLowerCase().includes(search) ||
      booking.contact_phone?.toLowerCase().includes(search) ||
      booking.contact_email?.toLowerCase().includes(search) ||
      booking.pickup_address?.toLowerCase().includes(search) ||
      booking.destination_address?.toLowerCase().includes(search) ||
      booking.transport_reason?.toLowerCase().includes(search) ||
      booking.status?.toLowerCase().includes(search) ||
      booking.mobility_status?.toLowerCase().includes(search) ||
      booking.assigned_driver_name?.toLowerCase().includes(search) ||
      booking.preferred_date?.includes(search)
    );
  });

  // Filter public bookings based on search
  const filteredPublicBookings = bookings.filter(booking => {
    if (!publicBookingSearch.trim()) return true;
    const search = publicBookingSearch.toLowerCase();
    return (
      booking.patient_name?.toLowerCase().includes(search) ||
      booking.contact_phone?.toLowerCase().includes(search) ||
      booking.contact_email?.toLowerCase().includes(search) ||
      booking.start_point?.toLowerCase().includes(search) ||
      booking.end_point?.toLowerCase().includes(search) ||
      booking.status?.toLowerCase().includes(search) ||
      booking.booking_date?.includes(search) ||
      booking.assigned_driver_name?.toLowerCase().includes(search)
    );
  });

  // Filter users based on search (all parameters)
  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const search = userSearch.toLowerCase();
    
    // Role labels for search
    const roleLabels = {
      regular: language === 'sr' ? 'korisnik' : 'user',
      doctor: language === 'sr' ? 'lekar' : 'doctor',
      nurse: language === 'sr' ? 'sestra' : 'nurse',
      driver: language === 'sr' ? 'vozač' : 'driver',
      admin: 'admin',
      superadmin: 'superadmin'
    };
    
    // Status labels for search
    const statusLabel = u.is_active 
      ? (language === 'sr' ? 'aktivan' : 'active')
      : (language === 'sr' ? 'neaktivan' : 'inactive');
    
    return (
      u.full_name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search) ||
      u.phone?.toLowerCase().includes(search) ||
      u.role?.toLowerCase().includes(search) ||
      roleLabels[u.role]?.toLowerCase().includes(search) ||
      statusLabel.includes(search)
    );
  });

  // Handle viewing a patient booking from notification
  const handleViewPatientBooking = (booking) => {
    setSelectedPatientBooking(booking);
    setActiveTab('bookings');
  };

  // Fetch available drivers for assignment
  const fetchAvailableDrivers = async () => {
    try {
      const response = await axios.get(`${API}/admin/drivers`);
      // Filter to only show available or offline drivers (not currently assigned)
      const available = response.data.filter(d => 
        d.driver_status === 'offline' || d.driver_status === 'available'
      );
      setAvailableDrivers(available);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  // Assign driver to booking (patient portal or public)
  const assignDriverToBooking = async (bookingId, driverId, isPublicBooking = false) => {
    setAssigningDriver(bookingId);
    try {
      const endpoint = isPublicBooking 
        ? `${API}/admin/assign-driver-public?booking_id=${bookingId}&driver_id=${driverId}`
        : `${API}/admin/assign-driver?booking_id=${bookingId}&driver_id=${driverId}`;
      
      await axios.post(endpoint);
      toast.success(language === 'sr' ? 'Vozač dodeljen!' : 'Driver assigned!');
      
      if (isPublicBooking) {
        fetchData(); // Refresh public bookings
      } else {
        fetchPatientBookings();
      }
      fetchAvailableDrivers();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri dodeli' : 'Assignment error'));
    } finally {
      setAssigningDriver(null);
    }
  };

  // Fetch patient bookings
  const fetchPatientBookings = async () => {
    try {
      const response = await axios.get(`${API}/admin/patient-bookings`);
      setPatientBookings(response.data);
    } catch (error) {
      console.error('Error fetching patient bookings:', error);
    }
  };

  // Update patient booking status
  const updatePatientBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/admin/patient-bookings/${bookingId}/status?status=${status}`);
      toast.success(language === 'sr' ? 'Status ažuriran!' : 'Status updated!');
      fetchPatientBookings();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
    fetchPatientBookings();
    fetchAvailableDrivers();
  }, [user, navigate, authLoading]);

  // Fetch API keys and incoming APIs when api-settings tab is selected
  useEffect(() => {
    if (activeTab === 'api-settings' && isSuperAdmin()) {
      fetchApiKeys();
      fetchIncomingApis();
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        isAdmin() ? axios.get(`${API}/stats/dashboard`) : Promise.resolve({ data: null }),
        axios.get(`${API}/bookings`)
      ]);
      
      setStats(statsRes.data);
      setBookings(bookingsRes.data);

      if (isAdmin()) {
        const [usersRes, contactsRes, servicesRes, staffRes] = await Promise.all([
          axios.get(`${API}/users`),
          axios.get(`${API}/contacts`),
          axios.get(`${API}/services`),
          axios.get(`${API}/users/staff`)
        ]);
        setUsers(usersRes.data);
        setContacts(contactsRes.data);
        setServices(servicesRes.data);
        setStaff(staffRes.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status, assignedDriver = null, assignedMedical = null) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}`, { 
        status, 
        assigned_driver: assignedDriver,
        assigned_medical: assignedMedical 
      });
      toast.success(language === 'sr' ? 'Status ažuriran' : 'Status updated');
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  const deleteBooking = async (bookingId) => {
    if (!window.confirm(language === 'sr' ? 'Da li ste sigurni?' : 'Are you sure?')) return;
    try {
      await axios.delete(`${API}/bookings/${bookingId}`);
      toast.success(language === 'sr' ? 'Obrisano' : 'Deleted');
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  const markContactRead = async (contactId) => {
    try {
      await axios.put(`${API}/contacts/${contactId}/read`);
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  const deleteContact = async (contactId) => {
    try {
      await axios.delete(`${API}/contacts/${contactId}`);
      toast.success(language === 'sr' ? 'Poruka obrisana' : 'Message deleted');
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri brisanju' : 'Delete error');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`${API}/users/${userId}/role`, { role: newRole });
      toast.success(language === 'sr' ? 'Uloga ažurirana' : 'Role updated');
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  const toggleUserStatus = async (userId, isActive) => {
    try {
      await axios.put(`${API}/users/${userId}/status`, { is_active: !isActive });
      toast.success(language === 'sr' ? 'Status ažuriran' : 'Status updated');
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  const deleteUser = async (userId) => {
    setDeletingUser(true);
    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success(language === 'sr' ? 'Korisnik obrisan' : 'User deleted');
      setShowDeleteUserDialog(false);
      setUserToDelete(null);
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri brisanju korisnika' : 'Error deleting user');
    } finally {
      setDeletingUser(false);
    }
  };

  const openDeleteUserDialog = (user) => {
    setUserToDelete(user);
    setShowDeleteUserDialog(true);
  };

  // API Key management functions
  const fetchApiKeys = async () => {
    setLoadingApiKeys(true);
    try {
      const response = await axios.get(`${API}/apikeys`);
      setApiKeys(response.data);
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri učitavanju API ključeva' : 'Error loading API keys');
    } finally {
      setLoadingApiKeys(false);
    }
  };

  const createApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast.error(language === 'sr' ? 'Unesite naziv ključa' : 'Enter key name');
      return;
    }
    setCreatingApiKey(true);
    try {
      const response = await axios.post(`${API}/apikeys`, {
        name: newApiKeyName,
        permissions: newApiKeyPermissions
      });
      setNewlyCreatedKey(response.data.key);
      setNewApiKeyName('');
      setNewApiKeyPermissions(['read']);
      fetchApiKeys();
      toast.success(language === 'sr' ? 'API ključ kreiran' : 'API key created');
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri kreiranju ključa' : 'Error creating API key');
    } finally {
      setCreatingApiKey(false);
    }
  };

  const revokeApiKey = async (keyId) => {
    try {
      await axios.delete(`${API}/apikeys/${keyId}`);
      fetchApiKeys();
      toast.success(language === 'sr' ? 'API ključ opozvan' : 'API key revoked');
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri opozivanju ključa' : 'Error revoking API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(language === 'sr' ? 'Kopirano u međuspremnik' : 'Copied to clipboard');
  };

  // Incoming APIs functions
  const fetchIncomingApis = async () => {
    setLoadingIncomingApis(true);
    try {
      const response = await axios.get(`${API}/incoming-apis`);
      // Convert array to object keyed by service_type
      const apisObj = {};
      response.data.forEach(api => {
        apisObj[api.service_type] = api;
      });
      setIncomingApis(apisObj);
    } catch (error) {
      console.error('Error fetching incoming APIs:', error);
    } finally {
      setLoadingIncomingApis(false);
    }
  };

  const saveIncomingApi = async (serviceType, data) => {
    setSavingIncomingApi(serviceType);
    try {
      await axios.post(`${API}/incoming-apis`, {
        service_type: serviceType,
        ...data
      });
      toast.success(language === 'sr' ? 'API konfiguracija sačuvana' : 'API configuration saved');
      fetchIncomingApis();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri čuvanju' : 'Error saving configuration');
    } finally {
      setSavingIncomingApi(null);
    }
  };

  const testApiConnection = async (serviceType) => {
    setTestingApi(serviceType);
    setApiTestResults(prev => ({ ...prev, [serviceType]: null }));
    try {
      const response = await axios.post(`${API}/incoming-apis/${serviceType}/test`);
      setApiTestResults(prev => ({ 
        ...prev, 
        [serviceType]: { success: true, message: response.data.message } 
      }));
      toast.success(language === 'sr' ? 'Konekcija uspešna!' : 'Connection successful!');
    } catch (error) {
      setApiTestResults(prev => ({ 
        ...prev, 
        [serviceType]: { success: false, message: error.response?.data?.detail || 'Connection failed' } 
      }));
      toast.error(language === 'sr' ? 'Konekcija neuspešna' : 'Connection failed');
    } finally {
      setTestingApi(null);
    }
  };

  const deleteIncomingApi = async (serviceType) => {
    try {
      await axios.delete(`${API}/incoming-apis/${serviceType}`);
      toast.success(language === 'sr' ? 'API konfiguracija obrisana' : 'API configuration deleted');
      fetchIncomingApis();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri brisanju' : 'Error deleting configuration');
    }
  };

  // Incoming API service definitions
  const incomingApiServices = [
    {
      type: 'google_maps',
      name: language === 'sr' ? 'Google Maps' : 'Google Maps',
      icon: '🗺️',
      description: language === 'sr' ? 'Mape i geolokacija' : 'Maps and geolocation',
      fields: [
        { key: 'api_key', label: 'API Key', type: 'password', required: true },
        { key: 'endpoint_url', label: 'Endpoint URL', type: 'text', placeholder: 'https://maps.googleapis.com/maps/api' }
      ]
    },
    {
      type: 'osm_maps',
      name: 'OpenStreetMap',
      icon: '🌍',
      description: language === 'sr' ? 'Besplatne otvorene mape' : 'Free open maps',
      fields: [
        { key: 'endpoint_url', label: 'Tile Server URL', type: 'text', placeholder: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
        { key: 'api_key', label: 'API Key (optional)', type: 'password', required: false }
      ]
    },
    {
      type: 'stripe',
      name: 'Stripe',
      icon: '💳',
      description: language === 'sr' ? 'Plaćanja i fakturisanje' : 'Payments and billing',
      fields: [
        { key: 'api_key', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_...' },
        { key: 'publishable_key', label: 'Publishable Key', type: 'text', placeholder: 'pk_...' },
        { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' }
      ]
    },
    {
      type: 'email',
      name: language === 'sr' ? 'Email Servis' : 'Email Service',
      icon: '📧',
      description: language === 'sr' ? 'SMTP konfiguracija' : 'SMTP configuration',
      fields: [
        { key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.example.com' },
        { key: 'smtp_port', label: 'SMTP Port', type: 'number', required: true, placeholder: '465' },
        { key: 'smtp_user', label: 'Username', type: 'text', required: true },
        { key: 'smtp_password', label: 'Password', type: 'password', required: true },
        { key: 'from_email', label: 'From Email', type: 'email', placeholder: 'noreply@example.com' },
        { key: 'use_ssl', label: 'Use SSL', type: 'checkbox' }
      ]
    },
    {
      type: 'medical_device',
      name: language === 'sr' ? 'Medicinski Uređaji' : 'Medical Devices',
      icon: '🏥',
      description: language === 'sr' ? 'Lifepak 15, monitori pacijenata' : 'Lifepak 15, patient monitors',
      fields: [
        { key: 'device_type', label: language === 'sr' ? 'Tip uređaja' : 'Device Type', type: 'select', options: ['lifepak_15', 'zoll_x', 'philips_mrx', 'other'] },
        { key: 'api_key', label: 'API Key', type: 'password' },
        { key: 'endpoint_url', label: 'Endpoint URL', type: 'text', placeholder: 'https://...' },
        { key: 'auth_type', label: language === 'sr' ? 'Tip autentifikacije' : 'Auth Type', type: 'select', options: ['api_key', 'oauth2', 'basic', 'none'] }
      ]
    }
  ];

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800',
      confirmed: 'bg-sky-100 text-sky-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: t('pending'),
      confirmed: t('confirmed'),
      in_progress: t('in_progress'),
      completed: t('completed'),
      cancelled: t('cancelled')
    };
    return <Badge className={styles[status] || styles.pending}>{labels[status] || status}</Badge>;
  };

  const getRoleBadge = (role) => {
    const styles = {
      regular: 'bg-slate-100 text-slate-800',
      doctor: 'bg-sky-100 text-sky-800',
      nurse: 'bg-pink-100 text-pink-800',
      driver: 'bg-amber-100 text-amber-800',
      admin: 'bg-purple-100 text-purple-800',
      superadmin: 'bg-red-100 text-red-800'
    };
    return <Badge className={styles[role] || styles.regular}>{role}</Badge>;
  };

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <span className="ml-3 text-slate-600">{language === 'sr' ? 'Provera sesije...' : 'Checking session...'}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  // Navigation structure with groups - each group has id, icon, label, and items
  const navigationGroups = [
    {
      id: 'operations',
      icon: LayoutDashboard,
      label: language === 'sr' ? 'Operacije' : 'Operations',
      items: [
        { id: 'overview', icon: LayoutDashboard, label: language === 'sr' ? 'Kontrolna tabla' : 'Dashboard' },
        ...(isAdmin() ? [{ id: 'calendar', icon: Calendar, label: language === 'sr' ? 'Kalendar' : 'Calendar' }] : []),
      ]
    },
    ...(isAdmin() ? [{
      id: 'medical',
      icon: Stethoscope,
      label: language === 'sr' ? 'Medicinski centar' : 'Medical Center',
      items: [
        { id: 'patients', icon: Users, label: language === 'sr' ? 'Pacijenti' : 'Patients', badge: language === 'sr' ? 'Uskoro' : 'Soon' },
        { id: 'statistics', icon: BarChart3, label: language === 'sr' ? 'Statistika' : 'Statistics', badge: language === 'sr' ? 'Uskoro' : 'Soon' },
      ]
    }] : []),
    ...(isAdmin() ? [{
      id: 'team',
      icon: Users,
      label: language === 'sr' ? 'Tim' : 'Team',
      items: [
        { id: 'drivers', icon: Truck, label: language === 'sr' ? 'Vozači' : 'Drivers' },
        { id: 'availability', icon: Calendar, label: language === 'sr' ? 'Dostupnost' : 'Availability' },
      ]
    }] : []),
    // Non-admin staff get their own availability section
    ...(!isAdmin() && user?.role !== 'regular' ? [{
      id: 'my-schedule',
      icon: Calendar,
      label: language === 'sr' ? 'Moj raspored' : 'My Schedule',
      items: [
        { id: 'availability', icon: Calendar, label: language === 'sr' ? 'Dostupnost' : 'Availability' },
      ]
    }] : []),
    ...(isAdmin() ? [{
      id: 'fleet',
      icon: Ambulance,
      label: language === 'sr' ? 'Dispečerski centar' : 'Dispatch Center',
      items: [
        { id: 'vehicles', icon: Ambulance, label: language === 'sr' ? 'Vozila & Rezervacije' : 'Vehicles & Bookings' },
        { id: 'schedule', icon: CalendarDays, label: language === 'sr' ? 'Raspored (Gantt)' : 'Schedule (Gantt)' },
        { id: 'fleet-history', icon: Clock, label: language === 'sr' ? 'Istorija' : 'History' },
        { id: 'livemap', icon: Map, label: language === 'sr' ? 'Praćenje vozila' : 'Live Tracking' },
      ]
    }] : []),
    ...(isAdmin() ? [{
      id: 'finance',
      icon: Receipt,
      label: language === 'sr' ? 'Finansije' : 'Finance',
      items: [
        { id: 'invoices', icon: FileText, label: language === 'sr' ? 'Fakture' : 'Invoices' },
      ]
    }] : []),
    ...(isAdmin() ? [{
      id: 'settings',
      icon: Settings,
      label: language === 'sr' ? 'Podešavanja' : 'Settings',
      items: [
        { id: 'users', icon: Users, label: t('dashboard_users') },
        { id: 'cms', icon: Globe, label: language === 'sr' ? 'Web stranica' : 'Website' },
        { id: 'gallery', icon: ImageIcon, label: language === 'sr' ? 'Galerija' : 'Gallery' },
        { id: 'contacts', icon: MessageSquare, label: language === 'sr' ? 'Poruke' : 'Messages' },
        ...(isSuperAdmin() ? [
          { id: 'api-settings', icon: Key, label: language === 'sr' ? 'API Podešavanja' : 'API Settings' },
          { id: 'sms-settings', icon: Phone, label: language === 'sr' ? 'SMS Gateway' : 'SMS Gateway' }
        ] : []),
      ]
    }] : []),
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} data-testid="dashboard-page">
      {/* Admin Booking Notifications */}
      {isAdmin() && (
        <AdminBookingNotifications onViewBooking={handleViewPatientBooking} />
      )}
      
      {/* Critical Alerts Panel */}
      {isAdmin() && (
        <CriticalAlertsPanel language={language} darkMode={darkMode} />
      )}
      
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden bg-slate-900 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="/logo.jpg" alt="Paramedic Care 018" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-white">Paramedic Care 018</span>
        </div>
        <button 
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 text-white hover:bg-slate-800 rounded-lg"
        >
          {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      <div className="flex">
        {/* Sidebar - Desktop: always visible, Mobile: slide-in */}
        <aside className={`
          w-72 bg-slate-900 min-h-screen flex-col
          lg:flex
          ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'}
        `} style={{ fontFamily: 'Inter, sans-serif' }}>
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              <img src="/logo.jpg" alt="Paramedic Care 018" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-white text-lg leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Paramedic Care
              </h1>
              <p className="text-xs text-slate-500">018</p>
            </div>
            {/* Close button for mobile */}
            <button 
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navigationGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.id);
              const GroupIcon = group.icon;
              const hasActiveItem = group.items.some(item => item.id === activeTab);
              
              return (
                <div key={group.id}>
                  {/* Group Header - Clickable to expand/collapse */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      hasActiveItem 
                        ? 'bg-white/10 text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <GroupIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left">{group.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  
                  {/* Sub-items - Collapsible */}
                  <div className={`overflow-hidden transition-all duration-200 ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-3">
                      {group.items.map((item) => (
                        item.isExternal ? (
                          <a
                            key={item.id}
                            href={item.href}
                            data-testid={`sidebar-${item.id}`}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-slate-400 hover:text-slate-200 hover:bg-white/5"
                          >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-emerald-600 text-white">
                                {item.badge}
                              </span>
                            )}
                          </a>
                        ) : (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setMobileSidebarOpen(false);
                            }}
                            data-testid={`sidebar-${item.id}`}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                              activeTab === item.id 
                                ? 'bg-sky-500/20 text-sky-400 font-medium' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                          >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-slate-700 text-slate-400">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
              {t('nav_logout')}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-all mt-1"
              data-testid="dark-mode-toggle"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {darkMode ? (language === 'sr' ? 'Svetli režim' : 'Light Mode') : (language === 'sr' ? 'Tamni režim' : 'Dark Mode')}
            </button>
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all mt-1"
              data-testid="language-toggle"
            >
              <Globe className="w-5 h-5" />
              {language === 'sr' ? 'English' : 'Srpski'}
            </button>
          </div>
        </aside>

        {/* Main Content - inside flex for proper layout */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Mobile Header with Sandwich Menu Only */}
          <div className="lg:hidden w-full sticky top-0 z-30 bg-slate-800 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <img src="/logo.jpg" alt="PC018" className="w-8 h-8 rounded-lg" />
                <span className="font-semibold text-white">Paramedic Care 018</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="text-white hover:bg-slate-700"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900">
                  {language === 'sr' ? 'Dobrodošli,' : 'Welcome,'} {user?.full_name}
                </h1>

              {isAdmin() && stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card-base">
                    <Calendar className="w-8 h-8 text-sky-600 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats.total_bookings}</p>
                    <p className="text-sm text-slate-500">{language === 'sr' ? 'Ukupno rezervacija' : 'Total Bookings'}</p>
                  </div>
                  <div className="card-base">
                    <Clock className="w-8 h-8 text-amber-600 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats.pending_bookings}</p>
                    <p className="text-sm text-slate-500">{language === 'sr' ? 'Na čekanju' : 'Pending'}</p>
                  </div>
                  <div className="card-base">
                    <Users className="w-8 h-8 text-emerald-600 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
                    <p className="text-sm text-slate-500">{language === 'sr' ? 'Korisnika' : 'Users'}</p>
                  </div>
                  <div className="card-base">
                    <MessageSquare className="w-8 h-8 text-purple-600 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats.unread_contacts}</p>
                    <p className="text-sm text-slate-500">{language === 'sr' ? 'Nepročitanih' : 'Unread'}</p>
                  </div>
                </div>
              )}

              {/* Recent Bookings */}
              <div className="card-base">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {language === 'sr' ? 'Nedavne Rezervacije' : 'Recent Bookings'}
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'sr' ? 'Pacijent' : 'Patient'}</TableHead>
                        <TableHead>{language === 'sr' ? 'Datum' : 'Date'}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>{language === 'sr' ? 'Ruta' : 'Route'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.slice(0, 5).map((booking) => (
                        <TableRow 
                          key={booking.id} 
                          className="cursor-pointer hover:bg-sky-50 transition-colors"
                          onClick={() => {
                            setActiveTab('vehicles');
                            // Store the booking ID to highlight it in FleetDispatch
                            sessionStorage.setItem('highlightBookingId', booking.id);
                          }}
                        >
                          <TableCell className="font-medium text-sky-600 hover:text-sky-800">{booking.patient_name}</TableCell>
                          <TableCell>{booking.booking_date}</TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {booking.start_point} → {booking.end_point}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* Invoices */}
          {activeTab === 'invoices' && isAdmin() && (
            <InvoiceManager />
          )}

          {/* Live Map - Vehicle Tracking */}
          {activeTab === 'livemap' && isAdmin() && (
            <AdminLiveMap />
          )}

          {/* Fleet Management - Vehicles & Teams + Bookings */}
          {activeTab === 'vehicles' && isAdmin() && (
            <FleetDispatch />
          )}

          {/* Schedule Gantt */}
          {activeTab === 'schedule' && isAdmin() && (
            <ScheduleGantt />
          )}

          {/* Fleet History */}
          {activeTab === 'fleet-history' && isAdmin() && (
            <FleetHistory language={language} />
          )}

          {/* Booking Calendar */}
          {activeTab === 'calendar' && isAdmin() && (
            <BookingCalendar />
          )}

          {/* CMS - Page Management */}
          {activeTab === 'cms' && isAdmin() && (
            <CMSManager />
          )}

          {/* Gallery Management */}
          {activeTab === 'gallery' && isAdmin() && (
            <GalleryManager />
          )}

          {/* Bookings are now integrated into FleetDispatch (Vehicles & Bookings) */}

          {/* Drivers Section (Admin only) */}
          {activeTab === 'drivers' && isAdmin() && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {language === 'sr' ? 'Upravljanje vozačima' : 'Driver Management'}
                </h1>
              </div>
              <AdminLiveMap />
            </div>
          )}

          {/* Patients Section - Coming Soon */}
          {activeTab === 'patients' && isAdmin() && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {language === 'sr' ? 'Baza pacijenata' : 'Patient Database'}
              </h1>
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-sky-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {language === 'sr' ? 'Uskoro dostupno' : 'Coming Soon'}
                </h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  {language === 'sr' 
                    ? 'Baza pacijenata sa kompletnom istorijom transporta, medicinskom dokumentacijom i kontakt informacijama.'
                    : 'Patient database with complete transport history, medical documentation, and contact information.'}
                </p>
              </div>
            </div>
          )}

          {/* Statistics Section - Coming Soon */}
          {activeTab === 'statistics' && isAdmin() && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {language === 'sr' ? 'Statistika i analitika' : 'Statistics & Analytics'}
              </h1>
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {language === 'sr' ? 'Uskoro dostupno' : 'Coming Soon'}
                </h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  {language === 'sr' 
                    ? 'Detaljni izveštaji, grafikoni performansi, analiza vremena odziva i trendovi transporta.'
                    : 'Detailed reports, performance charts, response time analysis, and transport trends.'}
                </p>
              </div>
            </div>
          )}

          {/* Availability Section */}
          {activeTab === 'availability' && (
            <StaffAvailabilityCalendar />
          )}

          {/* Services (Admin only) */}
          {activeTab === 'services' && isAdmin() && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">{t('dashboard_services')}</h1>

              <div className="card-base overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'sr' ? 'Naziv (SR)' : 'Name (SR)'}</TableHead>
                      <TableHead>{language === 'sr' ? 'Naziv (EN)' : 'Name (EN)'}</TableHead>
                      <TableHead>{language === 'sr' ? 'Kategorija' : 'Category'}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name_sr}</TableCell>
                        <TableCell>{service.name_en}</TableCell>
                        <TableCell>
                          <Badge className={service.category === 'medical' ? 'bg-sky-100 text-sky-800' : 'bg-red-100 text-red-800'}>
                            {service.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {service.is_active ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Drivers (Admin only) */}
          {activeTab === 'drivers' && isAdmin() && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">
                {language === 'sr' ? 'Vozači' : 'Drivers'}
              </h1>
              <div className="card-base">
                <p className="text-slate-600">
                  {language === 'sr' ? 'Upravljanje vozačima i njihovim statusom.' : 'Manage drivers and their status.'}
                </p>
              </div>
            </div>
          )}

          {/* Patients (Admin only) - Coming Soon */}
          {activeTab === 'patients' && isAdmin() && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">
                {language === 'sr' ? 'Pacijenti' : 'Patients'}
              </h1>
              <div className="card-base text-center py-12">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {language === 'sr' ? 'Uskoro dostupno' : 'Coming Soon'}
                </h3>
                <p className="text-slate-600">
                  {language === 'sr' ? 'Upravljanje pacijentima će biti dostupno u sledećoj verziji.' : 'Patient management will be available in the next version.'}
                </p>
              </div>
            </div>
          )}

          {/* Statistics (Admin only) - Coming Soon */}
          {activeTab === 'statistics' && isAdmin() && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">
                {language === 'sr' ? 'Statistika' : 'Statistics'}
              </h1>
              <div className="card-base text-center py-12">
                <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {language === 'sr' ? 'Uskoro dostupno' : 'Coming Soon'}
                </h3>
                <p className="text-slate-600">
                  {language === 'sr' ? 'Detaljne statistike će biti dostupne u sledećoj verziji.' : 'Detailed statistics will be available in the next version.'}
                </p>
              </div>
            </div>
          )}

          {/* Users Management Section */}
          {activeTab === 'users' && isAdmin() && (
            <div className="space-y-6" data-testid="users-page">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {language === 'sr' ? 'Upravljanje Korisnicima' : 'User Management'}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  data-testid="refresh-users-btn"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {language === 'sr' ? 'Osveži' : 'Refresh'}
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder={language === 'sr' ? 'Pretraži korisnike (ime, email, telefon, uloga, status)...' : 'Search users (name, email, phone, role, status)...'}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10"
                  data-testid="user-search-input"
                />
              </div>

              {/* Users Table */}
              <div className="card-base overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                          {language === 'sr' ? 'Korisnik' : 'User'}
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                          {language === 'sr' ? 'Kontakt' : 'Contact'}
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                          {language === 'sr' ? 'Uloga' : 'Role'}
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                          {language === 'sr' ? 'Status' : 'Status'}
                        </th>
                        <th className="text-left p-4 text-sm font-semibold text-slate-600">
                          {language === 'sr' ? 'Akcije' : 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">
                            {userSearch 
                              ? (language === 'sr' ? 'Nema rezultata pretrage' : 'No search results')
                              : (language === 'sr' ? 'Nema korisnika' : 'No users')
                            }
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`user-row-${u.id}`}>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center text-white font-semibold">
                                  {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{u.full_name}</p>
                                  <p className="text-xs text-slate-500">
                                    {language === 'sr' ? 'Registrovan' : 'Registered'}: {new Date(u.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-sm text-slate-900">{u.email}</p>
                              <p className="text-xs text-slate-500">{u.phone || '—'}</p>
                            </td>
                            <td className="p-4">
                              <Select
                                value={u.role}
                                onValueChange={(value) => updateUserRole(u.id, value)}
                                disabled={u.role === 'superadmin' && !isSuperAdmin()}
                              >
                                <SelectTrigger className="w-32" data-testid={`role-select-${u.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="regular">{language === 'sr' ? 'Korisnik' : 'User'}</SelectItem>
                                  <SelectItem value="doctor">{language === 'sr' ? 'Lekar' : 'Doctor'}</SelectItem>
                                  <SelectItem value="nurse">{language === 'sr' ? 'Sestra' : 'Nurse'}</SelectItem>
                                  <SelectItem value="driver">{language === 'sr' ? 'Vozač' : 'Driver'}</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  {isSuperAdmin() && <SelectItem value="superadmin">Super Admin</SelectItem>}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-4">
                              <Button
                                variant={u.is_active ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleUserStatus(u.id, u.is_active)}
                                className={u.is_active ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                                data-testid={`status-toggle-${u.id}`}
                              >
                                {u.is_active 
                                  ? (language === 'sr' ? 'Aktivan' : 'Active')
                                  : (language === 'sr' ? 'Neaktivan' : 'Inactive')
                                }
                              </Button>
                            </td>
                            <td className="p-4">
                              {/* Don't allow deleting superadmins, or admins deleting other admins */}
                              {u.role !== 'superadmin' && !(user?.role === 'admin' && u.role === 'admin') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteUserDialog(u)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  data-testid={`delete-user-${u.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                  <p className="text-sm text-slate-600">
                    {language === 'sr' 
                      ? `Prikazano ${filteredUsers.length} od ${users.length} korisnika`
                      : `Showing ${filteredUsers.length} of ${users.length} users`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* API Settings Section (Super Admin only) */}
          {activeTab === 'api-settings' && isSuperAdmin() && (
            <div className="space-y-6" data-testid="api-settings-page">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {language === 'sr' ? 'API Podešavanja' : 'API Settings'}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { fetchApiKeys(); fetchIncomingApis(); }}
                  disabled={loadingApiKeys || loadingIncomingApis}
                  data-testid="refresh-api-keys-btn"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${(loadingApiKeys || loadingIncomingApis) ? 'animate-spin' : ''}`} />
                  {language === 'sr' ? 'Osveži' : 'Refresh'}
                </Button>
              </div>

              {/* Section Tabs */}
              <Tabs defaultValue="incoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="incoming" className="flex items-center gap-2">
                    <span>📥</span>
                    {language === 'sr' ? 'Dolazni API-ji' : 'Incoming APIs'}
                  </TabsTrigger>
                  <TabsTrigger value="outgoing" className="flex items-center gap-2">
                    <span>📤</span>
                    {language === 'sr' ? 'Odlazni API-ji' : 'Outgoing APIs'}
                  </TabsTrigger>
                </TabsList>

                {/* INCOMING APIs Tab */}
                <TabsContent value="incoming" className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-800">
                      <strong>{language === 'sr' ? 'Dolazni API-ji' : 'Incoming APIs'}:</strong>{' '}
                      {language === 'sr' 
                        ? 'Konfigurišite eksterne servise koje vaša aplikacija koristi (mape, plaćanja, SMS, medicinski uređaji).'
                        : 'Configure external services your application uses (maps, payments, SMS, medical devices).'}
                    </p>
                  </div>

                  {loadingIncomingApis ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {incomingApiServices.map((service) => {
                        const savedConfig = incomingApis[service.type] || {};
                        const testResult = apiTestResults[service.type];
                        
                        return (
                          <div key={service.type} className="card-base" data-testid={`incoming-api-${service.type}`}>
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{service.icon}</span>
                                <div>
                                  <h3 className="text-lg font-semibold text-slate-900">{service.name}</h3>
                                  <p className="text-sm text-slate-500">{service.description}</p>
                                </div>
                              </div>
                              {savedConfig.id && (
                                <Badge className="bg-emerald-100 text-emerald-800">
                                  {language === 'sr' ? 'Konfigurisano' : 'Configured'}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-4">
                              {service.fields.map((field) => (
                                <div key={field.key}>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                  </label>
                                  {field.type === 'select' ? (
                                    <Select
                                      value={savedConfig[field.key] || ''}
                                      onValueChange={(value) => {
                                        setIncomingApis(prev => ({
                                          ...prev,
                                          [service.type]: { ...prev[service.type], [field.key]: value }
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="max-w-md">
                                        <SelectValue placeholder={language === 'sr' ? 'Izaberite...' : 'Select...'} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {field.options.map((opt) => (
                                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : field.type === 'checkbox' ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={savedConfig[field.key] || false}
                                        onChange={(e) => {
                                          setIncomingApis(prev => ({
                                            ...prev,
                                            [service.type]: { ...prev[service.type], [field.key]: e.target.checked }
                                          }));
                                        }}
                                        className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                                      />
                                      <span className="text-sm text-slate-600">{language === 'sr' ? 'Da' : 'Yes'}</span>
                                    </label>
                                  ) : (
                                    <Input
                                      type={field.type}
                                      value={savedConfig[field.key] || ''}
                                      onChange={(e) => {
                                        setIncomingApis(prev => ({
                                          ...prev,
                                          [service.type]: { ...prev[service.type], [field.key]: e.target.value }
                                        }));
                                      }}
                                      placeholder={field.placeholder}
                                      className="max-w-md"
                                    />
                                  )}
                                </div>
                              ))}

                              {/* Test Result */}
                              {testResult && (
                                <div className={`p-3 rounded-lg ${testResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                                  <div className="flex items-center gap-2">
                                    {testResult.success ? (
                                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-600" />
                                    )}
                                    <span className={`text-sm ${testResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                                      {testResult.message}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-3 pt-2">
                                <Button
                                  onClick={() => saveIncomingApi(service.type, incomingApis[service.type] || {})}
                                  disabled={savingIncomingApi === service.type}
                                  className="bg-sky-600 hover:bg-sky-700 text-white"
                                  data-testid={`save-${service.type}-btn`}
                                >
                                  {savingIncomingApi === service.type ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                  )}
                                  {language === 'sr' ? 'Sačuvaj' : 'Save'}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => testApiConnection(service.type)}
                                  disabled={testingApi === service.type || !savedConfig.id}
                                  data-testid={`test-${service.type}-btn`}
                                >
                                  {testingApi === service.type ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Activity className="w-4 h-4 mr-2" />
                                  )}
                                  {language === 'sr' ? 'Testiraj konekciju' : 'Test Connection'}
                                </Button>
                                {savedConfig.id && (
                                  <Button
                                    variant="ghost"
                                    onClick={() => deleteIncomingApi(service.type)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    data-testid={`delete-${service.type}-btn`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    {language === 'sr' ? 'Obriši' : 'Delete'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* OUTGOING APIs Tab */}
                <TabsContent value="outgoing" className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-purple-800">
                      <strong>{language === 'sr' ? 'Odlazni API-ji' : 'Outgoing APIs'}:</strong>{' '}
                      {language === 'sr' 
                        ? 'Kreirajte API ključeve za spoljne sisteme koji žele da pristupe vašoj aplikaciji.'
                        : 'Create API keys for external systems that want to access your application.'}
                    </p>
                  </div>

                  {/* Create New API Key */}
                  <div className="card-base">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Key className="w-5 h-5 text-sky-600" />
                      {language === 'sr' ? 'Kreiraj novi API ključ' : 'Create New API Key'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {language === 'sr' ? 'Naziv ključa' : 'Key Name'}
                        </label>
                        <Input
                          value={newApiKeyName}
                          onChange={(e) => setNewApiKeyName(e.target.value)}
                          placeholder={language === 'sr' ? 'npr. Mobilna aplikacija' : 'e.g., Mobile App'}
                          className="max-w-md"
                          data-testid="api-key-name-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {language === 'sr' ? 'Dozvole' : 'Permissions'}
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {['read', 'write', 'delete'].map((perm) => (
                            <label key={perm} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newApiKeyPermissions.includes(perm)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewApiKeyPermissions([...newApiKeyPermissions, perm]);
                                  } else {
                                    setNewApiKeyPermissions(newApiKeyPermissions.filter(p => p !== perm));
                                  }
                                }}
                                className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                              />
                              <span className="text-sm text-slate-700 capitalize">{perm}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={createApiKey}
                        disabled={creatingApiKey || !newApiKeyName.trim()}
                        className="bg-sky-600 hover:bg-sky-700 text-white"
                        data-testid="create-api-key-btn"
                      >
                        {creatingApiKey ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        {language === 'sr' ? 'Kreiraj ključ' : 'Create Key'}
                      </Button>
                    </div>

                    {/* Show newly created key */}
                    {newlyCreatedKey && (
                      <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-center gap-2 text-emerald-700 mb-2">
                          <Shield className="w-5 h-5" />
                          <span className="font-semibold">
                            {language === 'sr' ? 'Novi API ključ kreiran!' : 'New API Key Created!'}
                          </span>
                        </div>
                        <p className="text-sm text-emerald-600 mb-3">
                          {language === 'sr' 
                            ? 'Kopirajte ovaj ključ sada. Nećete ga moći videti ponovo.'
                            : 'Copy this key now. You will not be able to see it again.'}
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-3 bg-white border border-emerald-300 rounded font-mono text-sm break-all">
                            {newlyCreatedKey}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(newlyCreatedKey)}
                            className="shrink-0"
                            data-testid="copy-new-key-btn"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewlyCreatedKey(null)}
                          className="mt-2 text-emerald-600"
                        >
                          {language === 'sr' ? 'Razumem, sakrij' : 'Got it, hide'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Active API Keys */}
                  <div className="card-base">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      {language === 'sr' ? 'Aktivni API ključevi' : 'Active API Keys'}
                    </h3>
                    
                    {loadingApiKeys ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                      </div>
                    ) : apiKeys.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Key className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>{language === 'sr' ? 'Nema aktivnih API ključeva' : 'No active API keys'}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{language === 'sr' ? 'Naziv' : 'Name'}</TableHead>
                              <TableHead>{language === 'sr' ? 'Prefiks ključa' : 'Key Prefix'}</TableHead>
                              <TableHead>{language === 'sr' ? 'Dozvole' : 'Permissions'}</TableHead>
                              <TableHead>{language === 'sr' ? 'Kreirano' : 'Created'}</TableHead>
                              <TableHead>{language === 'sr' ? 'Poslednje korišćenje' : 'Last Used'}</TableHead>
                              <TableHead className="text-right">{language === 'sr' ? 'Akcije' : 'Actions'}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {apiKeys.map((key) => (
                              <TableRow key={key.id}>
                                <TableCell className="font-medium">{key.name}</TableCell>
                                <TableCell>
                                  <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">
                                    {key.key_prefix}...
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1 flex-wrap">
                                    {key.permissions.map((perm) => (
                                      <Badge 
                                        key={perm} 
                                        className={
                                          perm === 'read' ? 'bg-emerald-100 text-emerald-800' :
                                          perm === 'write' ? 'bg-amber-100 text-amber-800' :
                                          'bg-red-100 text-red-800'
                                        }
                                      >
                                        {perm}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-500">
                                  {new Date(key.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500">
                                  {key.last_used ? new Date(key.last_used).toLocaleDateString() : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => revokeApiKey(key.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    data-testid={`revoke-key-${key.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    {language === 'sr' ? 'Opozovi' : 'Revoke'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* API Documentation Info */}
                  <div className="card-base bg-sky-50 border-sky-200">
                    <h3 className="text-lg font-semibold text-sky-900 mb-3 flex items-center gap-2">
                      <ExternalLink className="w-5 h-5" />
                      {language === 'sr' ? 'API Dokumentacija' : 'API Documentation'}
                    </h3>
                    <p className="text-sm text-sky-700 mb-3">
                      {language === 'sr' 
                        ? 'Koristite API ključeve za integraciju sa spoljnim sistemima. Uključite ključ u zaglavlje zahteva:'
                        : 'Use API keys to integrate with external systems. Include the key in your request header:'}
                    </p>
                    <code className="block p-3 bg-white border border-sky-200 rounded font-mono text-sm text-slate-700">
                      X-API-Key: your_api_key_here
                    </code>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Contacts/Messages Section */}
          {activeTab === 'contacts' && isAdmin() && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {language === 'sr' ? 'Poruke sa kontakt forme' : 'Contact Form Messages'}
                </h2>
                <Badge variant="outline" className="text-slate-600">
                  {contacts.filter(c => !c.is_read).length} {language === 'sr' ? 'nepročitanih' : 'unread'}
                </Badge>
              </div>
              
              {contacts.length === 0 ? (
                <div className="card-base text-center py-12">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">
                    {language === 'sr' ? 'Nema poruka' : 'No messages'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contacts.map((contact) => (
                    <div 
                      key={contact.id} 
                      className={`card-base ${!contact.is_read ? 'border-l-4 border-l-sky-500 bg-sky-50/50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                          <p className="text-sm text-slate-500">{contact.email}</p>
                          {contact.phone && (
                            <p className="text-sm text-slate-500">{contact.phone}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!contact.is_read && (
                            <Badge className="bg-sky-100 text-sky-700">
                              {language === 'sr' ? 'Novo' : 'New'}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-400">
                            {new Date(contact.created_at).toLocaleDateString('sr-RS', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {contact.subject && (
                        <p className="text-sm font-medium text-slate-700 mb-2">
                          {language === 'sr' ? 'Tema' : 'Subject'}: {contact.subject}
                        </p>
                      )}
                      
                      <p className="text-slate-600 whitespace-pre-wrap">{contact.message}</p>
                      
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                        {!contact.is_read && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => markContactRead(contact.id)}
                            className="text-sky-600 hover:text-sky-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {language === 'sr' ? 'Označi kao pročitano' : 'Mark as read'}
                          </Button>
                        )}
                        <a href={`mailto:${contact.email}`}>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {language === 'sr' ? 'Odgovori' : 'Reply'}
                          </Button>
                        </a>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            if (window.confirm(language === 'sr' ? 'Da li ste sigurni da želite da obrišete ovu poruku?' : 'Are you sure you want to delete this message?')) {
                              deleteContact(contact.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {language === 'sr' ? 'Obriši' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SMS Gateway Settings (Super Admin only) */}
          {activeTab === 'sms-settings' && isSuperAdmin() && (
            <SMSSettings language={language} />
          )}

          {/* Availability Section - StaffAvailabilityCalendar is rendered above at line 1197 */}
          </main>
        </div>
      </div>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {language === 'sr' ? 'Obriši korisnika' : 'Delete User'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {userToDelete && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-slate-700 mb-2">
                  {language === 'sr' 
                    ? 'Da li ste sigurni da želite da obrišete korisnika:'
                    : 'Are you sure you want to delete user:'}
                </p>
                <p className="font-semibold text-lg text-slate-900">{userToDelete.full_name}</p>
                <p className="text-sm text-slate-600">{userToDelete.email}</p>
                <div className="mt-2">
                  {getRoleBadge(userToDelete.role)}
                </div>
              </div>
            )}
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {language === 'sr' 
                ? 'Ova akcija se ne može poništiti!'
                : 'This action cannot be undone!'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => { setShowDeleteUserDialog(false); setUserToDelete(null); }}
              >
                {language === 'sr' ? 'Ne' : 'No'}
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteUser(userToDelete?.id)}
                disabled={deletingUser}
              >
                {deletingUser ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {language === 'sr' ? 'Da, obriši' : 'Yes, delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
