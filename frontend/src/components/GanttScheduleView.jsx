/**
 * GanttScheduleView - Admin Timeline/Gantt View for Vehicle Scheduling
 * Shows all vehicles and their scheduled transports in a weekly timeline grid
 * Supports drag-and-drop rescheduling between vehicles and time slots
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  DndContext, 
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
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
  Filter,
  Eye,
  GripVertical,
  Check,
  X,
  AlertCircle
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

// Draggable Booking Block Component
const DraggableBooking = ({ booking, language, zoom, onSelect, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: booking.id,
    data: { booking }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : undefined;

  const canDrag = ['pending', 'confirmed', 'assigned'].includes(booking.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`absolute h-10 rounded-lg border-l-4 px-2 py-1 text-white text-xs shadow-sm transition-all ${
        statusColors[booking.status] || statusColors.pending
      } ${isDragging ? 'opacity-50 scale-105 shadow-xl ring-2 ring-white' : 'hover:shadow-md'} ${
        canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      }`}
      onClick={() => !isDragging && onSelect(booking)}
      data-testid={`gantt-booking-${booking.id}`}
    >
      <div className="flex items-center gap-1 h-full">
        {canDrag && (
          <div {...attributes} {...listeners} className="flex-shrink-0 touch-none">
            <GripVertical className="w-3 h-3 opacity-60" />
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="font-medium truncate leading-tight">{booking.patient_name}</p>
          <p className="text-[10px] opacity-80 truncate leading-tight">
            <Clock className="w-2.5 h-2.5 inline mr-0.5" />
            {booking.pickup_time || booking.booking_time}
          </p>
        </div>
      </div>
    </div>
  );
};

// Droppable Day Cell Component
const DroppableCell = ({ vehicleId, date, children, isOver, language }) => {
  const { setNodeRef, isOver: isOverCell } = useDroppable({
    id: `${vehicleId}-${date.toISOString().split('T')[0]}`,
    data: { vehicleId, date }
  });

  const today = new Date().toDateString() === date.toDateString();

  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 min-h-[70px] border-r last:border-r-0 p-1 relative transition-colors ${
        today ? 'bg-sky-50/50' : ''
      } ${isOverCell ? 'bg-emerald-100/50 ring-2 ring-emerald-400 ring-inset' : ''}`}
      data-testid={`drop-zone-${vehicleId}-${date.toISOString().split('T')[0]}`}
    >
      {isOverCell && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
            {language === 'sr' ? 'Pusti ovde' : 'Drop here'}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

// Drag Overlay Content
const DragOverlayContent = ({ booking, language }) => {
  if (!booking) return null;
  
  return (
    <div className={`h-12 w-48 rounded-lg border-l-4 px-3 py-2 text-white text-xs shadow-2xl ${
      statusColors[booking.status] || statusColors.pending
    } ring-2 ring-white transform scale-105`}>
      <p className="font-bold truncate">{booking.patient_name}</p>
      <p className="text-[10px] opacity-90">
        <Clock className="w-3 h-3 inline mr-1" />
        {booking.pickup_time || booking.booking_time}
      </p>
    </div>
  );
};

const GanttScheduleView = ({ language = 'sr' }) => {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeId, setActiveId] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);
  const scrollContainerRef = useRef(null);

  // DnD sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Calculate current week dates
  const weekDates = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));
    
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
  const fetchData = useCallback(async () => {
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
  }, [weekDates, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  const getVehicleBookings = useCallback((vehicleId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => {
      const bookingDate = b.booking_date || (b.pickup_datetime && b.pickup_datetime.split('T')[0]);
      const isDateMatch = bookingDate === dateStr;
      const isVehicleMatch = b.vehicle_id === vehicleId || 
                            (b.assigned_driver && vehicles.find(v => v.id === vehicleId)?.assigned_drivers?.includes(b.assigned_driver));
      const isStatusMatch = statusFilter === 'all' || b.status === statusFilter;
      return isDateMatch && isVehicleMatch && isStatusMatch;
    });
  }, [bookings, vehicles, statusFilter]);

  // Get unassigned bookings for a day
  const getUnassignedBookings = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => {
      const bookingDate = b.booking_date || (b.pickup_datetime && b.pickup_datetime.split('T')[0]);
      const isDateMatch = bookingDate === dateStr;
      const isUnassigned = !b.vehicle_id && !b.assigned_driver;
      const isStatusMatch = statusFilter === 'all' || b.status === statusFilter;
      return isDateMatch && isUnassigned && isStatusMatch;
    });
  }, [bookings, statusFilter]);

  // Calculate booking position on timeline
  const getBookingPosition = (booking) => {
    const time = booking.pickup_time || booking.booking_time || '09:00';
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = (hours - 6) * 60 + minutes;
    const maxMinutes = 16 * 60;
    return Math.max(0, Math.min(95, (totalMinutes / maxMinutes) * 100));
  };

  // Get booking width
  const getBookingWidth = (booking) => {
    const duration = booking.estimated_duration || 90;
    const maxMinutes = 16 * 60;
    const width = Math.max(8, Math.min(25, (duration / maxMinutes) * 100));
    return width * zoom;
  };

  // Navigation
  const goToToday = () => setWeekOffset(0);
  const goToPrevWeek = () => setWeekOffset(w => w - 1);
  const goToNextWeek = () => setWeekOffset(w => w + 1);

  // Scroll to current time
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

  // Check if date is today
  const isToday = (date) => new Date().toDateString() === date.toDateString();

  // Current time position
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < 6 || hours > 22) return null;
    const totalMinutes = (hours - 6) * 60 + minutes;
    return (totalMinutes / (16 * 60)) * 100;
  };

  // DnD Handlers
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const booking = active.data.current?.booking;
    if (!booking) return;

    // Parse drop target
    const [targetVehicleId, targetDate] = over.id.split('-').length > 1 
      ? [over.id.substring(0, over.id.lastIndexOf('-')), over.id.substring(over.id.lastIndexOf('-') + 1)]
      : [over.id, null];

    // Check if anything changed
    const currentDate = booking.booking_date;
    const currentVehicle = booking.vehicle_id;
    const isUnassignedTarget = targetVehicleId === 'unassigned';

    if (targetDate === currentDate && targetVehicleId === (currentVehicle || 'unassigned')) {
      return; // No change
    }

    // Store pending change for confirmation
    const vehicle = isUnassignedTarget ? null : vehicles.find(v => v.id === targetVehicleId);
    setPendingChange({
      booking,
      newVehicleId: isUnassignedTarget ? null : targetVehicleId,
      newVehicleName: vehicle?.registration || (language === 'sr' ? 'Nedodeljeno' : 'Unassigned'),
      newDate: targetDate || currentDate,
      oldVehicleName: currentVehicle 
        ? vehicles.find(v => v.id === currentVehicle)?.registration 
        : (language === 'sr' ? 'Nedodeljeno' : 'Unassigned'),
      oldDate: currentDate
    });
  };

  // Confirm reschedule
  const confirmReschedule = async () => {
    if (!pendingChange) return;

    setIsRescheduling(true);
    try {
      const { booking, newVehicleId, newDate } = pendingChange;
      
      // Update booking via API
      await axios.put(`${API}/api/bookings/${booking.id}`, {
        vehicle_id: newVehicleId,
        booking_date: newDate,
        // If assigning to a vehicle, update status to assigned
        ...(newVehicleId && booking.status === 'pending' ? { status: 'assigned' } : {}),
        // If unassigning, revert to pending
        ...(!newVehicleId && booking.status === 'assigned' ? { status: 'pending' } : {})
      });

      toast.success(
        language === 'sr' 
          ? `Rezervacija premeštena na ${pendingChange.newVehicleName}` 
          : `Booking moved to ${pendingChange.newVehicleName}`
      );

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error(
        language === 'sr' 
          ? 'Greška pri premeštanju rezervacije' 
          : 'Error moving booking'
      );
    } finally {
      setIsRescheduling(false);
      setPendingChange(null);
    }
  };

  // Cancel reschedule
  const cancelReschedule = () => {
    setPendingChange(null);
  };

  // Get active booking for overlay
  const activeBooking = activeId ? bookings.find(b => b.id === activeId) : null;

  const currentTimePosition = getCurrentTimePosition();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              <GripVertical className="w-3 h-3 mr-1" />
              {language === 'sr' ? 'Povuci & pusti' : 'Drag & Drop'}
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
              style={{ maxHeight: 'calc(100vh - 400px)' }}
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
                    return (
                      <DroppableCell 
                        key={idx} 
                        vehicleId="unassigned" 
                        date={date}
                        language={language}
                      >
                        {dayBookings.map((booking, bIdx) => (
                          <div
                            key={booking.id}
                            style={{
                              position: 'absolute',
                              left: `${getBookingPosition(booking)}%`,
                              width: `${getBookingWidth(booking)}%`,
                              top: `${4 + (bIdx % 2) * 34}px`,
                              minWidth: '70px'
                            }}
                          >
                            <DraggableBooking
                              booking={booking}
                              language={language}
                              zoom={zoom}
                              onSelect={setSelectedBooking}
                              isDragging={activeId === booking.id}
                            />
                          </div>
                        ))}
                        
                        {isToday(date) && currentTimePosition && (
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                            style={{ left: `${currentTimePosition}%` }}
                          >
                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                          </div>
                        )}
                      </DroppableCell>
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
                      return (
                        <DroppableCell 
                          key={dayIdx} 
                          vehicleId={vehicle.id} 
                          date={date}
                          language={language}
                        >
                          {/* Hour Grid Lines */}
                          {hours.map((hour, hIdx) => (
                            <div 
                              key={hour}
                              className="absolute top-0 bottom-0 border-l border-slate-100"
                              style={{ left: `${(hIdx / hours.length) * 100}%` }}
                            />
                          ))}

                          {/* Booking Blocks */}
                          {dayBookings.map((booking, bIdx) => (
                            <div
                              key={booking.id}
                              style={{
                                position: 'absolute',
                                left: `${getBookingPosition(booking)}%`,
                                width: `${getBookingWidth(booking)}%`,
                                top: `${4 + (bIdx % 2) * 34}px`,
                                minWidth: '70px',
                                zIndex: 5
                              }}
                            >
                              <DraggableBooking
                                booking={booking}
                                language={language}
                                zoom={zoom}
                                onSelect={setSelectedBooking}
                                isDragging={activeId === booking.id}
                              />
                            </div>
                          ))}

                          {/* Current time indicator */}
                          {isToday(date) && currentTimePosition && (
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                              style={{ left: `${currentTimePosition}%` }}
                            />
                          )}
                        </DroppableCell>
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

        {/* Confirmation Modal for Reschedule */}
        {pendingChange && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="reschedule-confirm-modal">
            <Card className="max-w-md w-full animate-in fade-in zoom-in duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  {language === 'sr' ? 'Potvrdi premeštanje' : 'Confirm Move'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold">{pendingChange.booking.patient_name}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="bg-slate-200 px-2 py-0.5 rounded">{pendingChange.oldVehicleName}</span>
                    <span>→</span>
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
                      {pendingChange.newVehicleName}
                    </span>
                  </div>
                  {pendingChange.oldDate !== pendingChange.newDate && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="bg-slate-200 px-2 py-0.5 rounded">{pendingChange.oldDate}</span>
                      <span>→</span>
                      <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-medium">
                        {pendingChange.newDate}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={confirmReschedule}
                    disabled={isRescheduling}
                  >
                    {isRescheduling ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {language === 'sr' ? 'Potvrdi' : 'Confirm'}
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={cancelReschedule}
                    disabled={isRescheduling}
                  >
                    <X className="w-4 h-4 mr-2" />
                    {language === 'sr' ? 'Otkaži' : 'Cancel'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Booking Detail Modal */}
        {selectedBooking && !pendingChange && (
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
                <div className="pt-2 border-t text-xs text-slate-400">
                  <GripVertical className="w-3 h-3 inline mr-1" />
                  {language === 'sr' 
                    ? 'Prevuci rezervaciju na drugi dan ili vozilo za premeštanje' 
                    : 'Drag booking to another day or vehicle to reschedule'}
                </div>
                <Button 
                  className="w-full" 
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
          <div className="flex items-center gap-1 ml-4 border-l pl-4">
            <GripVertical className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-500">
              {language === 'sr' ? 'Povuci za premeštanje' : 'Drag to reschedule'}
            </span>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        <DragOverlayContent booking={activeBooking} language={language} />
      </DragOverlay>
    </DndContext>
  );
};

export default GanttScheduleView;
