import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  Ambulance,
  Plus,
  Users,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Phone,
  Stethoscope,
  Activity,
  RefreshCw,
  Video,
  Search,
  Trash2,
  Save,
  X,
  MapPin,
  Navigation,
  Clock,
  User,
  GripVertical,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Jitsi Meet integration helper
const generateJitsiRoomId = (vehicleId, missionId) => {
  const timestamp = Date.now().toString(36);
  return `pc018-${vehicleId.slice(0, 8)}-${missionId ? missionId.slice(0, 8) : timestamp}`;
};

const openJitsiCall = (roomId, userName) => {
  const jitsiUrl = `https://meet.jit.si/${roomId}#userInfo.displayName="${encodeURIComponent(userName)}"`;
  window.open(jitsiUrl, '_blank', 'width=1200,height=800');
};

// Draggable Vehicle Card Component
const DraggableVehicleCard = ({ vehicle, language, onAssignClick, onVideoCall, onCompleteMission, canDelete, onDelete, user }) => {
  const hasDriver = vehicle.team?.some(m => m.role === 'driver');
  const isDraggable = hasDriver && !vehicle.current_mission;
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `vehicle-${vehicle.id}`,
    data: { vehicle },
    disabled: !isDraggable
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1,
  } : undefined;

  const getStatusColor = () => {
    if (vehicle.current_mission) return 'border-amber-400 bg-amber-50';
    if (vehicle.team?.length > 0 && hasDriver) return 'border-emerald-400 bg-emerald-50';
    if (vehicle.team?.length > 0) return 'border-blue-400 bg-blue-50';
    return 'border-slate-200 bg-white';
  };

  const getRoleBadge = (role, isFilled) => {
    const colors = {
      driver: isFilled ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700',
      nurse: isFilled ? 'bg-pink-100 text-pink-800' : 'bg-slate-100 text-slate-500',
      doctor: isFilled ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500',
    };
    return colors[role] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        rounded-xl border-2 p-4 transition-all duration-200 mb-4
        ${getStatusColor()}
        ${isDragging ? 'shadow-2xl ring-2 ring-slate-900 ring-offset-2 opacity-90' : 'shadow-sm'}
      `}
      data-testid={`vehicle-card-${vehicle.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {isDraggable && (
            <div 
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Ambulance className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {vehicle.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono">{vehicle.registration_plate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {vehicle.current_mission ? (
            <Badge className="bg-amber-100 text-amber-700 text-[10px]">
              {language === 'sr' ? 'NA MISIJI' : 'ON MISSION'}
            </Badge>
          ) : hasDriver ? (
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
              {language === 'sr' ? 'SPREMNO' : 'READY'}
            </Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-600 text-[10px]">
              {language === 'sr' ? 'BEZ VOZAČA' : 'NO DRIVER'}
            </Badge>
          )}
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(vehicle); }}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Current Team */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {language === 'sr' ? 'Trenutni tim' : 'Current Team'}
        </div>
        {vehicle.team?.length > 0 ? (
          <div className="space-y-1">
            {vehicle.team.map((member, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                {member.role === 'driver' && <Activity className="w-3 h-3 text-amber-600" />}
                {member.role === 'doctor' && <Stethoscope className="w-3 h-3 text-blue-600" />}
                {member.role === 'nurse' && <Users className="w-3 h-3 text-pink-600" />}
                <span className="flex-1 truncate">{member.name || member.full_name}</span>
                <Badge className={`text-[9px] ${getRoleBadge(member.role, true)}`}>
                  {member.role}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            {language === 'sr' ? 'Nema dodeljenog tima' : 'No team assigned'}
          </p>
        )}
      </div>

      {/* Required Roles */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-1">
          {vehicle.required_roles?.map(role => {
            const isFilled = vehicle.team?.some(m => m.role === role);
            return (
              <Badge key={role} className={`text-[9px] ${getRoleBadge(role, isFilled)}`}>
                {!isFilled && <AlertTriangle className="w-2.5 h-2.5 mr-1" />}
                {role}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAssignClick(vehicle)}
          className="flex-1 text-xs h-8"
          data-testid={`assign-team-btn-${vehicle.id}`}
        >
          <UserPlus className="w-3 h-3 mr-1" />
          {language === 'sr' ? 'Tim' : 'Team'}
        </Button>
        {vehicle.team?.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onVideoCall(vehicle)}
            className="text-xs h-8"
          >
            <Video className="w-3 h-3" />
          </Button>
        )}
        {vehicle.current_mission && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onCompleteMission(vehicle); }}
            className="text-xs h-8 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            {language === 'sr' ? 'Završi' : 'Complete'}
          </Button>
        )}
      </div>

      {/* Drag hint */}
      {isDraggable && !vehicle.current_mission && (
        <div className="mt-2 text-center">
          <p className="text-[10px] text-emerald-600 font-medium">
            ↔ {language === 'sr' ? 'Prevuci na rezervaciju' : 'Drag to booking'}
          </p>
        </div>
      )}
    </div>
  );
};

// Vehicle Overlay for dragging
const VehicleOverlay = ({ vehicle, language }) => (
  <div className="bg-white rounded-xl border-2 border-slate-900 shadow-2xl p-4 w-72 opacity-95">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
        <Ambulance className="w-4 h-4 text-white" />
      </div>
      <div>
        <h3 className="font-bold text-slate-900 text-sm">{vehicle.name}</h3>
        <p className="text-xs text-slate-500">{vehicle.registration_plate}</p>
      </div>
    </div>
    <div className="text-xs text-slate-600">
      {vehicle.team?.map(m => m.name || m.full_name).join(', ')}
    </div>
  </div>
);

// Droppable Booking Card Component
const DroppableBookingCard = ({ booking, language, isOver }) => {
  const { setNodeRef, isOver: dropIsOver } = useDroppable({
    id: `booking-${booking.id}`,
    data: { booking }
  });

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

  // Only pending bookings without driver are droppable
  const isDroppable = booking.status === 'pending' && !booking.assigned_driver;

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-white rounded-lg border-l-4 shadow-sm p-4 mb-3 transition-all duration-200
        ${statusColors[booking.status] || 'border-l-slate-300'}
        ${dropIsOver && isDroppable ? 'ring-2 ring-emerald-500 ring-offset-2 scale-[1.02] shadow-lg bg-emerald-50' : ''}
        ${!isDroppable ? 'opacity-70' : ''}
      `}
      data-testid={`booking-card-${booking.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-600" />
          <span className="font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
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

      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{booking.start_point || booking.pickup_address}</span>
        </div>
        <div className="flex items-start gap-2">
          <Navigation className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{booking.end_point || booking.destination_address}</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="font-mono text-xs">
            {booking.booking_date || booking.preferred_date} {booking.booking_time || booking.preferred_time}
          </span>
        </div>
        {booking.contact_phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" />
            <span className="text-xs">{booking.contact_phone}</span>
          </div>
        )}
      </div>

      {booking.assigned_driver_name ? (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700 font-medium">
            {language === 'sr' ? 'Dodeljeno:' : 'Assigned:'} {booking.assigned_driver_name}
          </span>
        </div>
      ) : isDroppable ? (
        <div className={`
          mt-3 pt-3 border-t border-dashed transition-all text-center
          ${dropIsOver ? 'border-emerald-400 bg-emerald-100' : 'border-slate-200'}
        `}>
          <p className="text-xs text-slate-500">
            {dropIsOver 
              ? (language === 'sr' ? '🎯 Otpusti za dodelu!' : '🎯 Drop to assign!')
              : (language === 'sr' ? '← Prevuci vozilo ovde' : '← Drag vehicle here')
            }
          </p>
        </div>
      ) : null}
    </div>
  );
};

const FleetDispatch = () => {
  const { language } = useLanguage();
  const { user } = useAuth();

  // Vehicles state
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  
  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState('pending');
  
  // Team assignment state
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [showAssignTeam, setShowAssignTeam] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [showConfirmAssignment, setShowConfirmAssignment] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  
  // Add vehicle state
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    name: '',
    registration_plate: '',
    vehicle_type: 'ambulance',
    capacity: 1,
    equipment: [],
    required_roles: ['driver', 'nurse'],
    optional_roles: ['doctor'],
    notes: ''
  });
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Complete mission state
  const [showCompleteMission, setShowCompleteMission] = useState(false);
  const [vehicleToComplete, setVehicleToComplete] = useState(null);
  const [completingMission, setCompletingMission] = useState(false);
  const [missionNotes, setMissionNotes] = useState('');
  
  // Manual booking creation state
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({
    patient_name: '',
    contact_phone: '',
    contact_email: '',
    pickup_address: '',
    destination_address: '',
    booking_date: '',
    booking_time: '',
    mobility_status: 'walking',
    notes: ''
  });
  
  // Drag state
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const canDeleteVehicle = () => user?.role === 'superadmin' || user?.role === 'admin';

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  // Fetch data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [vehiclesRes, bookingsRes] = await Promise.all([
        axios.get(`${API}/fleet/vehicles`),
        axios.get(`${API}/bookings`)
      ]);
      setVehicles(vehiclesRes.data);
      setBookings(bookingsRes.data);
      if (isRefresh) toast.success(language === 'sr' ? 'Osveženo!' : 'Refreshed!');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  const fetchAvailableStaff = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/users/staff`);
      setAvailableStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAvailableStaff();
    
    // Poll every 10 seconds
    const interval = setInterval(() => fetchData(), 10000);
    return () => clearInterval(interval);
  }, [fetchData, fetchAvailableStaff]);

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v => {
    if (!vehicleSearch.trim()) return true;
    const search = vehicleSearch.toLowerCase();
    return v.name?.toLowerCase().includes(search) ||
           v.registration_plate?.toLowerCase().includes(search);
  });

  // Filter bookings
  const filteredBookings = bookings.filter(b => {
    if (bookingFilter === 'all') return b.status !== 'completed' && b.status !== 'cancelled';
    if (bookingFilter === 'pending') return b.status === 'pending';
    if (bookingFilter === 'active') return b.status === 'confirmed' || b.status === 'in_progress';
    return true;
  });

  // Handle drag start
  const handleDragStart = (event) => {
    const vehicle = vehicles.find(v => `vehicle-${v.id}` === event.active.id);
    setActiveVehicle(vehicle);
  };

  // Handle drag end - assign vehicle to booking
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveVehicle(null);

    if (!over) return;

    const vehicleId = active.id.replace('vehicle-', '');
    const bookingId = over.id.replace('booking-', '');

    const vehicle = vehicles.find(v => v.id === vehicleId);
    const booking = bookings.find(b => b.id === bookingId);

    if (!vehicle || !booking) return;

    // Validate
    if (booking.status !== 'pending') {
      toast.error(language === 'sr' ? 'Ova rezervacija je već dodeljena' : 'This booking is already assigned');
      return;
    }

    if (booking.assigned_driver) {
      toast.error(language === 'sr' ? 'Rezervacija već ima vozača' : 'Booking already has a driver');
      return;
    }

    // Find driver in team
    const driver = vehicle.team?.find(m => m.role === 'driver');
    if (!driver) {
      toast.error(language === 'sr' ? 'Vozilo nema vozača' : 'Vehicle has no driver');
      return;
    }

    setAssigning(true);
    try {
      await axios.post(`${API}/admin/assign-driver-public?booking_id=${bookingId}&driver_id=${driver.user_id}`);
      
      toast.success(
        language === 'sr' 
          ? `✅ ${vehicle.name} dodeljen pacijentu ${booking.patient_name}` 
          : `✅ ${vehicle.name} assigned to ${booking.patient_name}`,
        { duration: 5000 }
      );
      
      fetchData();
    } catch (error) {
      const errMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : (language === 'sr' ? 'Greška pri dodeli' : 'Assignment error');
      toast.error(errMsg);
    } finally {
      setAssigning(false);
    }
  };

  // Open assign team dialog
  const openAssignTeam = (vehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedTeamMembers(vehicle.team?.map(m => m.user_id) || []);
    setShowAssignTeam(true);
    setStaffSearch('');
  };

  // Save team assignment
  const saveTeamAssignment = async () => {
    setSavingTeam(true);
    try {
      // First, remove existing team members that are not selected
      const currentTeam = selectedVehicle.team || [];
      const currentUserIds = currentTeam.map(m => m.user_id);
      
      // Remove team members that are not in new selection
      for (const member of currentTeam) {
        if (!selectedTeamMembers.includes(member.user_id)) {
          await axios.delete(`${API}/fleet/vehicles/${selectedVehicle.id}/team/${member.user_id}`);
        }
      }
      
      // Add new team members
      for (const userId of selectedTeamMembers) {
        if (!currentUserIds.includes(userId)) {
          const staff = availableStaff.find(s => s.id === userId);
          await axios.post(`${API}/fleet/vehicles/${selectedVehicle.id}/team`, {
            user_id: userId,
            role: staff?.role
          });
        }
      }

      toast.success(language === 'sr' ? 'Tim sačuvan!' : 'Team saved!');
      setShowAssignTeam(false);
      setShowConfirmAssignment(false);
      fetchData();
    } catch (error) {
      const errMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : (language === 'sr' ? 'Greška' : 'Error');
      toast.error(errMsg);
    } finally {
      setSavingTeam(false);
    }
  };

  // Add new vehicle
  const handleAddVehicle = async () => {
    try {
      await axios.post(`${API}/fleet/vehicles`, newVehicle);
      toast.success(language === 'sr' ? 'Vozilo dodato!' : 'Vehicle added!');
      setShowAddVehicle(false);
      setNewVehicle({
        name: '',
        registration_plate: '',
        vehicle_type: 'ambulance',
        capacity: 1,
        equipment: [],
        required_roles: ['driver', 'nurse'],
        optional_roles: ['doctor'],
        notes: ''
      });
      fetchData();
    } catch (error) {
      const errMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : (language === 'sr' ? 'Greška' : 'Error');
      toast.error(errMsg);
    }
  };

  // Delete vehicle
  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/fleet/vehicles/${vehicleToDelete.id}`);
      toast.success(language === 'sr' ? 'Vozilo obrisano!' : 'Vehicle deleted!');
      setShowDeleteConfirm(false);
      setVehicleToDelete(null);
      fetchData();
    } catch (error) {
      const errMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : (language === 'sr' ? 'Greška' : 'Error');
      toast.error(errMsg);
    } finally {
      setDeleting(false);
    }
  };

  // Complete mission
  const handleCompleteMission = async () => {
    if (!vehicleToComplete) return;
    setCompletingMission(true);
    try {
      await axios.post(`${API}/fleet/vehicles/${vehicleToComplete.id}/complete-mission`, {
        notes: missionNotes
      });
      toast.success(language === 'sr' ? 'Misija završena!' : 'Mission completed!');
      setShowCompleteMission(false);
      setVehicleToComplete(null);
      setMissionNotes('');
      fetchData();
    } catch (error) {
      const errMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : (language === 'sr' ? 'Greška' : 'Error');
      toast.error(errMsg);
    } finally {
      setCompletingMission(false);
    }
  };

  // Video call
  const startVideoCall = (vehicle) => {
    const roomId = generateJitsiRoomId(vehicle.id, vehicle.current_mission?.id);
    openJitsiCall(roomId, user?.full_name || 'Dispatcher');
    toast.info(language === 'sr' ? 'Video poziv pokrenut' : 'Video call started');
  };

  // Filter staff for search
  const filteredStaff = availableStaff.filter(s => {
    if (!staffSearch.trim()) return true;
    return s.full_name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
           s.role?.toLowerCase().includes(staffSearch.toLowerCase());
  });

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const activeCount = bookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress').length;
  const readyVehicles = vehicles.filter(v => !v.current_mission && v.team?.some(m => m.role === 'driver')).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full" data-testid="fleet-dispatch">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {language === 'sr' ? 'Vozila & Rezervacije' : 'Vehicles & Bookings'}
            </h2>
            <p className="text-sm text-slate-500">
              {language === 'sr' ? 'Prevuci vozilo na rezervaciju za dodelu' : 'Drag vehicle onto booking to assign'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-3 bg-slate-100 rounded-full px-4 py-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-slate-700">{pendingCount}</span>
                <span className="text-xs text-slate-500">{language === 'sr' ? 'čeka' : 'pending'}</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-sm font-semibold text-slate-700">{readyVehicles}</span>
                <span className="text-xs text-slate-500">{language === 'sr' ? 'spremno' : 'ready'}</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => setShowAddVehicle(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {language === 'sr' ? 'Novo vozilo' : 'Add Vehicle'}
            </Button>
          </div>
        </div>

        {/* Split View */}
        <div className="flex gap-6 h-[calc(100vh-280px)]">
          {/* LEFT: Vehicles */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-slate-100 rounded-t-xl px-4 py-3 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Ambulance className="w-4 h-4" />
                  {language === 'sr' ? 'Flota vozila' : 'Vehicle Fleet'}
                  <Badge variant="secondary" className="ml-2">{vehicles.length}</Badge>
                </h3>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={language === 'sr' ? 'Pretraži...' : 'Search...'}
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="pl-9 h-8 w-48 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-white rounded-b-xl p-4">
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Ambulance className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{language === 'sr' ? 'Nema vozila' : 'No vehicles'}</p>
                </div>
              ) : (
                filteredVehicles.map(vehicle => (
                  <DraggableVehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    language={language}
                    onAssignClick={openAssignTeam}
                    onVideoCall={startVideoCall}
                    onCompleteMission={(v) => { setVehicleToComplete(v); setShowCompleteMission(true); }}
                    canDelete={canDeleteVehicle()}
                    onDelete={(v) => { setVehicleToDelete(v); setShowDeleteConfirm(true); }}
                    user={user}
                  />
                ))
              )}
            </div>
          </div>

          {/* RIGHT: Bookings */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-slate-100 rounded-t-xl px-4 py-3 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {language === 'sr' ? 'Rezervacije' : 'Bookings'}
                </h3>
                <div className="flex gap-1">
                  {[
                    { key: 'pending', label: language === 'sr' ? 'Čekaju' : 'Pending', count: pendingCount },
                    { key: 'active', label: language === 'sr' ? 'Aktivni' : 'Active', count: activeCount },
                    { key: 'all', label: language === 'sr' ? 'Svi' : 'All' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setBookingFilter(tab.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        bookingFilter === tab.key 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-white text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="ml-1 opacity-70">({tab.count})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-white rounded-b-xl p-4">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{language === 'sr' ? 'Nema rezervacija' : 'No bookings'}</p>
                </div>
              ) : (
                filteredBookings.map(booking => (
                  <DroppableBookingCard
                    key={booking.id}
                    booking={booking}
                    language={language}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {assigning && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-2xl flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="font-medium">
                {language === 'sr' ? 'Dodeljujem...' : 'Assigning...'}
              </span>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeVehicle ? <VehicleOverlay vehicle={activeVehicle} language={language} /> : null}
        </DragOverlay>

        {/* Assign Team Dialog */}
        <Dialog open={showAssignTeam} onOpenChange={setShowAssignTeam}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {language === 'sr' ? 'Dodeli tim' : 'Assign Team'} - {selectedVehicle?.name}
              </DialogTitle>
              <DialogDescription>
                {language === 'sr' ? 'Izaberite članove tima za ovo vozilo' : 'Select team members for this vehicle'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={language === 'sr' ? 'Pretraži osoblje...' : 'Search staff...'}
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredStaff.map(staff => (
                  <label
                    key={staff.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTeamMembers.includes(staff.id) 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedTeamMembers.includes(staff.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTeamMembers([...selectedTeamMembers, staff.id]);
                        } else {
                          setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== staff.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{staff.full_name}</p>
                      <p className="text-xs text-slate-500">{staff.phone}</p>
                    </div>
                    <Badge className={
                      staff.role === 'driver' ? 'bg-amber-100 text-amber-800' :
                      staff.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                      'bg-pink-100 text-pink-800'
                    }>
                      {staff.role}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignTeam(false)}>
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button 
                onClick={() => setShowConfirmAssignment(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={selectedTeamMembers.length === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                {language === 'sr' ? 'Sačuvaj tim' : 'Save Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Assignment Dialog */}
        <AlertDialog open={showConfirmAssignment} onOpenChange={setShowConfirmAssignment}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {language === 'sr' ? 'Potvrdi dodelu tima' : 'Confirm Team Assignment'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {language === 'sr' 
                  ? `Da li ste sigurni da želite da dodelite ${selectedTeamMembers.length} članova timu vozila ${selectedVehicle?.name}?`
                  : `Are you sure you want to assign ${selectedTeamMembers.length} members to vehicle ${selectedVehicle?.name}?`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{language === 'sr' ? 'Otkaži' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={saveTeamAssignment} disabled={savingTeam}>
                {savingTeam && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {language === 'sr' ? 'Potvrdi' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Vehicle Dialog */}
        <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{language === 'sr' ? 'Dodaj novo vozilo' : 'Add New Vehicle'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{language === 'sr' ? 'Naziv' : 'Name'}</label>
                <Input
                  value={newVehicle.name}
                  onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                  placeholder={language === 'sr' ? 'npr. Ambulanta 1' : 'e.g., Ambulance 1'}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{language === 'sr' ? 'Registracija' : 'Registration'}</label>
                <Input
                  value={newVehicle.registration_plate}
                  onChange={(e) => setNewVehicle({ ...newVehicle, registration_plate: e.target.value })}
                  placeholder="NI-123-AB"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{language === 'sr' ? 'Napomene' : 'Notes'}</label>
                <Textarea
                  value={newVehicle.notes}
                  onChange={(e) => setNewVehicle({ ...newVehicle, notes: e.target.value })}
                  placeholder={language === 'sr' ? 'Dodatne informacije...' : 'Additional info...'}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddVehicle(false)}>
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button onClick={handleAddVehicle} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                {language === 'sr' ? 'Dodaj' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{language === 'sr' ? 'Obriši vozilo?' : 'Delete Vehicle?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {language === 'sr' 
                  ? `Da li ste sigurni da želite da obrišete vozilo "${vehicleToDelete?.name}"?`
                  : `Are you sure you want to delete vehicle "${vehicleToDelete?.name}"?`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{language === 'sr' ? 'Otkaži' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteVehicle} disabled={deleting} className="bg-red-600 hover:bg-red-700">
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {language === 'sr' ? 'Obriši' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Complete Mission Dialog */}
        <Dialog open={showCompleteMission} onOpenChange={setShowCompleteMission}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'sr' ? 'Završi misiju' : 'Complete Mission'}</DialogTitle>
              <DialogDescription>
                {language === 'sr' 
                  ? `Završite aktivnu misiju za vozilo ${vehicleToComplete?.name}`
                  : `Complete the active mission for vehicle ${vehicleToComplete?.name}`
                }
              </DialogDescription>
            </DialogHeader>
            <div>
              <label className="text-sm font-medium">{language === 'sr' ? 'Napomene (opciono)' : 'Notes (optional)'}</label>
              <Textarea
                value={missionNotes}
                onChange={(e) => setMissionNotes(e.target.value)}
                placeholder={language === 'sr' ? 'Dodajte napomene o misiji...' : 'Add mission notes...'}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompleteMission(false)}>
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button onClick={handleCompleteMission} disabled={completingMission} className="bg-emerald-600 hover:bg-emerald-700">
                {completingMission && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <CheckCircle className="w-4 h-4 mr-2" />
                {language === 'sr' ? 'Završi' : 'Complete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
};

export default FleetDispatch;
