import { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Truck,
  GripVertical,
  Filter,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const ScheduleGantt = () => {
  const { language } = useLanguage();
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const timelineRef = useRef(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [currentDate, token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, bookingsRes] = await Promise.all([
        axios.get(`${API}/api/fleet/vehicles`),
        axios.get(`${API}/api/bookings`)
      ]);
      setVehicles(vehiclesRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get the week dates (Mon-Sun)
  const getWeekDates = () => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 - 22:00

  const formatMonthYear = (date) => {
    return date.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDayName = (date) => {
    return date.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', {
      weekday: 'short'
    });
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToNow = () => {
    setCurrentDate(new Date());
    // Scroll to current time if possible
    if (timelineRef.current) {
      const now = new Date();
      const hours = now.getHours();
      const scrollPosition = ((hours - 6) / 16) * timelineRef.current.scrollWidth;
      timelineRef.current.scrollLeft = Math.max(0, scrollPosition - 200);
    }
  };

  // Get unassigned bookings
  const getUnassignedBookings = () => {
    return bookings.filter(b => !b.assigned_vehicle_id && b.status !== 'completed' && b.status !== 'cancelled');
  };

  // Get bookings for a vehicle on a specific day
  const getBookingsForVehicle = (vehicleId, day) => {
    const dayStr = day.toISOString().split('T')[0];
    let filtered = bookings.filter(b => {
      const bookingDate = b.booking_date || b.preferred_date;
      const isMatchingVehicle = vehicleId === 'unassigned' 
        ? !b.assigned_vehicle_id 
        : b.assigned_vehicle_id === vehicleId;
      const isMatchingDate = bookingDate === dayStr;
      return isMatchingVehicle && isMatchingDate;
    });

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    return filtered;
  };

  // Check if a day is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Get current time position as percentage (for red line)
  const getCurrentTimePosition = (day) => {
    if (!isToday(day)) return null;
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < 6 || hours > 22) return null;
    return ((hours - 6 + minutes / 60) / 16) * 100;
  };

  // Status colors matching the live site
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-orange-500';
      case 'confirmed': return 'bg-green-500';
      case 'assigned': return 'bg-blue-600';
      case 'en_route': return 'bg-cyan-500';
      case 'in_transit': case 'in_progress': return 'bg-purple-500';
      case 'arrived': case 'completed': return 'bg-teal-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      sr: {
        pending: 'Na čekanju',
        confirmed: 'Potvrđeno',
        assigned: 'Dodeljeno',
        en_route: 'Na putu',
        in_transit: 'U tranzitu',
        in_progress: 'U toku',
        arrived: 'Stigao',
        completed: 'Završeno'
      },
      en: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        assigned: 'Assigned',
        en_route: 'En Route',
        in_transit: 'In Transit',
        in_progress: 'In Progress',
        arrived: 'Arrived',
        completed: 'Completed'
      }
    };
    return labels[language === 'sr' ? 'sr' : 'en'][status] || status;
  };

  const unassignedBookings = getUnassignedBookings();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="schedule-gantt">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Calendar className="w-5 h-5" />
            <h2 className="font-semibold text-lg">
              {language === 'sr' ? 'Raspored vozila' : 'Vehicle Schedule'}
            </h2>
          </div>
          <Badge variant="secondary" className="bg-slate-100">
            {vehicles.length} {language === 'sr' ? 'vozila' : 'vehicles'}
          </Badge>
          <Button
            variant={dragEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setDragEnabled(!dragEnabled)}
            className="gap-1"
          >
            <GripVertical className="w-4 h-4" />
            Drag & Drop
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'sr' ? 'Svi statusi' : 'All Status'}</SelectItem>
              <SelectItem value="pending">{language === 'sr' ? 'Na čekanju' : 'Pending'}</SelectItem>
              <SelectItem value="confirmed">{language === 'sr' ? 'Potvrđeno' : 'Confirmed'}</SelectItem>
              <SelectItem value="assigned">{language === 'sr' ? 'Dodeljeno' : 'Assigned'}</SelectItem>
              <SelectItem value="en_route">{language === 'sr' ? 'Na putu' : 'En Route'}</SelectItem>
              <SelectItem value="in_transit">{language === 'sr' ? 'U tranzitu' : 'In Transit'}</SelectItem>
              <SelectItem value="arrived">{language === 'sr' ? 'Stigao' : 'Arrived'}</SelectItem>
            </SelectContent>
          </Select>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border rounded-md">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
              disabled={zoomLevel <= 50}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm w-12 text-center">{zoomLevel}%</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
              disabled={zoomLevel >= 200}
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

      {/* Navigation */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          {language === 'sr' ? 'Prethodna' : 'Previous'}
        </Button>
        <Button variant="outline" size="sm" onClick={goToToday}>
          {language === 'sr' ? 'Danas' : 'Today'}
        </Button>
        
        <span className="mx-4 font-semibold text-lg text-slate-900">
          {formatMonthYear(weekDates[0])}
        </span>
        
        <Button variant="outline" size="sm" onClick={goToNow} className="gap-1">
          <Clock className="w-4 h-4" />
          {language === 'sr' ? 'Sada' : 'Now'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
          {language === 'sr' ? 'Sledeća' : 'Next'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Gantt Chart */}
      <div className="card-base overflow-hidden border rounded-lg">
        <div className="overflow-x-auto" ref={timelineRef}>
          <div style={{ minWidth: `${800 * (zoomLevel / 100)}px` }}>
            {/* Header with days */}
            <div className="flex border-b-2 border-slate-200 bg-slate-50 sticky top-0 z-10">
              <div className="w-48 flex-shrink-0 p-3 font-medium text-slate-700 border-r border-slate-200">
                {language === 'sr' ? 'Vozilo / Dan' : 'Vehicle / Day'}
              </div>
              <div className="flex-1 flex">
                {weekDates.map((day, idx) => (
                  <div 
                    key={idx}
                    className={`flex-1 text-center py-2 border-r border-slate-200 ${
                      isToday(day) ? 'bg-sky-50 border-b-2 border-b-sky-400' : ''
                    }`}
                  >
                    <div className="text-xs text-slate-500 uppercase">{formatDayName(day)}</div>
                    <div className={`text-lg font-semibold ${isToday(day) ? 'text-sky-600' : 'text-slate-900'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unassigned Row */}
            <div className="flex border-b border-slate-200 bg-orange-50/50">
              <div className="w-48 flex-shrink-0 p-3 border-r border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <span className="font-medium text-orange-700 text-sm">
                      {language === 'sr' ? 'Nedodeljeno' : 'Unassigned'}
                    </span>
                    <p className="text-xs text-orange-500">
                      {unassignedBookings.length} {language === 'sr' ? 'rezervacija' : 'bookings'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex relative" style={{ minHeight: '70px' }}>
                {weekDates.map((day, dIdx) => {
                  const dayBookings = getBookingsForVehicle('unassigned', day);
                  const timePosition = getCurrentTimePosition(day);
                  return (
                    <div 
                      key={dIdx} 
                      className={`flex-1 border-r border-slate-200 p-1 relative ${
                        isToday(day) ? 'bg-sky-50/30' : ''
                      }`}
                    >
                      {/* Current time indicator */}
                      {timePosition !== null && (
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                          style={{ left: `${timePosition}%` }}
                        />
                      )}
                      <div className="flex flex-wrap gap-1">
                        {dayBookings.slice(0, 3).map((booking) => (
                          <div
                            key={booking.id}
                            className={`${getStatusColor(booking.status)} text-white text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity`}
                            title={`${booking.patient_name || booking.full_name} - ${booking.start_point || booking.pickup_address}`}
                          >
                            <span className="truncate block max-w-[80px]">
                              {booking.patient_name || booking.full_name || 'Unknown'}
                            </span>
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <span className="text-xs text-orange-600 font-medium">
                            +{dayBookings.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vehicle Rows */}
            {vehicles.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Truck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>{language === 'sr' ? 'Nema vozila' : 'No vehicles'}</p>
              </div>
            ) : (
              vehicles.map((vehicle, vIdx) => (
                <div 
                  key={vehicle.id} 
                  className={`flex border-b border-slate-100 ${vIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                >
                  {/* Vehicle Info */}
                  <div className="w-48 flex-shrink-0 p-3 border-r border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        vehicle.status === 'available' ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        <Truck className={`w-4 h-4 ${
                          vehicle.status === 'available' ? 'text-green-600' : 'text-slate-400'
                        }`} />
                      </div>
                      <span className="font-medium text-slate-900 text-sm">{vehicle.name}</span>
                    </div>
                    {vehicle.registration && (
                      <p className="text-xs text-slate-500 mt-1 ml-10">{vehicle.registration}</p>
                    )}
                  </div>

                  {/* Timeline cells for each day */}
                  <div className="flex-1 flex relative" style={{ minHeight: '70px' }}>
                    {weekDates.map((day, dIdx) => {
                      const dayBookings = getBookingsForVehicle(vehicle.id, day);
                      const timePosition = getCurrentTimePosition(day);
                      return (
                        <div 
                          key={dIdx} 
                          className={`flex-1 border-r border-slate-100 p-1 relative ${
                            isToday(day) ? 'bg-sky-50/30' : ''
                          }`}
                        >
                          {/* Current time indicator */}
                          {timePosition !== null && (
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                              style={{ left: `${timePosition}%` }}
                            />
                          )}
                          <div className="flex flex-col gap-1">
                            {dayBookings.map((booking) => (
                              <div
                                key={booking.id}
                                className={`${getStatusColor(booking.status)} text-white text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                  dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''
                                }`}
                                draggable={dragEnabled}
                                title={`${booking.patient_name || booking.full_name} - ${booking.start_point || booking.pickup_address} → ${booking.end_point || booking.dropoff_address}`}
                              >
                                <div className="font-medium truncate">{booking.patient_name || booking.full_name || 'Unknown'}</div>
                                <div className="truncate opacity-80 text-[10px]">
                                  {booking.booking_time || booking.pickup_time || '—'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Time footer */}
            <div className="flex border-t border-slate-200 bg-slate-50">
              <div className="w-48 flex-shrink-0 p-2 text-sm text-slate-600 border-r border-slate-200">
                {language === 'sr' ? 'Vreme' : 'Time'}
              </div>
              <div className="flex-1 flex">
                {hours.map((hour, idx) => (
                  <div 
                    key={idx} 
                    className="flex-1 text-center text-xs text-slate-500 py-2 border-r border-slate-100"
                  >
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-4 text-sm text-slate-600">
        <span className="font-medium">{language === 'sr' ? 'Legenda:' : 'Legend:'}</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>{language === 'sr' ? 'Na čekanju' : 'Pending'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>{language === 'sr' ? 'Potvrđeno' : 'Confirmed'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-600" />
          <span>{language === 'sr' ? 'Dodeljeno' : 'Assigned'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-cyan-500" />
          <span>{language === 'sr' ? 'Na putu' : 'En Route'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span>{language === 'sr' ? 'U tranzitu' : 'In Transit'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-teal-500" />
          <span>{language === 'sr' ? 'Stigao' : 'Arrived'}</span>
        </div>
        <span className="text-slate-400 ml-2">
          <GripVertical className="w-4 h-4 inline" /> 
          {language === 'sr' ? 'Prevuci za promenu rasporeda' : 'Drag to reschedule'}
        </span>
      </div>
    </div>
  );
};

export default ScheduleGantt;
