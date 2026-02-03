/**
 * BookingCalendarView - Calendar view for all bookings
 * Shows bookings in a monthly calendar grid with day detail view
 */
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Truck,
  Phone,
  RefreshCw,
  Filter,
  Plus,
  Eye,
  List,
  Grid3X3
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Status colors
const statusColors = {
  pending: 'bg-amber-500',
  confirmed: 'bg-blue-500',
  assigned: 'bg-purple-500',
  en_route: 'bg-sky-500',
  in_transit: 'bg-violet-500',
  arrived: 'bg-cyan-500',
  picked_up: 'bg-indigo-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-500'
};

const statusLabels = {
  pending: { sr: 'Čeka', en: 'Pending' },
  confirmed: { sr: 'Potvrđeno', en: 'Confirmed' },
  assigned: { sr: 'Dodeljeno', en: 'Assigned' },
  en_route: { sr: 'Na putu', en: 'En Route' },
  in_transit: { sr: 'U transportu', en: 'In Transit' },
  arrived: { sr: 'Stigao', en: 'Arrived' },
  picked_up: { sr: 'Preuzet', en: 'Picked Up' },
  completed: { sr: 'Završeno', en: 'Completed' },
  cancelled: { sr: 'Otkazano', en: 'Cancelled' }
};

const BookingCalendarView = ({ language = 'sr', onBookingSelect = null }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'list'

  // Get days in month
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysCount; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month days to fill grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentDate]);

  // Fetch bookings for the current month
  useEffect(() => {
    fetchBookings();
  }, [currentDate]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 2, 0).toISOString().split('T')[0];
      
      const response = await axios.get(`${API}/api/bookings?start_date=${startDate}&end_date=${endDate}`);
      setBookings(response.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading bookings');
    } finally {
      setLoading(false);
    }
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => {
      const bookingDate = b.booking_date || (b.pickup_datetime && b.pickup_datetime.split('T')[0]);
      const matchesDate = bookingDate === dateStr;
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesDate && matchesStatus;
    });
  };

  // Navigation
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Format month name
  const monthNames = language === 'sr'
    ? ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = language === 'sr'
    ? ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get all bookings for list view
  const filteredBookings = useMemo(() => {
    return bookings
      .filter(b => statusFilter === 'all' || b.status === statusFilter)
      .sort((a, b) => {
        const dateA = a.booking_date || a.pickup_datetime?.split('T')[0];
        const dateB = b.booking_date || b.pickup_datetime?.split('T')[0];
        return dateA?.localeCompare(dateB);
      });
  }, [bookings, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const monthBookings = bookings.filter(b => {
      const date = new Date(b.booking_date || b.pickup_datetime);
      return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
    });
    
    return {
      total: monthBookings.length,
      pending: monthBookings.filter(b => b.status === 'pending').length,
      confirmed: monthBookings.filter(b => b.status === 'confirmed').length,
      completed: monthBookings.filter(b => b.status === 'completed').length,
      cancelled: monthBookings.filter(b => b.status === 'cancelled').length
    };
  }, [bookings, currentDate]);

  return (
    <div className="space-y-4" data-testid="booking-calendar-view">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <CalendarIcon className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {language === 'sr' ? 'Kalendar rezervacija' : 'Booking Calendar'}
            </h2>
            <p className="text-sm text-slate-500">
              {stats.total} {language === 'sr' ? 'rezervacija ovog meseca' : 'bookings this month'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="rounded-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'sr' ? 'Svi statusi' : 'All Status'}</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label[language]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchBookings} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: language === 'sr' ? 'Ukupno' : 'Total', value: stats.total, color: 'bg-slate-100 text-slate-700' },
          { label: language === 'sr' ? 'Na čekanju' : 'Pending', value: stats.pending, color: 'bg-amber-100 text-amber-700' },
          { label: language === 'sr' ? 'Potvrđeno' : 'Confirmed', value: stats.confirmed, color: 'bg-blue-100 text-blue-700' },
          { label: language === 'sr' ? 'Završeno' : 'Completed', value: stats.completed, color: 'bg-emerald-100 text-emerald-700' },
          { label: language === 'sr' ? 'Otkazano' : 'Cancelled', value: stats.cancelled, color: 'bg-red-100 text-red-700' }
        ].map((stat, idx) => (
          <div key={idx} className={`p-3 rounded-lg ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {viewMode === 'month' ? (
        /* Calendar View */
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={goToPrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  {language === 'sr' ? 'Danas' : 'Today'}
                </Button>
              </div>
              
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-2">
            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {dayNames.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-slate-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((day, idx) => {
                const dayBookings = getBookingsForDate(day.date);
                const today = isToday(day.date);
                
                return (
                  <div
                    key={idx}
                    onClick={() => dayBookings.length > 0 && setSelectedDate(day.date)}
                    className={`min-h-[90px] p-1 rounded-lg border transition-all cursor-pointer ${
                      day.isCurrentMonth ? 'bg-white' : 'bg-slate-50'
                    } ${today ? 'border-sky-500 border-2' : 'border-slate-200'} ${
                      dayBookings.length > 0 ? 'hover:border-sky-400 hover:shadow-sm' : ''
                    }`}
                    data-testid={`calendar-day-${day.date.toISOString().split('T')[0]}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      day.isCurrentMonth ? (today ? 'text-sky-600' : 'text-slate-700') : 'text-slate-400'
                    }`}>
                      {day.date.getDate()}
                    </div>
                    
                    {/* Booking indicators */}
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map((booking, bIdx) => (
                        <div
                          key={booking.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate text-white ${
                            statusColors[booking.status] || statusColors.pending
                          }`}
                          title={booking.patient_name}
                        >
                          {booking.pickup_time?.slice(0, 5) || '—'} {booking.patient_name?.split(' ')[0]}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-[10px] text-slate-500 text-center">
                          +{dayBookings.length - 3} {language === 'sr' ? 'više' : 'more'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                {language === 'sr' ? 'Nema rezervacija' : 'No bookings'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredBookings.map(booking => (
                  <div
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className="p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:shadow-sm cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${statusColors[booking.status]} text-white`}>
                          {statusLabels[booking.status]?.[language]}
                        </Badge>
                        <span className="text-sm font-medium">{booking.patient_name}</span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {booking.booking_date} {booking.pickup_time}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {booking.start_point || booking.pickup_address}
                      </span>
                      {booking.assigned_driver_name && (
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {booking.assigned_driver_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {selectedDate?.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 pt-4">
            {selectedDate && getBookingsForDate(selectedDate).map(booking => (
              <div
                key={booking.id}
                onClick={() => {
                  setSelectedBooking(booking);
                  setSelectedDate(null);
                }}
                className="p-4 rounded-lg border border-slate-200 hover:border-sky-300 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{booking.patient_name}</span>
                  <Badge className={`${statusColors[booking.status]} text-white`}>
                    {statusLabels[booking.status]?.[language]}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {booking.pickup_time || booking.booking_time || '—'}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    {booking.start_point || booking.pickup_address}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    {booking.end_point || booking.destination_address}
                  </p>
                  {booking.assigned_driver_name && (
                    <p className="flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      {booking.assigned_driver_name}
                    </p>
                  )}
                  {booking.contact_phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {booking.contact_phone}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedBooking?.patient_name}</span>
              <Badge className={`${statusColors[selectedBooking?.status]} text-white`}>
                {statusLabels[selectedBooking?.status]?.[language]}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">{language === 'sr' ? 'Datum' : 'Date'}</p>
                  <p className="font-medium">{selectedBooking.booking_date}</p>
                </div>
                <div>
                  <p className="text-slate-500">{language === 'sr' ? 'Vreme' : 'Time'}</p>
                  <p className="font-medium">{selectedBooking.pickup_time || selectedBooking.booking_time || '—'}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-slate-500">{language === 'sr' ? 'Od' : 'From'}</p>
                  <p className="font-medium">{selectedBooking.start_point || selectedBooking.pickup_address}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{language === 'sr' ? 'Do' : 'To'}</p>
                  <p className="font-medium">{selectedBooking.end_point || selectedBooking.destination_address}</p>
                </div>
              </div>
              
              {selectedBooking.assigned_driver_name && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <Truck className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="text-sm text-slate-500">{language === 'sr' ? 'Vozač' : 'Driver'}</p>
                    <p className="font-medium">{selectedBooking.assigned_driver_name}</p>
                  </div>
                </div>
              )}
              
              {selectedBooking.notes && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-slate-500">{language === 'sr' ? 'Napomene' : 'Notes'}</p>
                  <p className="text-sm">{selectedBooking.notes}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                {onBookingSelect && (
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      onBookingSelect(selectedBooking);
                      setSelectedBooking(null);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {language === 'sr' ? 'Otvori' : 'View'}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedBooking(null)}
                >
                  {language === 'sr' ? 'Zatvori' : 'Close'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-lg">
        <span className="text-xs text-slate-500 font-medium mr-2">
          {language === 'sr' ? 'Legenda:' : 'Legend:'}
        </span>
        {Object.entries(statusLabels).slice(0, 6).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${statusColors[status]}`} />
            <span className="text-xs text-slate-600">{label[language]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingCalendarView;
