import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Truck,
  User,
  Clock,
  MapPin
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const ScheduleGantt = () => {
  const { language } = useLanguage();
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, bookingsRes] = await Promise.all([
        axios.get(`${API}/fleet/vehicles`),
        axios.get(`${API}/bookings`)
      ]);
      setVehicles(vehiclesRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysInView = () => {
    const days = [];
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    
    const count = viewMode === 'week' ? 7 : 1;
    for (let i = 0; i < count; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = getDaysInView();

  const getBookingsForVehicle = (vehicleId, day) => {
    const dayStr = day.toISOString().split('T')[0];
    return bookings.filter(b => 
      b.assigned_vehicle_id === vehicleId && 
      (b.booking_date === dayStr || b.preferred_date === dayStr)
    );
  };

  const getBookingPosition = (booking) => {
    const time = booking.booking_time || booking.pickup_time || '09:00';
    const [hours, minutes] = time.split(':').map(Number);
    const startPercent = ((hours + minutes / 60) / 24) * 100;
    const duration = 2; // Assume 2 hours duration
    const widthPercent = (duration / 24) * 100;
    return { left: `${startPercent}%`, width: `${Math.max(widthPercent, 4)}%` };
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    const offset = viewMode === 'week' ? 7 : 1;
    newDate.setDate(newDate.getDate() + (direction * offset));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-slate-400';
      default: return 'bg-sky-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="schedule-gantt">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {language === 'sr' ? 'Danas' : 'Today'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="ml-4 font-semibold text-slate-900">
            {viewMode === 'week' 
              ? `${formatDate(days[0])} - ${formatDate(days[days.length - 1])}`
              : formatDate(currentDate)
            }
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'day' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('day')}
          >
            {language === 'sr' ? 'Dan' : 'Day'}
          </Button>
          <Button 
            variant={viewMode === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('week')}
          >
            {language === 'sr' ? 'Nedelja' : 'Week'}
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Time Header */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <div className="w-48 flex-shrink-0 p-3 font-medium text-slate-700 border-r border-slate-200">
                {language === 'sr' ? 'Vozilo / Tim' : 'Vehicle / Team'}
              </div>
              <div className="flex-1 flex">
                {viewMode === 'day' ? (
                  hours.map(hour => (
                    <div 
                      key={hour} 
                      className="flex-1 text-center text-xs text-slate-500 py-2 border-r border-slate-100"
                      style={{ minWidth: '40px' }}
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  ))
                ) : (
                  days.map((day, idx) => (
                    <div 
                      key={idx}
                      className="flex-1 text-center text-sm font-medium text-slate-700 py-2 border-r border-slate-200"
                    >
                      {formatDate(day)}
                    </div>
                  ))
                )}
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
                      <div className={`w-3 h-3 rounded-full ${vehicle.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="font-medium text-slate-900 text-sm">{vehicle.name}</span>
                    </div>
                    {vehicle.registration && (
                      <p className="text-xs text-slate-500 mt-1">{vehicle.registration}</p>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 relative" style={{ minHeight: '60px' }}>
                    {viewMode === 'day' ? (
                      <>
                        {/* Hour grid lines */}
                        <div className="absolute inset-0 flex">
                          {hours.map(hour => (
                            <div 
                              key={hour} 
                              className="flex-1 border-r border-slate-100"
                              style={{ minWidth: '40px' }}
                            />
                          ))}
                        </div>
                        
                        {/* Bookings */}
                        {getBookingsForVehicle(vehicle.id, currentDate).map((booking, bIdx) => {
                          const pos = getBookingPosition(booking);
                          return (
                            <div
                              key={booking.id}
                              className={`absolute top-2 h-10 rounded ${getStatusColor(booking.status)} text-white text-xs px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden`}
                              style={{ left: pos.left, width: pos.width }}
                              title={`${booking.patient_name} - ${booking.start_point} → ${booking.end_point}`}
                            >
                              <div className="font-medium truncate">{booking.patient_name}</div>
                              <div className="truncate opacity-80">{booking.booking_time || booking.pickup_time}</div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="flex h-full">
                        {days.map((day, dIdx) => {
                          const dayBookings = getBookingsForVehicle(vehicle.id, day);
                          return (
                            <div 
                              key={dIdx} 
                              className="flex-1 border-r border-slate-100 p-1 flex flex-col gap-1"
                            >
                              {dayBookings.map((booking, bIdx) => (
                                <div
                                  key={booking.id}
                                  className={`${getStatusColor(booking.status)} text-white text-xs px-2 py-1 rounded cursor-pointer hover:opacity-90 transition-opacity`}
                                  title={`${booking.patient_name} - ${booking.start_point} → ${booking.end_point}`}
                                >
                                  <div className="font-medium truncate">{booking.patient_name}</div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-slate-600">
        <span className="font-medium">{language === 'sr' ? 'Legenda:' : 'Legend:'}</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>{language === 'sr' ? 'Na čekanju' : 'Pending'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>{language === 'sr' ? 'Potvrđeno' : 'Confirmed'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>{language === 'sr' ? 'U toku' : 'In Progress'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-slate-400" />
          <span>{language === 'sr' ? 'Završeno' : 'Completed'}</span>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGantt;
