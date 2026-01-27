import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Menu, 
  X, 
  ChevronDown, 
  Phone, 
  CalendarDays, 
  Clock, 
  MapPin, 
  User,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, isAdmin, isStaff } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerContent, setHeaderContent] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [showBookings, setShowBookings] = useState(false);

  // Fetch header content from CMS
  useEffect(() => {
    const fetchHeaderContent = async () => {
      try {
        const response = await axios.get(`${API}/api/pages/header`);
        const content = {};
        response.data.forEach(item => {
          content[item.section] = item;
        });
        setHeaderContent(content);
      } catch (error) {
        console.log('Using default header content');
      }
    };
    fetchHeaderContent();
  }, []);

  // Fetch user's future bookings when menu opens
  const fetchUserBookings = async () => {
    if (!user) return;
    setLoadingBookings(true);
    try {
      // For patients, fetch their bookings; for staff, fetch all upcoming
      const endpoint = user.role === 'patient' 
        ? `${API}/api/patient/bookings`
        : `${API}/api/bookings`;
      
      const response = await axios.get(endpoint);
      const bookings = Array.isArray(response.data) ? response.data : [];
      
      // Filter for future/active bookings only
      const now = new Date();
      const futureBookings = bookings.filter(b => {
        const bookingDate = new Date(b.scheduled_date || b.created_at);
        const isUpcoming = bookingDate >= now || ['pending', 'confirmed', 'en_route', 'on_site', 'transporting'].includes(b.status);
        return isUpcoming;
      }).slice(0, 5); // Limit to 5 bookings
      
      setUserBookings(futureBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setUserBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Fetch bookings when showing the bookings panel
  useEffect(() => {
    if (showBookings && user) {
      fetchUserBookings();
    }
  }, [showBookings, user]);

  // Format date for display
  const formatBookingDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-blue-100 text-blue-700',
      en_route: 'bg-purple-100 text-purple-700',
      on_site: 'bg-orange-100 text-orange-700',
      transporting: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-slate-100 text-slate-600',
      cancelled: 'bg-red-100 text-red-600'
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  // Get status label
  const getStatusLabel = (status) => {
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

  // Get logo URL from CMS or use default
  const logoUrl = headerContent?.logo?.image_url || 
    'https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg';
  
  // Get emergency phone from CMS or use default
  const emergencyPhone = headerContent?.['emergency-banner']?.[language === 'sr' ? 'content_sr' : 'content_en'] || '+381 18 123 456';

  const navItems = [
    { path: '/', label: t('nav_home') },
    { path: '/medical-care', label: t('nav_medical'), color: 'text-sky-600' },
    { path: '/transport', label: t('nav_transport'), color: 'text-red-600' },
    { path: '/booking', label: t('nav_booking') },
    { path: '/about', label: t('nav_about') },
    { path: '/contact', label: t('nav_contact') },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="glass-header sticky top-0 z-50 border-b border-slate-200/50" data-testid="header">
      <div className="section-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 group"
            data-testid="logo-link"
          >
            <img 
              src={logoUrl}
              alt="Paramedic Care 018"
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-slate-100 text-slate-900'
                    : `text-slate-600 hover:text-slate-900 hover:bg-slate-50 ${item.color || ''}`
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  data-testid="language-switcher"
                >
                  <img 
                    src={language === 'sr' 
                      ? 'https://flagcdn.com/w40/rs.png'
                      : 'https://flagcdn.com/w40/gb.png'
                    }
                    alt={language === 'sr' ? 'Serbian' : 'English'}
                    className="w-5 h-4 object-cover rounded-sm"
                  />
                  <span className="hidden sm:inline uppercase text-xs font-semibold">
                    {language}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setLanguage('sr')}
                  data-testid="lang-sr"
                >
                  <img 
                    src="https://flagcdn.com/w40/rs.png"
                    alt="Serbian"
                    className="w-5 h-4 object-cover rounded-sm mr-2"
                  />
                  Srpski
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage('en')}
                  data-testid="lang-en"
                >
                  <img 
                    src="https://flagcdn.com/w40/gb.png"
                    alt="English"
                    className="w-5 h-4 object-cover rounded-sm mr-2"
                  />
                  English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auth Buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 rounded-full"
                    data-testid="user-menu"
                  >
                    <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-sky-700">
                        {user.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden sm:inline text-sm">{user.full_name?.split(' ')[0]}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isStaff() && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" data-testid="nav-dashboard">
                        {t('nav_dashboard')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={logout}
                    className="text-red-600"
                    data-testid="logout-btn"
                  >
                    {t('nav_logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button 
                  size="sm" 
                  className="btn-primary"
                  data-testid="login-btn"
                >
                  {t('nav_login')}
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button - Using Sheet for better UX */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  data-testid="mobile-menu-btn"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0">
                <SheetHeader className="p-4 border-b bg-slate-50">
                  <SheetTitle className="flex items-center gap-3">
                    <img 
                      src={logoUrl}
                      alt="PC018"
                      className="h-8 w-auto object-contain"
                    />
                    <span className="text-lg font-bold text-slate-900">PC018</span>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col h-[calc(100vh-80px)] overflow-y-auto">
                  {/* User Info Section */}
                  {user && (
                    <div className="p-4 bg-gradient-to-r from-sky-50 to-indigo-50 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {user.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{user.full_name}</p>
                          <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions for Logged-in Users */}
                  {user && (
                    <div className="p-4 border-b">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        {language === 'sr' ? 'Brze akcije' : 'Quick Actions'}
                      </p>
                      <div className="space-y-1">
                        {/* My Bookings Button */}
                        <button
                          onClick={() => setShowBookings(!showBookings)}
                          className="w-full flex items-center justify-between p-3 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors"
                          data-testid="menu-my-bookings"
                        >
                          <div className="flex items-center gap-3">
                            <CalendarDays className="w-5 h-5 text-sky-600" />
                            <span className="font-medium text-slate-900">
                              {language === 'sr' ? 'Moje rezervacije' : 'My Bookings'}
                            </span>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showBookings ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Bookings Panel */}
                        {showBookings && (
                          <div className="mt-2 ml-2 pl-4 border-l-2 border-sky-200">
                            {loadingBookings ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
                              </div>
                            ) : userBookings.length > 0 ? (
                              <div className="space-y-2">
                                {userBookings.map((booking, idx) => (
                                  <div 
                                    key={booking.id || idx}
                                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm"
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <p className="font-medium text-slate-900 text-sm">
                                        {booking.patient_name || booking.service_type || 'Transport'}
                                      </p>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(booking.status)}`}>
                                        {getStatusLabel(booking.status)}
                                      </span>
                                    </div>
                                    {(booking.scheduled_date || booking.pickup_time) && (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatBookingDate(booking.scheduled_date || booking.pickup_time)}
                                      </div>
                                    )}
                                    {(booking.pickup_address || booking.start_point) && (
                                      <div className="flex items-start gap-1.5 text-xs text-slate-500">
                                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                        <span className="line-clamp-1">{booking.pickup_address || booking.start_point}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {user.role === 'patient' && (
                                  <Link
                                    to="/patient/bookings"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block text-center text-sm text-sky-600 hover:text-sky-700 font-medium py-2"
                                  >
                                    {language === 'sr' ? 'Prikaži sve →' : 'View all →'}
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 py-3">
                                {language === 'sr' ? 'Nema aktivnih rezervacija' : 'No active bookings'}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Dashboard Link for Staff */}
                        {isStaff() && (
                          <Link
                            to="/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                            <span className="font-medium text-slate-900">
                              {language === 'sr' ? 'Kontrolna tabla' : 'Dashboard'}
                            </span>
                          </Link>
                        )}

                        {/* Patient Portal for Patients */}
                        {user.role === 'patient' && (
                          <Link
                            to="/patient"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <User className="w-5 h-5 text-emerald-600" />
                            <span className="font-medium text-slate-900">
                              {language === 'sr' ? 'Moj portal' : 'My Portal'}
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Navigation Links */}
                  <div className="p-4 flex-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      {language === 'sr' ? 'Navigacija' : 'Navigation'}
                    </p>
                    <div className="space-y-1">
                      {navItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                            isActive(item.path)
                              ? 'bg-slate-100 text-slate-900'
                              : `text-slate-600 hover:bg-slate-50 ${item.color || ''}`
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Section - Login/Logout */}
                  <div className="p-4 border-t mt-auto">
                    {user ? (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                          navigate('/');
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        {language === 'sr' ? 'Odjavi se' : 'Logout'}
                      </Button>
                    ) : (
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full btn-primary">
                          {t('nav_login')}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
