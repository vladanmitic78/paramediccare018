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
  Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import CMSManager from '../components/CMSManager';
import OperationsDashboard from '../components/OperationsDashboard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  
  const [mainView, setMainView] = useState('operations'); // 'operations' or 'admin'
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);

  const isSuperAdmin = () => user?.role === 'superadmin';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
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

  const sidebarItems = [
    { id: 'overview', icon: LayoutDashboard, label: language === 'sr' ? 'Pregled' : 'Overview' },
    { id: 'bookings', icon: Calendar, label: t('dashboard_bookings') },
    ...(isAdmin() ? [
      { id: 'cms', icon: Globe, label: language === 'sr' ? 'Upravljanje Stranicama' : 'Page Management' },
      { id: 'users', icon: Users, label: t('dashboard_users') },
      { id: 'contacts', icon: MessageSquare, label: t('dashboard_contacts') },
      { id: 'services', icon: FileText, label: t('dashboard_services') },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50" data-testid="dashboard-page">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-screen p-4 hidden lg:flex lg:flex-col">
          {/* Logo and User */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <HeartPulse size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Paramedic<span className="text-sky-600">018</span>
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-sm font-semibold text-slate-900">{user?.full_name}</p>
              <div className="flex items-center gap-2 mt-1">
                {getRoleBadge(user?.role)}
              </div>
            </div>
          </div>

          {/* Main View Switcher */}
          <div className="mb-6">
            <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              {language === 'sr' ? 'Glavni Prikaz' : 'Main View'}
            </p>
            <div className="space-y-1">
              <button 
                onClick={() => setMainView('operations')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  mainView === 'operations' 
                    ? 'bg-sky-600 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                data-testid="main-view-operations"
              >
                <Navigation size={20} />
                {language === 'sr' ? 'Operacije' : 'Operations'}
              </button>
              <button 
                onClick={() => { setMainView('admin'); setActiveTab('overview'); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  mainView === 'admin' 
                    ? 'bg-sky-600 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                data-testid="main-view-admin"
              >
                <Settings size={20} />
                {language === 'sr' ? 'Administracija' : 'Administration'}
              </button>
            </div>
          </div>

          {/* Admin Navigation - only show when in admin view */}
          {mainView === 'admin' && (
            <>
              <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {language === 'sr' ? 'Admin Meni' : 'Admin Menu'}
              </p>
              <nav className="space-y-1 flex-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === item.id 
                        ? 'bg-slate-100 text-slate-900' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    data-testid={`sidebar-${item.id}`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </>
          )}

          {/* Operations Quick Stats - only show when in operations view */}
          {mainView === 'operations' && (
            <div className="flex-1">
              <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {language === 'sr' ? 'Brzi Status' : 'Quick Status'}
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-emerald-700">
                      {language === 'sr' ? 'Sistem Aktivan' : 'System Active'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {language === 'sr' ? 'Aktivni Transporti' : 'Active Transports'}
                  </p>
                  <p className="text-lg font-black text-slate-900">{bookings.filter(b => b.status === 'in_progress').length}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {language === 'sr' ? 'Na Čekanju' : 'Pending'}
                  </p>
                  <p className="text-lg font-black text-slate-900">{bookings.filter(b => b.status === 'pending').length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <div className="mt-auto pt-6 border-t border-slate-200">
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
              {t('nav_logout')}
            </button>
          </div>
        </aside>

        {/* Mobile Tabs */}
        <div className="lg:hidden w-full">
          <div className="bg-white border-b p-2 flex gap-2">
            <button 
              onClick={() => setMainView('operations')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${mainView === 'operations' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {language === 'sr' ? 'Operacije' : 'Operations'}
            </button>
            <button 
              onClick={() => setMainView('admin')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${mainView === 'admin' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {language === 'sr' ? 'Admin' : 'Admin'}
            </button>
          </div>
          {mainView === 'admin' && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full overflow-x-auto flex justify-start p-2 bg-white border-b">
                {sidebarItems.map((item) => (
                  <TabsTrigger key={item.id} value={item.id} className="flex-shrink-0">
                    <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          )}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {/* Operations Dashboard View */}
          {mainView === 'operations' && (
            <OperationsDashboard />
          )}

          {/* Admin Views */}
          {mainView === 'admin' && (
            <>
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

              <div className="card-base overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'sr' ? 'Pacijent' : 'Patient'}</TableHead>
                      <TableHead>{language === 'sr' ? 'Datum' : 'Date'}</TableHead>
                      <TableHead>{language === 'sr' ? 'Kontakt' : 'Contact'}</TableHead>
                      <TableHead>{language === 'sr' ? 'Ruta' : 'Route'}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
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
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
