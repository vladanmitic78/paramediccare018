import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  Ambulance,
  MapPin,
  Clock,
  User,
  Phone,
  Navigation,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Users,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  Filter,
  LayoutGrid,
  Map as MapIcon,
  X,
  Calendar,
  Stethoscope,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import AdminLiveMap from '../components/AdminLiveMap';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Draggable Booking Card Component
const DraggableBookingCard = ({ booking, language }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: { booking }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  const statusColors = {
    pending: 'border-l-red-500 bg-red-50',
    confirmed: 'border-l-blue-500 bg-blue-50',
    in_progress: 'border-l-amber-500 bg-amber-50',
  };

  const statusLabels = {
    pending: { sr: 'Čeka', en: 'Pending' },
    confirmed: { sr: 'Potvrđeno', en: 'Confirmed' },
    in_progress: { sr: 'U toku', en: 'In Progress' },
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white rounded-lg border-l-4 shadow-sm p-3 mb-3 cursor-grab active:cursor-grabbing
        transition-shadow hover:shadow-md
        ${statusColors[booking.status] || 'border-l-slate-300'}
        ${isDragging ? 'shadow-xl ring-2 ring-slate-900 ring-offset-2' : ''}
      `}
      data-testid={`booking-card-${booking.id}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-900 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {booking.patient_name}
          </span>
        </div>
        <Badge className={`text-[10px] px-2 py-0.5 ${
          booking.status === 'pending' ? 'bg-red-100 text-red-700' :
          booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {statusLabels[booking.status]?.[language] || booking.status}
        </Badge>
      </div>
      
      <div className="space-y-1 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
          <span className="truncate">{booking.start_point || booking.pickup_address}</span>
        </div>
        <div className="flex items-center gap-2">
          <Navigation className="w-3 h-3 text-red-600 shrink-0" />
          <span className="truncate">{booking.end_point || booking.destination_address}</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="font-mono text-[11px]">
            {booking.booking_date || booking.preferred_date} {booking.booking_time || booking.preferred_time}
          </span>
        </div>
      </div>

      {booking.assigned_driver_name && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-xs">
          <User className="w-3 h-3 text-blue-600" />
          <span className="text-blue-700 font-medium">{booking.assigned_driver_name}</span>
        </div>
      )}
    </div>
  );
};

// Booking Card for Drag Overlay (simplified version)
const BookingCardOverlay = ({ booking }) => (
  <div className="bg-white rounded-lg border-l-4 border-l-slate-900 shadow-2xl p-3 w-72 opacity-90">
    <div className="font-semibold text-slate-900 text-sm mb-1">{booking.patient_name}</div>
    <div className="text-xs text-slate-600 flex items-center gap-1">
      <MapPin className="w-3 h-3" />
      {booking.start_point || booking.pickup_address}
    </div>
  </div>
);

// Droppable Vehicle Card Component
const DroppableVehicleCard = ({ vehicle, language, isOver, onAssignClick }) => {
  const { setNodeRef, isOver: dropIsOver } = useDroppable({
    id: `vehicle-${vehicle.id}`,
    data: { vehicle }
  });

  const getStatusColor = () => {
    if (vehicle.current_mission) return 'border-amber-400 bg-amber-50';
    if (vehicle.team?.length > 0) return 'border-emerald-400 bg-emerald-50';
    return 'border-slate-200 bg-white';
  };

  const getStatusBadge = () => {
    if (vehicle.current_mission) {
      return <Badge className="bg-amber-100 text-amber-700 text-[10px]">
        {language === 'sr' ? 'NA MISIJI' : 'ON MISSION'}
      </Badge>;
    }
    if (vehicle.team?.length > 0) {
      return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
        {language === 'sr' ? 'DOSTUPNO' : 'AVAILABLE'}
      </Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-600 text-[10px]">
      {language === 'sr' ? 'BEZ TIMA' : 'NO TEAM'}
    </Badge>;
  };

  const isAvailable = !vehicle.current_mission && vehicle.team?.length > 0;

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl border-2 p-4 transition-all duration-200
        ${getStatusColor()}
        ${dropIsOver && isAvailable ? 'ring-2 ring-slate-900 ring-offset-2 scale-[1.02] shadow-lg' : ''}
        ${!isAvailable ? 'opacity-60' : ''}
      `}
      data-testid={`vehicle-card-${vehicle.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
            <Ambulance className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {vehicle.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono">{vehicle.registration_plate}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Team Members */}
      <div className="space-y-2 mb-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {language === 'sr' ? 'Tim' : 'Team'}
        </div>
        {vehicle.team?.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {vehicle.team.map((member, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs bg-white/60 rounded px-2 py-1">
                {member.role === 'driver' && <Activity className="w-3 h-3 text-amber-600" />}
                {member.role === 'doctor' && <Stethoscope className="w-3 h-3 text-blue-600" />}
                {member.role === 'nurse' && <Users className="w-3 h-3 text-pink-600" />}
                <span className="truncate">{member.name?.split(' ')[0] || member.full_name?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            {language === 'sr' ? 'Nema dodeljenog tima' : 'No team assigned'}
          </p>
        )}
      </div>

      {/* Current Mission or Drop Zone */}
      {vehicle.current_mission ? (
        <div className="bg-white/80 rounded-lg p-2 border border-amber-200">
          <div className="text-xs font-semibold text-amber-700 mb-1">
            {language === 'sr' ? 'Aktivna misija' : 'Active Mission'}
          </div>
          <div className="text-xs text-slate-600 truncate">
            {vehicle.current_mission.patient_name || 'Patient'}
          </div>
        </div>
      ) : isAvailable ? (
        <div className={`
          border-2 border-dashed rounded-lg p-3 text-center transition-all
          ${dropIsOver ? 'border-slate-900 bg-slate-100' : 'border-slate-300'}
        `}>
          <p className="text-xs text-slate-500">
            {dropIsOver 
              ? (language === 'sr' ? '🎯 Otpusti za dodelu' : '🎯 Drop to assign')
              : (language === 'sr' ? 'Prevuci rezervaciju ovde' : 'Drag booking here')
            }
          </p>
        </div>
      ) : null}
    </div>
  );
};

const DispatchConsole = () => {
  const { language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [showMap, setShowMap] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [bookingsRes, vehiclesRes] = await Promise.all([
        axios.get(`${API}/bookings`),
        axios.get(`${API}/fleet/vehicles`)
      ]);
      setBookings(bookingsRes.data);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (!user || !isAdmin()) {
      navigate('/login');
      return;
    }
    fetchData();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user, isAdmin, navigate, fetchData]);

  // Filter bookings
  const filteredBookings = bookings.filter(b => {
    if (activeFilter === 'all') return b.status !== 'completed' && b.status !== 'cancelled';
    if (activeFilter === 'pending') return b.status === 'pending';
    if (activeFilter === 'active') return b.status === 'confirmed' || b.status === 'in_progress';
    return true;
  });

  // Handle drag end - assign booking to vehicle
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveBooking(null);

    if (!over) return;

    const bookingId = active.id.replace('booking-', '');
    const vehicleId = over.id.replace('vehicle-', '');

    const vehicle = vehicles.find(v => v.id === vehicleId);
    const booking = bookings.find(b => b.id === bookingId);

    if (!vehicle || !booking) return;

    // Check if vehicle is available
    if (vehicle.current_mission) {
      toast.error(language === 'sr' ? 'Vozilo je već na misiji' : 'Vehicle is already on a mission');
      return;
    }

    if (!vehicle.team || vehicle.team.length === 0) {
      toast.error(language === 'sr' ? 'Vozilo nema dodeljen tim' : 'Vehicle has no assigned team');
      return;
    }

    // Find driver in team
    const driver = vehicle.team.find(m => m.role === 'driver');
    if (!driver) {
      toast.error(language === 'sr' ? 'Vozilo nema vozača' : 'Vehicle has no driver');
      return;
    }

    setAssigning(true);
    try {
      // Assign driver to booking
      await axios.post(`${API}/admin/assign-driver-public?booking_id=${bookingId}&driver_id=${driver.user_id}`);
      
      toast.success(
        language === 'sr' 
          ? `✅ ${booking.patient_name} dodeljen vozilu ${vehicle.name}` 
          : `✅ ${booking.patient_name} assigned to ${vehicle.name}`
      );
      
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri dodeli' : 'Assignment error'));
    } finally {
      setAssigning(false);
    }
  };

  const handleDragStart = (event) => {
    const booking = bookings.find(b => `booking-${b.id}` === event.active.id);
    setActiveBooking(booking);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-slate-900" />
      </div>
    );
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const activeCount = bookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress').length;
  const availableVehicles = vehicles.filter(v => !v.current_mission && v.team?.length > 0).length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-slate-100" data-testid="dispatch-console">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-slate-600 hover:text-slate-900"
                data-testid="back-to-dashboard"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {language === 'sr' ? 'Nazad' : 'Back'}
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {language === 'sr' ? 'Dispečerski Centar' : 'Dispatch Center'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {language === 'sr' ? 'Upravljanje rezervacijama i flotom' : 'Booking & Fleet Management'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Stats Pills */}
              <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-slate-700">{pendingCount}</span>
                  <span className="text-xs text-slate-500">{language === 'sr' ? 'čeka' : 'pending'}</span>
                </div>
                <div className="w-px h-4 bg-slate-300" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-xs font-semibold text-slate-700">{availableVehicles}</span>
                  <span className="text-xs text-slate-500">{language === 'sr' ? 'vozila' : 'vehicles'}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMap(!showMap)}
                className={showMap ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}
                data-testid="toggle-map-btn"
              >
                <MapIcon className="w-4 h-4 mr-2" />
                {language === 'sr' ? 'Mapa' : 'Map'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData()}
                data-testid="refresh-btn"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content - Split Screen */}
        <div className="flex h-[calc(100vh-73px)]">
          {/* Left Panel - Bookings Queue (35%) */}
          <div className="w-[35%] min-w-[320px] border-r border-slate-200 bg-white flex flex-col">
            {/* Filter Tabs */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex gap-2">
                {[
                  { key: 'pending', label: language === 'sr' ? 'Čekaju' : 'Pending', count: pendingCount, color: 'red' },
                  { key: 'active', label: language === 'sr' ? 'Aktivni' : 'Active', count: activeCount, color: 'amber' },
                  { key: 'all', label: language === 'sr' ? 'Svi' : 'All', count: filteredBookings.length, color: 'slate' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`
                      flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${activeFilter === tab.key 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }
                    `}
                    data-testid={`filter-${tab.key}`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                        activeFilter === tab.key ? 'bg-white/20' : `bg-${tab.color}-100 text-${tab.color}-700`
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bookings List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">
                    {language === 'sr' ? 'Nema rezervacija u ovoj kategoriji' : 'No bookings in this category'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 mb-3 flex items-center gap-2">
                    <GripVertical className="w-3 h-3" />
                    {language === 'sr' ? 'Prevuci na vozilo za dodelu' : 'Drag onto vehicle to assign'}
                  </p>
                  {filteredBookings.map(booking => (
                    <DraggableBookingCard
                      key={booking.id}
                      booking={booking}
                      language={language}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Fleet & Map (65%) */}
          <div className="flex-1 flex flex-col bg-slate-50">
            {showMap ? (
              /* Map View */
              <div className="flex-1 relative">
                <AdminLiveMap />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMap(false)}
                  className="absolute top-4 right-4 bg-white shadow-lg"
                >
                  <X className="w-4 h-4 mr-2" />
                  {language === 'sr' ? 'Zatvori mapu' : 'Close Map'}
                </Button>
              </div>
            ) : (
              /* Fleet Grid View */
              <>
                <div className="p-4 border-b border-slate-200 bg-white">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {language === 'sr' ? 'Flota vozila' : 'Vehicle Fleet'}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-400" />
                        <span>{language === 'sr' ? 'Dostupno' : 'Available'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-amber-400" />
                        <span>{language === 'sr' ? 'Na misiji' : 'On mission'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-slate-300" />
                        <span>{language === 'sr' ? 'Bez tima' : 'No team'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {vehicles.map(vehicle => (
                      <DroppableVehicleCard
                        key={vehicle.id}
                        vehicle={vehicle}
                        language={language}
                      />
                    ))}
                  </div>

                  {vehicles.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <Ambulance className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm">
                        {language === 'sr' ? 'Nema vozila u floti' : 'No vehicles in fleet'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Loading Overlay during assignment */}
        {assigning && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-2xl flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
              <span className="font-medium">
                {language === 'sr' ? 'Dodeljujem...' : 'Assigning...'}
              </span>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeBooking ? <BookingCardOverlay booking={activeBooking} /> : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default DispatchConsole;
