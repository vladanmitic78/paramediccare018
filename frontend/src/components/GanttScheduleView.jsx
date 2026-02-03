/**
 * GanttScheduleView - Admin Timeline/Gantt View for Vehicle Scheduling
 * Shows all vehicles and their scheduled transports in a weekly timeline grid
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Truck, 
  Users,
  Clock,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Eye
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Status colors for booking blocks
const statusColors = {
  pending: 'bg-amber-500/80 border-amber-400',
  confirmed: 'bg-blue-500/80 border-blue-400',
  assigned: 'bg-purple-500/80 border-purple-400',
  en_route: 'bg-sky-500/80 border-sky-400',
  in_transit: 'bg-violet-500/80 border-violet-400',
  arrived: 'bg-cyan-500/80 border-cyan-400',
  picked_up: 'bg-indigo-500/80 border-indigo-400',
  completed: 'bg-emerald-500/80 border-emerald-400',
  cancelled: 'bg-red-500/50 border-red-400 opacity-50'
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

const GanttScheduleView = ({ language = 'sr' }) => {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState('week'); // 'day' or 'week'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [zoom, setZoom] = useState(1); // 1 = normal, 0.5 = zoomed out, 2 = zoomed in
  const [statusFilter, setStatusFilter] = useState('all');
  const scrollContainerRef = useRef(null);

  // Calculate current week dates
  const weekDates = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7)); // Monday
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [weekOffset]);

  // Hours to display (6 AM to 10 PM)
  const hours = useMemo(() => {
    const h = [];
    for (let i = 6; i <= 22; i++) {
      h.push(i);
    }
    return h;
  }, []);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [weekOffset]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];
      
      const [vehiclesRes, bookingsRes] = await Promise.all([
        axios.get(`${API}/api/fleet/vehicles`),
        axios.get(`${API}/api/bookings?start_date=${startDate}&end_date=${endDate}`)
      ]);
      
      setVehicles(vehiclesRes.data.filter(v => v.status !== 'retired'));
      setBookings(bookingsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    const days = language === 'sr' 
      ? ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: date.getMonth() + 1,
      full: date.toISOString().split('T')[0]
    };
  };

  // Get bookings for a specific vehicle and day
  const getVehicleBookings = (vehicleId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => {
      const bookingDate = b.booking_date || (b.pickup_datetime && b.pickup_datetime.split('T')[0]);
      const isDateMatch = bookingDate === dateStr;
      const isVehicleMatch = b.vehicle_id === vehicleId || 
                            (b.assigned_driver && vehicles.find(v => v.id === vehicleId)?.assigned_drivers?.includes(b.assigned_driver));
      const isStatusMatch = statusFilter === 'all' || b.status === statusFilter;
      return isDateMatch && isVehicleMatch && isStatusMatch;
    });
  };

  // Get unassigned bookings for a day
  const getUnassignedBookings = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => {
      const bookingDate = b.booking_date || (b.pickup_datetime && b.pickup_datetime.split('T')[0]);
      const isDateMatch = bookingDate === dateStr;
      const isUnassigned = !b.vehicle_id && !b.assigned_driver;
      const isStatusMatch = statusFilter === 'all' || b.status === statusFilter;
      return isDateMatch && isUnassigned && isStatusMatch;
    });
  };

  // Calculate booking position on timeline (percentage)
  const getBookingPosition = (booking) => {
    const time = booking.pickup_time || booking.booking_time || '09:00';
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = (hours - 6) * 60 + minutes; // Start from 6 AM
    const maxMinutes = 16 * 60; // 16 hours (6 AM to 10 PM)
    const position = Math.max(0, Math.min(100, (totalMinutes / maxMinutes) * 100));
    return position;
  };

  // Get booking duration (estimated 2 hours default)
  const getBookingWidth = (booking) => {
    const duration = booking.estimated_duration || 120; // minutes
    const maxMinutes = 16 * 60;
    const width = Math.max(5, Math.min(30, (duration / maxMinutes) * 100));
    return width * zoom;
  };

  // Navigate weeks
  const goToToday = () => setWeekOffset(0);
  const goToPrevWeek = () => setWeekOffset(w => w - 1);
  const goToNextWeek = () => setWeekOffset(w => w + 1);

  // Scroll to current time indicator
  const scrollToNow = () => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= 6 && currentHour <= 22) {
        const position = ((currentHour - 6) / 16) * scrollContainerRef.current.scrollWidth;
        scrollContainerRef.current.scrollLeft = position - 200;
      }
    }
  };

  // Check if a date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Current time indicator position
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < 6 || hours > 22) return null;
    const totalMinutes = (hours - 6) * 60 + minutes;
    const maxMinutes = 16 * 60;
    return (totalMinutes / maxMinutes) * 100;
  };

  const currentTimePosition = getCurrentTimePosition();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="gantt-schedule-view">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-600" />
          <h2 className="text-lg font-semibold">
            {language === 'sr' ? 'Raspored vozila' : 'Vehicle Schedule'}
          </h2>
          <Badge variant="outline" className="ml-2">
            {vehicles.length} {language === 'sr' ? 'vozila' : 'vehicles'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
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

          {/* Zoom Controls */}
          <div className="flex items-center border rounded-lg">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="px-2 text-sm text-slate-500">{Math.round(zoom * 100)}%</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setZoom(z => Math.min(2, z + 0.25))}
              disabled={zoom >= 2}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={goToPrevWeek}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {language === 'sr' ? 'Prethodna' : 'Previous'}
            </Button>
            
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-lg">
                {weekDates[0].toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <Button variant="outline" size="sm" onClick={goToToday}>
                {language === 'sr' ? 'Danas' : 'Today'}
              </Button>
              <Button variant="ghost" size="sm" onClick={scrollToNow}>
                <Eye className="w-4 h-4 mr-1" />
                {language === 'sr' ? 'Sada' : 'Now'}
              </Button>
            </div>
            
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              {language === 'sr' ? 'Sledeća' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-[200px_1fr] border-b">
            <div className="p-3 bg-slate-50 border-r font-medium text-sm text-slate-600">
              {language === 'sr' ? 'Vozilo / Dan' : 'Vehicle / Day'}
            </div>
            <div className="flex">
              {weekDates.map((date, idx) => {
                const { day, date: dateNum } = formatDate(date);
                const today = isToday(date);
                return (
                  <div 
                    key={idx} 
                    className={`flex-1 p-2 text-center border-r last:border-r-0 ${
                      today ? 'bg-sky-50 border-b-2 border-b-sky-500' : 'bg-slate-50'
                    }`}
                  >
                    <p className={`text-xs ${today ? 'text-sky-600 font-semibold' : 'text-slate-500'}`}>
                      {day}
                    </p>
                    <p className={`text-lg font-bold ${today ? 'text-sky-700' : 'text-slate-700'}`}>
                      {dateNum}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Content */}
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto"
            style={{ maxHeight: 'calc(100vh - 350px)' }}
          >
            {/* Unassigned Row */}
            <div className="grid grid-cols-[200px_1fr] border-b bg-amber-50/50">
              <div className="p-3 border-r flex items-center gap-2 sticky left-0 bg-amber-50/50 z-10">
                <Users className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-sm text-amber-800">
                    {language === 'sr' ? 'Nedodeljeno' : 'Unassigned'}
                  </p>
                  <p className="text-xs text-amber-600">
                    {bookings.filter(b => !b.vehicle_id && !b.assigned_driver).length} {language === 'sr' ? 'rezervacija' : 'bookings'}
                  </p>
                </div>
              </div>
              <div className="flex">
                {weekDates.map((date, idx) => {
                  const dayBookings = getUnassignedBookings(date);
                  const today = isToday(date);
                  return (
                    <div 
                      key={idx} 
                      className={`flex-1 min-h-[70px] border-r last:border-r-0 p-1 relative ${
                        today ? 'bg-amber-100/50' : ''
                      }`}
                    >
                      {dayBookings.map((booking, bIdx) => (
                        <TooltipProvider key={booking.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute h-8 rounded cursor-pointer border-l-4 px-2 py-1 text-white text-xs truncate ${statusColors[booking.status] || statusColors.pending}`}
                                style={{
                                  left: `${getBookingPosition(booking)}%`,
                                  width: `${getBookingWidth(booking)}%`,
                                  top: `${8 + bIdx * 28}px`,
                                  minWidth: '60px'
                                }}
                                onClick={() => setSelectedBooking(booking)}
                              >
                                {booking.patient_name}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="p-2">
                                <p className="font-semibold">{booking.patient_name}</p>
                                <p className="text-xs">{booking.pickup_time || booking.booking_time} - {booking.start_point || booking.pickup_address}</p>
                                <Badge className={`mt-1 ${statusColors[booking.status]}`}>
                                  {statusLabels[booking.status]?.[language] || booking.status}
                                </Badge>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                      
                      {/* Current time indicator */}
                      {today && currentTimePosition && (
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                          style={{ left: `${currentTimePosition}%` }}
                        >
                          <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vehicle Rows */}
            {vehicles.map((vehicle, vIdx) => (
              <div 
                key={vehicle.id} 
                className={`grid grid-cols-[200px_1fr] border-b hover:bg-slate-50/50 ${
                  vIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
              >
                {/* Vehicle Info */}
                <div className="p-3 border-r flex items-center gap-3 sticky left-0 bg-inherit z-10">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    vehicle.status === 'active' ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    <Truck className={`w-5 h-5 ${
                      vehicle.status === 'active' ? 'text-emerald-600' : 'text-slate-400'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{vehicle.registration}</p>
                    <p className="text-xs text-slate-500 truncate">{vehicle.name || vehicle.type}</p>
                  </div>
                </div>

                {/* Day Cells */}
                <div className="flex">
                  {weekDates.map((date, dayIdx) => {
                    const dayBookings = getVehicleBookings(vehicle.id, date);
                    const today = isToday(date);
                    return (
                      <div 
                        key={dayIdx} 
                        className={`flex-1 min-h-[70px] border-r last:border-r-0 p-1 relative ${
                          today ? 'bg-sky-50/50' : ''
                        }`}
                      >
                        {/* Hour Grid Lines (subtle) */}
                        {hours.map((hour, hIdx) => (
                          <div 
                            key={hour}
                            className="absolute top-0 bottom-0 border-l border-slate-100"
                            style={{ left: `${(hIdx / hours.length) * 100}%` }}
                          />
                        ))}

                        {/* Booking Blocks */}
                        {dayBookings.map((booking, bIdx) => (
                          <TooltipProvider key={booking.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`absolute h-10 rounded-lg cursor-pointer border-l-4 px-2 py-1 text-white text-xs shadow-sm hover:shadow-md transition-shadow ${statusColors[booking.status] || statusColors.pending}`}
                                  style={{
                                    left: `${getBookingPosition(booking)}%`,
                                    width: `${getBookingWidth(booking)}%`,
                                    top: `${4 + (bIdx % 2) * 32}px`,
                                    minWidth: '80px',
                                    zIndex: 5
                                  }}
                                  onClick={() => setSelectedBooking(booking)}
                                  data-testid={`gantt-booking-${booking.id}`}
                                >
                                  <p className="font-medium truncate">{booking.patient_name}</p>
                                  <p className="text-[10px] opacity-80 truncate">
                                    <Clock className="w-3 h-3 inline mr-0.5" />
                                    {booking.pickup_time || booking.booking_time}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="p-2 space-y-1">
                                  <p className="font-semibold">{booking.patient_name}</p>
                                  <p className="text-xs flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {booking.pickup_time || booking.booking_time}
                                  </p>
                                  <p className="text-xs text-slate-300">
                                    {booking.start_point || booking.pickup_address}
                                  </p>
                                  <p className="text-xs text-slate-300">
                                    → {booking.end_point || booking.destination_address}
                                  </p>
                                  <Badge className={`mt-1 text-[10px] ${statusColors[booking.status]}`}>
                                    {statusLabels[booking.status]?.[language] || booking.status}
                                  </Badge>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}

                        {/* Current time indicator */}
                        {today && currentTimePosition && (
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                            style={{ left: `${currentTimePosition}%` }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Time Scale Footer */}
          <div className="grid grid-cols-[200px_1fr] border-t bg-slate-50">
            <div className="p-2 border-r text-xs text-slate-500 text-center">
              {language === 'sr' ? 'Vreme' : 'Time'}
            </div>
            <div className="flex text-xs text-slate-400">
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="flex-1 text-center py-1 border-r last:border-r-0"
                >
                  {hour}:00
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <Card 
            className="max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedBooking.patient_name}</span>
                <Badge className={statusColors[selectedBooking.status]}>
                  {statusLabels[selectedBooking.status]?.[language]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{selectedBooking.booking_date} {selectedBooking.pickup_time || selectedBooking.booking_time}</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-slate-600">
                  <strong>{language === 'sr' ? 'Od:' : 'From:'}</strong> {selectedBooking.start_point || selectedBooking.pickup_address}
                </p>
                <p className="text-slate-600">
                  <strong>{language === 'sr' ? 'Do:' : 'To:'}</strong> {selectedBooking.end_point || selectedBooking.destination_address}
                </p>
              </div>
              {selectedBooking.assigned_driver_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <span>{selectedBooking.assigned_driver_name}</span>
                </div>
              )}
              {selectedBooking.notes && (
                <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded">
                  {selectedBooking.notes}
                </p>
              )}
              <Button 
                className="w-full mt-4" 
                variant="outline"
                onClick={() => setSelectedBooking(null)}
              >
                {language === 'sr' ? 'Zatvori' : 'Close'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

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

export default GanttScheduleView;
