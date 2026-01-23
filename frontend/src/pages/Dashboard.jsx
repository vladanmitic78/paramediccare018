import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
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
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import CMSManager from '../components/CMSManager';
import OperationsDashboard from '../components/OperationsDashboard';
import AdminBookingNotifications from '../components/AdminBookingNotifications';
import StaffAvailabilityCalendar from '../components/StaffAvailabilityCalendar';
import InvoiceManager from '../components/InvoiceManager';
import AdminLiveMap from '../components/AdminLiveMap';

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
  const { user, logout, isAdmin } = useAuth();
  const { language, t } = useLanguage();
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
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [assigningDriver, setAssigningDriver] = useState(null);
  
  // Search states
  const [patientBookingSearch, setPatientBookingSearch] = useState('');
  const [publicBookingSearch, setPublicBookingSearch] = useState('');
  
  // Sidebar expanded groups state
  const [expandedGroups, setExpandedGroups] = useState(['operations']); // Default: operations expanded

  const isSuperAdmin = () => user?.role === 'superadmin';
  
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
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
    fetchPatientBookings();
    fetchAvailableDrivers();
  }, [user, navigate]);

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
    if (!window.confirm(language === 'sr' ? 'Da li ste sigurni da želite obrisati korisnika?' : 'Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success(language === 'sr' ? 'Korisnik obrisan' : 'User deleted');
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

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
        { id: 'bookings', icon: Calendar, label: t('dashboard_bookings') },
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
      label: language === 'sr' ? 'Flota' : 'Fleet',
      items: [
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
        { id: 'contacts', icon: MessageSquare, label: language === 'sr' ? 'Poruke' : 'Messages' },
      ]
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-100" data-testid="dashboard-page">
      {/* Admin Booking Notifications */}
      {isAdmin() && (
        <AdminBookingNotifications onViewBooking={handleViewPatientBooking} />
      )}
      
      <div className="flex">
        {/* Sidebar - New Professional Design */}
        <aside className="w-72 bg-slate-900 min-h-screen hidden lg:flex lg:flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Paramedic Care
              </h1>
              <p className="text-xs text-slate-500">018</p>
            </div>
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
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
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
          </div>
        </aside>

        {/* Mobile Navigation */}
        <div className="lg:hidden w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full overflow-x-auto flex justify-start p-2 bg-slate-900 border-b">
              {navigationGroups.flatMap(group => group.items).map((item) => (
                <TabsTrigger key={item.id} value={item.id} className="flex-shrink-0 text-white data-[state=active]:bg-white/10">
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">
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
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.patient_name}</TableCell>
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

          {/* CMS - Page Management */}
          {activeTab === 'cms' && isAdmin() && (
            <CMSManager />
          )}

          {/* Bookings */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">{t('dashboard_bookings')}</h1>
              </div>

              {/* Patient Portal Bookings Section */}
              {patientBookings.length > 0 && (
                <div className="card-base">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Ambulance className="w-5 h-5 text-red-500" />
                      {language === 'sr' ? 'Rezervacije iz Patient Portala' : 'Patient Portal Bookings'}
                      <Badge className="bg-red-100 text-red-700 ml-2">
                        {patientBookings.filter(b => b.status === 'requested').length} {language === 'sr' ? 'novih' : 'new'}
                      </Badge>
                    </h3>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder={language === 'sr' ? 'Pretraži rezervacije...' : 'Search bookings...'}
                        value={patientBookingSearch}
                        onChange={(e) => setPatientBookingSearch(e.target.value)}
                        className="pl-9"
                        data-testid="patient-booking-search"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'sr' ? 'Pacijent' : 'Patient'}</TableHead>
                          <TableHead>{language === 'sr' ? 'Datum/Vreme' : 'Date/Time'}</TableHead>
                          <TableHead>{language === 'sr' ? 'Razlog' : 'Reason'}</TableHead>
                          <TableHead>{language === 'sr' ? 'Ruta' : 'Route'}</TableHead>
                          <TableHead>{language === 'sr' ? 'Mobilnost' : 'Mobility'}</TableHead>
                          <TableHead>{t('status')}</TableHead>
                          <TableHead>{language === 'sr' ? 'Vozač' : 'Driver'}</TableHead>
                          <TableHead>{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPatientBookings.map((booking) => (
                          <TableRow key={booking.id} className={booking.status === 'requested' ? 'bg-amber-50' : ''}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{booking.patient_name}</p>
                                <p className="text-xs text-slate-500">{booking.patient_age} {language === 'sr' ? 'god.' : 'y.o.'}</p>
                                <p className="text-xs text-slate-500">{booking.contact_phone}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{booking.preferred_date}</p>
                              <p className="text-sm text-slate-500">{booking.preferred_time}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {booking.transport_reason?.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="truncate text-sm text-green-700">📍 {booking.pickup_address}</p>
                              <p className="truncate text-sm text-red-700">📍 {booking.destination_address}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                booking.mobility_status === 'stretcher' ? 'bg-red-100 text-red-700' :
                                booking.mobility_status === 'wheelchair' ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'
                              }>
                                {booking.mobility_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                booking.status === 'requested' ? 'bg-amber-100 text-amber-700' :
                                booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                booking.status === 'en_route' ? 'bg-purple-100 text-purple-700' :
                                booking.status === 'picked_up' ? 'bg-indigo-100 text-indigo-700' :
                                booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                                'bg-slate-100 text-slate-700'
                              }>
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {booking.assigned_driver_name ? (
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-700">{booking.assigned_driver_name}</span>
                                </div>
                              ) : booking.status === 'completed' || booking.status === 'cancelled' ? (
                                <span className="text-sm text-slate-400">—</span>
                              ) : (
                                <Select
                                  onValueChange={(driverId) => assignDriverToBooking(booking.id, driverId, false)}
                                  disabled={assigningDriver === booking.id}
                                >
                                  <SelectTrigger className="w-44" data-testid={`assign-driver-${booking.id}`}>
                                    <SelectValue placeholder={
                                      assigningDriver === booking.id 
                                        ? (language === 'sr' ? 'Dodeljujem...' : 'Assigning...') 
                                        : (language === 'sr' ? 'Dodeli vozača' : 'Assign Driver')
                                    } />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(() => {
                                      const sortedDrivers = getDriversSortedByDistance(booking.pickup_lat, booking.pickup_lng);
                                      if (sortedDrivers.length === 0) {
                                        return (
                                          <SelectItem value="none" disabled>
                                            {language === 'sr' ? 'Nema dostupnih vozača' : 'No available drivers'}
                                          </SelectItem>
                                        );
                                      }
                                      return sortedDrivers.map((driver) => (
                                        <SelectItem key={driver.id} value={driver.id}>
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                              driver.driver_status === 'available' ? 'bg-green-500' : 'bg-slate-400'
                                            }`} />
                                            <span>{driver.full_name}</span>
                                            {driver.distance !== Infinity && (
                                              <span className="text-xs text-slate-400 ml-1">
                                                ({driver.distance.toFixed(1)} km)
                                              </span>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ));
                                    })()}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={booking.status}
                                onValueChange={(value) => updatePatientBookingStatus(booking.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="requested">{language === 'sr' ? 'Zahtev' : 'Requested'}</SelectItem>
                                  <SelectItem value="confirmed">{language === 'sr' ? 'Potvrđeno' : 'Confirmed'}</SelectItem>
                                  <SelectItem value="en_route">{language === 'sr' ? 'Na putu' : 'En Route'}</SelectItem>
                                  <SelectItem value="picked_up">{language === 'sr' ? 'Preuzeto' : 'Picked Up'}</SelectItem>
                                  <SelectItem value="completed">{language === 'sr' ? 'Završeno' : 'Completed'}</SelectItem>
                                  <SelectItem value="cancelled">{language === 'sr' ? 'Otkazano' : 'Cancelled'}</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Original Public Bookings */}
              <div className="card-base overflow-x-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {language === 'sr' ? 'Javne Rezervacije' : 'Public Bookings'}
                  </h3>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder={language === 'sr' ? 'Pretraži rezervacije...' : 'Search bookings...'}
                      value={publicBookingSearch}
                      onChange={(e) => setPublicBookingSearch(e.target.value)}
                      className="pl-9"
                      data-testid="public-booking-search"
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'sr' ? 'Pacijent' : 'Patient'}</TableHead>
                      <TableHead>{language === 'sr' ? 'Datum' : 'Date'}</TableHead>
                      <TableHead>{language === 'sr' ? 'Kontakt' : 'Contact'}</TableHead>
                      <TableHead>{language === 'sr' ? 'Ruta' : 'Route'}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{language === 'sr' ? 'Vozač' : 'Driver'}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPublicBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.patient_name}</TableCell>
                        <TableCell>{booking.booking_date}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{booking.contact_phone}</p>
                            <p className="text-slate-500">{booking.contact_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate text-sm">{booking.start_point}</p>
                          <p className="truncate text-sm text-slate-500">→ {booking.end_point}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell>
                          {booking.assigned_driver_name ? (
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">{booking.assigned_driver_name}</span>
                            </div>
                          ) : booking.status === 'completed' || booking.status === 'cancelled' ? (
                            <span className="text-sm text-slate-400">—</span>
                          ) : isAdmin() ? (
                            <Select
                              onValueChange={(driverId) => assignDriverToBooking(booking.id, driverId, true)}
                              disabled={assigningDriver === booking.id}
                            >
                              <SelectTrigger className="w-44" data-testid={`assign-driver-public-${booking.id}`}>
                                <SelectValue placeholder={
                                  assigningDriver === booking.id 
                                    ? (language === 'sr' ? 'Dodeljujem...' : 'Assigning...') 
                                    : (language === 'sr' ? 'Dodeli vozača' : 'Assign Driver')
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {(() => {
                                  const sortedDrivers = getDriversSortedByDistance(booking.start_lat, booking.start_lng);
                                  if (sortedDrivers.length === 0) {
                                    return (
                                      <SelectItem value="none" disabled>
                                        {language === 'sr' ? 'Nema dostupnih vozača' : 'No available drivers'}
                                      </SelectItem>
                                    );
                                  }
                                  return sortedDrivers.map((driver) => (
                                    <SelectItem key={driver.id} value={driver.id}>
                                      <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${
                                          driver.driver_status === 'available' ? 'bg-green-500' : 'bg-slate-400'
                                        }`} />
                                        <span>{driver.full_name}</span>
                                        {driver.distance !== Infinity && (
                                          <span className="text-xs text-slate-400 ml-1">
                                            ({driver.distance.toFixed(1)} km)
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ));
                                })()}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isAdmin() && (
                              <>
                                <Select
                                  defaultValue={booking.status}
                                  onValueChange={(value) => updateBookingStatus(booking.id, value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">{t('pending')}</SelectItem>
                                    <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
                                    <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                                    <SelectItem value="completed">{t('completed')}</SelectItem>
                                    <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteBooking(booking.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {['driver', 'doctor', 'nurse'].includes(user?.role) && booking.status !== 'completed' && (
                              <Button
                                size="sm"
                                onClick={() => updateBookingStatus(
                                  booking.id, 
                                  booking.status === 'pending' ? 'in_progress' : 'completed'
                                )}
                              >
                                {booking.status === 'pending' ? (
                                  <><Truck className="w-4 h-4 mr-1" /> Start</>
                                ) : (
                                  <><CheckCircle className="w-4 h-4 mr-1" /> Complete</>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Users (Admin only) */}
          {activeTab === 'users' && isAdmin() && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">{t('dashboard_users')}</h1>
                <div className="text-sm text-slate-500">
                  {isSuperAdmin() 
                    ? (language === 'sr' ? 'Super Admin - Puna kontrola' : 'Super Admin - Full Control')
                    : (language === 'sr' ? 'Admin - Upravljanje ulogama' : 'Admin - Role Management')}
                </div>
              </div>

              <div className="card-base overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'sr' ? 'Ime' : 'Name'}</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>{language === 'sr' ? 'Telefon' : 'Phone'}</TableHead>
                      <TableHead>{language === 'sr' ? 'Uloga' : 'Role'}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.phone || '-'}</TableCell>
                        <TableCell>
                          {/* Admin can change roles, but not their own or superadmin's */}
                          {(u.id === user?.id || u.role === 'superadmin') ? (
                            getRoleBadge(u.role)
                          ) : (
                            <Select
                              defaultValue={u.role}
                              onValueChange={(value) => updateUserRole(u.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="regular">{language === 'sr' ? 'Korisnik' : 'User'}</SelectItem>
                                <SelectItem value="doctor">{language === 'sr' ? 'Lekar' : 'Doctor'}</SelectItem>
                                <SelectItem value="nurse">{language === 'sr' ? 'Sestra' : 'Nurse'}</SelectItem>
                                <SelectItem value="driver">{language === 'sr' ? 'Vozač' : 'Driver'}</SelectItem>
                                {isSuperAdmin() && (
                                  <SelectItem value="admin">Admin</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-800">
                              {language === 'sr' ? 'Aktivan' : 'Active'}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              {language === 'sr' ? 'Neaktivan' : 'Inactive'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Can't modify own account or superadmin (unless you are superadmin) */}
                            {u.id !== user?.id && (u.role !== 'superadmin' || isSuperAdmin()) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleUserStatus(u.id, u.is_active)}
                                  className={u.is_active ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}
                                  title={u.is_active ? (language === 'sr' ? 'Deaktiviraj' : 'Deactivate') : (language === 'sr' ? 'Aktiviraj' : 'Activate')}
                                >
                                  {u.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                </Button>
                                {/* Only Super Admin can delete users */}
                                {isSuperAdmin() && u.role !== 'superadmin' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteUser(u.id)}
                                    className="text-red-600 hover:text-red-700"
                                    title={language === 'sr' ? 'Obriši' : 'Delete'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Role Legend */}
              <div className="card-base">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  {language === 'sr' ? 'Legenda Uloga' : 'Role Legend'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    {getRoleBadge('superadmin')}
                    <span className="text-slate-500">{language === 'sr' ? 'Puna kontrola' : 'Full control'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge('admin')}
                    <span className="text-slate-500">{language === 'sr' ? 'Upravljanje' : 'Management'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge('doctor')}
                    <span className="text-slate-500">{language === 'sr' ? 'Med. slučajevi' : 'Med. cases'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge('nurse')}
                    <span className="text-slate-500">{language === 'sr' ? 'Med. nega' : 'Med. care'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge('driver')}
                    <span className="text-slate-500">{language === 'sr' ? 'Transport' : 'Transport'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge('regular')}
                    <span className="text-slate-500">{language === 'sr' ? 'Pacijent' : 'Patient'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contacts (Admin only) */}
          {activeTab === 'contacts' && isAdmin() && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-slate-900">{t('dashboard_contacts')}</h1>

              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div 
                    key={contact.id} 
                    className={`card-base ${!contact.is_read ? 'border-l-4 border-l-sky-500' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-slate-900">{contact.name}</p>
                          {!contact.is_read && (
                            <Badge className="bg-sky-100 text-sky-800">
                              {language === 'sr' ? 'Novo' : 'New'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mb-1">{contact.email} | {contact.phone || '-'}</p>
                        <p className="text-slate-600">{contact.message}</p>
                        <p className="text-xs text-slate-400 mt-2">{contact.created_at}</p>
                      </div>
                      {!contact.is_read && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markContactRead(contact.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {language === 'sr' ? 'Označi kao pročitano' : 'Mark as read'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Availability Section - StaffAvailabilityCalendar is rendered above at line 1197 */}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
