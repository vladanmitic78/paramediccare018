import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Phone,
  Truck,
  RefreshCw,
  Search,
  Filter,
  List,
  Grid3X3,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status colors and labels
const statusConfig = {
  pending: { color: 'bg-amber-500', label: { sr: 'Na čekanju', en: 'Pending' } },
  confirmed: { color: 'bg-sky-500', label: { sr: 'Potvrđeno', en: 'Confirmed' } },
  en_route: { color: 'bg-purple-500', label: { sr: 'Na putu', en: 'En Route' } },
  on_site: { color: 'bg-indigo-500', label: { sr: 'Na lokaciji', en: 'On Site' } },
  in_progress: { color: 'bg-blue-500', label: { sr: 'U toku', en: 'In Progress' } },
  completed: { color: 'bg-emerald-500', label: { sr: 'Završeno', en: 'Completed' } },
  cancelled: { color: 'bg-red-500', label: { sr: 'Otkazano', en: 'Cancelled' } }
};

const BookingCalendar = () => {
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day'
  const [bookings, setBookings] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch bookings and schedules
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get date range based on view
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);
      
      if (view === 'month') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
      } else if (view === 'week') {
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day + 1); // Monday
        endDate.setDate(startDate.getDate() + 6); // Sunday
      }
      
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      const [bookingsRes, patientBookingsRes, schedulesRes] = await Promise.all([
        axios.get(`${API}/bookings`),
        axios.get(`${API}/admin/patient-bookings`),
        axios.get(`${API}/fleet/schedules?date=${startStr}`)
      ]);
      
      // Combine both types of bookings
      const allBookings = [
        ...bookingsRes.data.map(b => ({ ...b, type: 'booking' })),
        ...patientBookingsRes.data.map(b => ({ 
          ...b, 
          type: 'patient_booking',
          booking_date: b.preferred_date,
          booking_time: b.preferred_time
        }))
      ];
      
      setBookings(allBookings);
      setSchedules(schedulesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation functions
  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => {
      const bookingDate = booking.booking_date || booking.preferred_date;
      const matchesDate = bookingDate === dateStr;
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      const matchesSearch = !searchQuery || 
        booking.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.contact_phone?.includes(searchQuery);
      return matchesDate && matchesStatus && matchesSearch;
    });
  };

  // Generate calendar days for month view
  const generateMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Add days from previous month
    const startDay = firstDay.getDay() || 7; // Convert Sunday (0) to 7
    for (let i = startDay - 1; i > 0; i--) {
      const day = new Date(year, month, 1 - i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push({ date: day, isCurrentMonth: true });
    }
    
    // Add days from next month to complete grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(year, month + 1, i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    return days;
  };

  // Generate week days
  const generateWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day + 1); // Start from Monday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  // Format date for display
  const formatMonthYear = () => {
    const options = { month: 'long', year: 'numeric' };
    return currentDate.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', options);
  };

  const formatWeekRange = () => {
    const days = generateWeekDays();
    const start = days[0].toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', { day: 'numeric', month: 'short' });
    const end = days[6].toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Day names
  const dayNames = language === 'sr' 
    ? ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Render month view
  const renderMonthView = () => {
    const days = generateMonthDays();
    
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-slate-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((dayObj, idx) => {
            const dayBookings = getBookingsForDate(dayObj.date);
            const hasBookings = dayBookings.length > 0;
            
            return (
              <div
                key={idx}
                className={`min-h-[120px] p-2 border-b border-r border-slate-100 ${
                  !dayObj.isCurrentMonth ? 'bg-slate-50' : 'bg-white'
                } ${isToday(dayObj.date) ? 'bg-sky-50' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  !dayObj.isCurrentMonth ? 'text-slate-400' : 
                  isToday(dayObj.date) ? 'text-sky-600' : 'text-slate-700'
                }`}>
                  {dayObj.date.getDate()}
                </div>
                
                {/* Booking indicators */}
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((booking, i) => (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={`text-xs p-1 rounded cursor-pointer truncate ${
                        statusConfig[booking.status]?.color || 'bg-slate-400'
                      } text-white hover:opacity-80 transition-opacity`}
                      title={`${booking.booking_time || ''} - ${booking.patient_name}`}
                    >
                      {booking.booking_time && <span className="font-medium">{booking.booking_time} </span>}
                      {booking.patient_name?.split(' ')[0]}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-slate-500 pl-1">
                      +{dayBookings.length - 3} {language === 'sr' ? 'više' : 'more'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const days = generateWeekDays();
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 to 21:00
    
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-8 bg-slate-50 border-b border-slate-200">
          <div className="p-3 text-center text-sm font-medium text-slate-400 border-r border-slate-200">
            {language === 'sr' ? 'Vreme' : 'Time'}
          </div>
          {days.map((day, idx) => (
            <div 
              key={idx} 
              className={`p-3 text-center border-r border-slate-200 ${
                isToday(day) ? 'bg-sky-100' : ''
              }`}
            >
              <div className="text-xs text-slate-500">{dayNames[idx]}</div>
              <div className={`text-lg font-semibold ${isToday(day) ? 'text-sky-600' : 'text-slate-700'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
        
        {/* Time grid */}
        <div className="overflow-auto max-h-[600px]">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-slate-100">
              {/* Time column */}
              <div className="p-2 text-xs text-slate-500 border-r border-slate-200 text-right pr-3">
                {`${hour.toString().padStart(2, '0')}:00`}
              </div>
              
              {/* Day columns */}
              {days.map((day, dayIdx) => {
                const dayBookings = getBookingsForDate(day).filter(b => {
                  const time = b.booking_time || b.preferred_time;
                  if (!time) return false;
                  const bookingHour = parseInt(time.split(':')[0]);
                  return bookingHour === hour;
                });
                
                return (
                  <div 
                    key={dayIdx} 
                    className={`p-1 min-h-[50px] border-r border-slate-100 ${
                      isToday(day) ? 'bg-sky-50/30' : ''
                    }`}
                  >
                    {dayBookings.map(booking => (
                      <div
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className={`text-xs p-1.5 rounded cursor-pointer mb-1 ${
                          statusConfig[booking.status]?.color || 'bg-slate-400'
                        } text-white hover:opacity-80 transition-opacity`}
                      >
                        <div className="font-medium truncate">{booking.patient_name?.split(' ')[0]}</div>
                        <div className="text-[10px] opacity-80 truncate">
                          {booking.booking_time}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);
    const hours = Array.from({ length: 16 }, (_, i) => i + 6);
    
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Day header */}
        <div className={`p-4 text-center border-b border-slate-200 ${isToday(currentDate) ? 'bg-sky-100' : 'bg-slate-50'}`}>
          <div className="text-sm text-slate-500">
            {currentDate.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', { weekday: 'long' })}
          </div>
          <div className={`text-2xl font-bold ${isToday(currentDate) ? 'text-sky-600' : 'text-slate-700'}`}>
            {currentDate.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {dayBookings.length} {language === 'sr' ? 'rezervacija' : 'bookings'}
          </div>
        </div>
        
        {/* Timeline */}
        <div className="grid grid-cols-[80px_1fr] overflow-auto max-h-[600px]">
          {hours.map(hour => {
            const hourBookings = dayBookings.filter(b => {
              const time = b.booking_time || b.preferred_time;
              if (!time) return false;
              const bookingHour = parseInt(time.split(':')[0]);
              return bookingHour === hour;
            });
            
            return (
              <div key={hour} className="contents">
                {/* Time */}
                <div className="p-3 text-sm text-slate-500 border-r border-b border-slate-100 text-right">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                
                {/* Bookings */}
                <div className="p-2 border-b border-slate-100 min-h-[60px]">
                  {hourBookings.map(booking => (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={`p-3 rounded-lg cursor-pointer mb-2 ${
                        statusConfig[booking.status]?.color || 'bg-slate-400'
                      } text-white hover:opacity-90 transition-opacity`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{booking.patient_name}</div>
                        <Badge className="bg-white/20 text-white text-xs">
                          {booking.booking_time}
                        </Badge>
                      </div>
                      <div className="text-sm opacity-90 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {booking.start_point || booking.pickup_address || 'N/A'}
                      </div>
                      {booking.assigned_driver_name && (
                        <div className="text-sm opacity-90 mt-1 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {booking.assigned_driver_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Booking detail modal
  const renderBookingModal = () => {
    if (!selectedBooking) return null;
    
    const status = statusConfig[selectedBooking.status];
    
    return (
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${status?.color || 'bg-slate-400'} flex items-center justify-center`}>
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-lg">{selectedBooking.patient_name}</div>
                <Badge className={`${status?.color || 'bg-slate-400'} text-white`}>
                  {status?.label[language] || selectedBooking.status}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Date & Time */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Clock className="w-5 h-5 text-slate-500" />
              <div>
                <div className="text-sm text-slate-500">
                  {language === 'sr' ? 'Datum i vreme' : 'Date & Time'}
                </div>
                <div className="font-medium">
                  {selectedBooking.booking_date || selectedBooking.preferred_date} • {selectedBooking.booking_time || selectedBooking.preferred_time || 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Phone */}
            {selectedBooking.contact_phone && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Phone className="w-5 h-5 text-slate-500" />
                <div>
                  <div className="text-sm text-slate-500">
                    {language === 'sr' ? 'Telefon' : 'Phone'}
                  </div>
                  <a href={`tel:${selectedBooking.contact_phone}`} className="font-medium text-sky-600 hover:underline">
                    {selectedBooking.contact_phone}
                  </a>
                </div>
              </div>
            )}
            
            {/* Pickup */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <MapPin className="w-5 h-5 text-emerald-500" />
              <div>
                <div className="text-sm text-slate-500">
                  {language === 'sr' ? 'Polazna adresa' : 'Pickup Address'}
                </div>
                <div className="font-medium">
                  {selectedBooking.start_point || selectedBooking.pickup_address || 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Destination */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <MapPin className="w-5 h-5 text-red-500" />
              <div>
                <div className="text-sm text-slate-500">
                  {language === 'sr' ? 'Odredišna adresa' : 'Destination'}
                </div>
                <div className="font-medium">
                  {selectedBooking.end_point || selectedBooking.destination_address || 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Assigned Vehicle/Driver */}
            {selectedBooking.assigned_driver_name && (
              <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-lg border border-sky-200">
                <Truck className="w-5 h-5 text-sky-600" />
                <div>
                  <div className="text-sm text-sky-600">
                    {language === 'sr' ? 'Dodeljeno vozilo' : 'Assigned Vehicle'}
                  </div>
                  <div className="font-medium text-sky-800">
                    {selectedBooking.assigned_driver_name}
                  </div>
                </div>
              </div>
            )}
            
            {/* Notes */}
            {selectedBooking.notes && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-sm text-amber-700 font-medium mb-1">
                  {language === 'sr' ? 'Napomene' : 'Notes'}
                </div>
                <div className="text-amber-800">{selectedBooking.notes}</div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSelectedBooking(null)}>
              {language === 'sr' ? 'Zatvori' : 'Close'}
            </Button>
            <Button 
              className="flex-1 bg-sky-600 hover:bg-sky-700"
              onClick={() => {
                // Navigate to fleet dispatch with this booking
                window.location.href = `/dashboard?tab=vehicles`;
              }}
            >
              {language === 'sr' ? 'Dodeli vozilo' : 'Assign Vehicle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="booking-calendar">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {language === 'sr' ? 'Kalendar rezervacija' : 'Booking Calendar'}
          </h2>
          <p className="text-slate-500">
            {bookings.length} {language === 'sr' ? 'ukupno rezervacija' : 'total bookings'}
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={language === 'sr' ? 'Pretraži...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-48"
            />
          </div>
          
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'sr' ? 'Svi statusi' : 'All statuses'}</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.color}`} />
                    {config.label[language]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="rounded-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className="rounded-none border-l border-r border-slate-200"
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('day')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-200">
        <Button variant="outline" onClick={navigatePrev}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-800">
            {view === 'month' && formatMonthYear()}
            {view === 'week' && formatWeekRange()}
            {view === 'day' && currentDate.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
            })}
          </div>
          <Button variant="link" className="text-sky-600" onClick={goToToday}>
            {language === 'sr' ? 'Danas' : 'Today'}
          </Button>
        </div>
        
        <Button variant="outline" onClick={navigateNext}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Calendar View */}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}
      
      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-xl">
        <span className="text-sm text-slate-500 font-medium">
          {language === 'sr' ? 'Legenda:' : 'Legend:'}
        </span>
        {Object.entries(statusConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.color}`} />
            <span className="text-sm text-slate-600">{config.label[language]}</span>
          </div>
        ))}
      </div>
      
      {/* Booking Modal */}
      {renderBookingModal()}
    </div>
  );
};

export default BookingCalendar;
