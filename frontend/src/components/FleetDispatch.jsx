import { useState, useEffect, useCallback, useRef } from 'react';
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
  ArrowRight,
  Edit2,
  Truck,
  MessageSquare,
  Send
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

// Mini Timeline Component for Vehicle Cards
const VehicleTimeline = ({ schedules, language }) => {
  // Timeline hours (6 AM to 10 PM)
  const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
  const startHour = 6;
  const endHour = 22;
  const totalHours = endHour - startHour;
  
  // Get current hour for marker
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentPosition = ((currentHour - startHour) / totalHours) * 100;
  const showCurrentMarker = currentHour >= startHour && currentHour <= endHour;
  
  // Calculate schedule blocks
  const getScheduleBlocks = () => {
    if (!schedules || schedules.length === 0) return [];
    
    return schedules.map(schedule => {
      const startTime = new Date(schedule.start_time);
      const endTime = new Date(schedule.end_time);
      const startPos = ((startTime.getHours() + startTime.getMinutes() / 60 - startHour) / totalHours) * 100;
      const endPos = ((endTime.getHours() + endTime.getMinutes() / 60 - startHour) / totalHours) * 100;
      const width = endPos - startPos;
      
      return {
        ...schedule,
        left: Math.max(0, startPos),
        width: Math.min(width, 100 - Math.max(0, startPos)),
        startTimeStr: startTime.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }),
        endTimeStr: endTime.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
      };
    }).filter(s => s.width > 0);
  };
  
  const blocks = getScheduleBlocks();
  const hasSchedules = blocks.length > 0;
  
  return (
    <div className="mt-2 mb-1" data-testid="vehicle-timeline">
      {/* Timeline label */}
      <div className="text-[10px] font-medium text-slate-500 mb-1 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {language === 'sr' ? 'Danas' : 'Today'}
        {!hasSchedules && (
          <span className="text-emerald-600 ml-1">
            ({language === 'sr' ? 'slobodno' : 'free'})
          </span>
        )}
      </div>
      
      {/* Timeline bar */}
      <div className="relative h-6 bg-slate-100 rounded-md overflow-hidden">
        {/* Hour markers */}
        <div className="absolute inset-0 flex">
          {hours.map((hour, idx) => (
            <div 
              key={hour} 
              className="flex-1 border-l border-slate-200 first:border-l-0"
              style={{ borderColor: hour === 12 ? '#94a3b8' : undefined }}
            />
          ))}
        </div>
        
        {/* Schedule blocks */}
        {blocks.map((block, idx) => (
          <div
            key={block.id || idx}
            className={`absolute top-0.5 bottom-0.5 rounded transition-all cursor-pointer hover:opacity-80 ${
              block.status === 'in_progress' 
                ? 'bg-amber-500' 
                : block.status === 'completed' 
                  ? 'bg-slate-400' 
                  : 'bg-sky-500'
            }`}
            style={{ left: `${block.left}%`, width: `${block.width}%` }}
            title={`${block.patient_name || 'Booking'}\n${block.startTimeStr} - ${block.endTimeStr}`}
          >
            {block.width > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-medium truncate px-1">
                {block.patient_name?.split(' ')[0] || ''}
              </span>
            )}
          </div>
        ))}
        
        {/* Current time marker */}
        {showCurrentMarker && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${currentPosition}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
          </div>
        )}
      </div>
      
      {/* Hour labels */}
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] text-slate-400">06</span>
        <span className="text-[8px] text-slate-400">12</span>
        <span className="text-[8px] text-slate-400">18</span>
        <span className="text-[8px] text-slate-400">22</span>
      </div>
    </div>
  );
};

// Draggable Vehicle Card Component
const DraggableVehicleCard = ({ vehicle, language, onAssignClick, onVideoCall, onCompleteMission, canDelete, onDelete, user, schedules }) => {
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
        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      data-testid={`vehicle-card-${vehicle.id}`}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {isDraggable && (
            <div className="p-1">
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

      {/* Mini Timeline - Today's Schedule */}
      <VehicleTimeline schedules={schedules} language={language} />

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
const DroppableBookingCard = ({ booking, language, isOver, onEdit, onDetach, onSendSMS }) => {
  const { setNodeRef, isOver: dropIsOver } = useDroppable({
    id: `booking-${booking.id}`,
    data: { booking }
  });

  const statusColors = {
    pending: 'border-l-red-500 bg-red-50',
    confirmed: 'border-l-blue-500 bg-blue-50',
    in_progress: 'border-l-amber-500 bg-amber-50',
    en_route: 'border-l-purple-500 bg-purple-50',
    on_site: 'border-l-orange-500 bg-orange-50',
    transporting: 'border-l-emerald-500 bg-emerald-50',
  };

  const statusLabels = {
    pending: { sr: 'Čeka', en: 'Pending', color: 'bg-red-100 text-red-700' },
    confirmed: { sr: 'Potvrđeno', en: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
    in_progress: { sr: 'U toku', en: 'In Progress', color: 'bg-amber-100 text-amber-700' },
    en_route: { sr: 'Na putu', en: 'En Route', color: 'bg-purple-100 text-purple-700', pulse: true },
    on_site: { sr: 'Na lokaciji', en: 'On Site', color: 'bg-orange-100 text-orange-700', pulse: true },
    transporting: { sr: 'U transportu', en: 'Transporting', color: 'bg-emerald-100 text-emerald-700', pulse: true },
  };

  const currentStatus = statusLabels[booking.status] || { sr: booking.status, en: booking.status, color: 'bg-slate-100 text-slate-700' };

  // Droppable for new assignment OR reassignment (pending/confirmed only)
  const isDroppable = ['pending', 'confirmed'].includes(booking.status);
  
  // Can edit if pending or active (not completed/cancelled)
  const canEdit = ['pending', 'confirmed', 'in_progress', 'en_route', 'on_site', 'transporting'].includes(booking.status);
  
  // Can send SMS if has phone number
  const canSendSMS = booking.contact_phone && ['confirmed', 'in_progress', 'en_route', 'on_site'].includes(booking.status);

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-white rounded-lg border-l-4 shadow-sm p-4 mb-3 transition-all duration-200
        ${statusColors[booking.status] || 'border-l-slate-300'}
        ${dropIsOver && isDroppable ? 'ring-2 ring-emerald-500 ring-offset-2 scale-[1.02] shadow-lg bg-emerald-50' : ''}
        ${!isDroppable && booking.status === 'pending' ? 'opacity-70' : ''}
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
        <div className="flex items-center gap-2">
          {canSendSMS && onSendSMS && (
            <button
              onClick={(e) => { e.stopPropagation(); onSendSMS(booking); }}
              className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
              title={language === 'sr' ? 'Pošalji SMS' : 'Send SMS'}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          {canEdit && onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(booking); }}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title={language === 'sr' ? 'Uredi' : 'Edit'}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 ${currentStatus.color}`}>
            {currentStatus.pulse && (
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            )}
            {currentStatus[language] || booking.status}
          </Badge>
        </div>
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
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">
                {booking.assigned_driver_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {['en_route', 'on_site', 'transporting'].includes(booking.status) && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse" />
                  LIVE
                </span>
              )}
              {/* Detach button - only show for pending/confirmed status */}
              {['pending', 'confirmed'].includes(booking.status) && onDetach && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDetach(booking); }}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title={language === 'sr' ? 'Ukloni vozača' : 'Remove driver'}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {/* Show drop zone for reassignment */}
          {['pending', 'confirmed'].includes(booking.status) && (
            <div className={`
              mt-2 pt-2 border-t border-dashed transition-all text-center
              ${dropIsOver ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}
            `}>
              <p className="text-xs text-slate-400">
                {dropIsOver 
                  ? (language === 'sr' ? '🔄 Otpusti za zamenu!' : '🔄 Drop to replace!')
                  : (language === 'sr' ? '↔ Prevuci drugo vozilo za zamenu' : '↔ Drag another vehicle to replace')
                }
              </p>
            </div>
          )}
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
  const [vehicleSchedules, setVehicleSchedules] = useState({});  // Map of vehicle_id -> schedules
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');
  
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
  
  // Conflict warning modal state
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  
  // Manual booking creation state
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({
    patient_name: '',
    contact_phone: '',
    contact_email: '',
    pickup_address: '',
    pickup_lat: null,
    pickup_lng: null,
    destination_address: '',
    destination_lat: null,
    destination_lng: null,
    pickup_date: '',
    pickup_time: '',
    arrival_date: '',
    arrival_time: '',
    mobility_status: 'walking',
    notes: '',
    route_distance_km: null,
    route_duration: null
  });
  
  // Edit booking state
  const [showEditBooking, setShowEditBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState(null);
  
  // Address search state
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDestination, setSearchingDestination] = useState(false);
  const pickupSearchTimeout = useRef(null);
  const destinationSearchTimeout = useRef(null);
  
  // Drag state
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [assigning, setAssigning] = useState(false);
  
  // SMS Dialog state
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [smsBooking, setSmsBooking] = useState(null);
  const [smsType, setSmsType] = useState('reminder');
  const [smsCustomMessage, setSmsCustomMessage] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);
  
  // Time-slot assignment modal state
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState(null);  // {vehicle, booking, driver}
  const [assignmentTimeSlot, setAssignmentTimeSlot] = useState({ 
    startDate: '', 
    startTime: '', 
    endDate: '', 
    endTime: '' 
  });
  const [availabilityCheck, setAvailabilityCheck] = useState(null);  // {available, conflicts}
  const [checkingAvailability, setCheckingAvailability] = useState(false);

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
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      const [vehiclesRes, bookingsRes, schedulesRes] = await Promise.all([
        axios.get(`${API}/fleet/vehicles`),
        axios.get(`${API}/bookings`),
        axios.get(`${API}/fleet/schedules?date=${today}`)
      ]);
      
      setVehicles(vehiclesRes.data);
      setBookings(bookingsRes.data);
      
      // Group schedules by vehicle_id
      const schedulesByVehicle = {};
      schedulesRes.data.forEach(schedule => {
        if (!schedulesByVehicle[schedule.vehicle_id]) {
          schedulesByVehicle[schedule.vehicle_id] = [];
        }
        schedulesByVehicle[schedule.vehicle_id].push(schedule);
      });
      setVehicleSchedules(schedulesByVehicle);
      
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

  // Send SMS to booking contact
  const handleSendSMS = async () => {
    if (!smsBooking) return;
    
    setSendingSMS(true);
    try {
      const params = new URLSearchParams({ message_type: smsType });
      if (smsType === 'custom' && smsCustomMessage) {
        params.append('custom_message', smsCustomMessage);
      }
      
      const response = await axios.post(
        `${API}/bookings/${smsBooking.id}/send-sms?${params}`
      );
      
      if (response.data.success) {
        toast.success(language === 'sr' ? 'SMS poslat!' : 'SMS sent!');
        setShowSMSDialog(false);
        setSmsBooking(null);
        setSmsCustomMessage('');
      } else {
        toast.error(response.data.error || (language === 'sr' ? 'Greška pri slanju' : 'Error sending'));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri slanju SMS-a' : 'Error sending SMS'));
    } finally {
      setSendingSMS(false);
    }
  };

  // Open SMS dialog for a booking
  const openSMSDialog = (booking) => {
    setSmsBooking(booking);
    setSmsType('reminder');
    setSmsCustomMessage('');
    setShowSMSDialog(true);
  };

  useEffect(() => {
    fetchData();
    fetchAvailableStaff();
    
    // Poll every 5 seconds for live status updates
    const interval = setInterval(() => fetchData(), 5000);
    return () => clearInterval(interval);
  }, [fetchData, fetchAvailableStaff]);

  // Filter vehicles by status and search
  const filteredVehicles = vehicles.filter(v => {
    // First filter by status
    const hasDriver = v.team?.some(m => m.role === 'driver');
    let statusMatch = true;
    if (vehicleFilter === 'ready') statusMatch = hasDriver && !v.current_mission;
    else if (vehicleFilter === 'busy') statusMatch = !!v.current_mission;
    
    if (!statusMatch) return false;
    
    // Then filter by search (search any parameter)
    if (vehicleSearch.trim()) {
      const search = vehicleSearch.toLowerCase();
      const searchableFields = [
        v.name,
        v.registration_plate,
        v.type,
        ...(v.team || []).map(m => m.name),
        ...(v.team || []).map(m => m.role)
      ];
      return searchableFields.some(field => 
        field && String(field).toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  // Filter bookings by status and search
  const filteredBookings = bookings.filter(b => {
    // First filter by status
    let statusMatch = true;
    if (bookingFilter === 'all') statusMatch = b.status !== 'completed' && b.status !== 'cancelled';
    else if (bookingFilter === 'pending') statusMatch = b.status === 'pending';
    else if (bookingFilter === 'active') statusMatch = ['confirmed', 'in_progress', 'en_route', 'on_site', 'transporting'].includes(b.status);
    
    if (!statusMatch) return false;
    
    // Then filter by search (search any parameter)
    if (bookingSearch.trim()) {
      const search = bookingSearch.toLowerCase();
      const searchableFields = [
        b.patient_name,
        b.contact_phone,
        b.contact_email,
        b.pickup_address,
        b.destination_address,
        b.assigned_driver,
        b.assigned_driver_name,
        b.status,
        b.booking_date,
        b.booking_time,
        b.notes,
        b.id
      ];
      return searchableFields.some(field => 
        field && String(field).toLowerCase().includes(search)
      );
    }
    
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

    // Validate - allow pending AND confirmed for reassignment
    if (!['pending', 'confirmed'].includes(booking.status)) {
      toast.error(language === 'sr' ? 'Rezervacija je već u toku i ne može se menjati' : 'Booking is already in progress and cannot be changed');
      return;
    }

    // Find driver in team
    const driver = vehicle.team?.find(m => m.role === 'driver');
    if (!driver) {
      toast.error(language === 'sr' ? 'Vozilo nema vozača' : 'Vehicle has no driver');
      return;
    }

    // Get booking date and time for default values
    const bookingDate = booking.booking_date || booking.preferred_date || new Date().toISOString().split('T')[0];
    const bookingTime = booking.booking_time || booking.preferred_time || '09:00';
    
    // Check if booking has estimated_arrival for multi-day transports
    let endDate = bookingDate;
    let endTime;
    
    if (booking.estimated_arrival) {
      // Parse estimated_arrival datetime
      const arrivalDate = new Date(booking.estimated_arrival);
      endDate = arrivalDate.toISOString().split('T')[0];
      endTime = arrivalDate.toTimeString().slice(0, 5);
    } else {
      // Calculate default end time (2 hours after start)
      const [hours, minutes] = bookingTime.split(':').map(Number);
      const endHour = Math.min(hours + 2, 22);
      endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Show time slot modal
    setPendingAssignment({ vehicle, booking, driver, bookingDate });
    setAssignmentTimeSlot({ 
      startDate: bookingDate, 
      startTime: bookingTime, 
      endDate: endDate, 
      endTime: endTime 
    });
    setAvailabilityCheck(null);
    setShowTimeSlotModal(true);
  };

  // Check availability for selected time slot
  const checkTimeSlotAvailability = async () => {
    if (!pendingAssignment || !assignmentTimeSlot.startTime || !assignmentTimeSlot.endTime) return;
    
    setCheckingAvailability(true);
    try {
      const { vehicle, driver } = pendingAssignment;
      const startISO = `${assignmentTimeSlot.startDate}T${assignmentTimeSlot.startTime}:00`;
      const endISO = `${assignmentTimeSlot.endDate}T${assignmentTimeSlot.endTime}:00`;
      
      const response = await axios.get(
        `${API}/fleet/schedules/conflicts?vehicle_id=${vehicle.id}&start_time=${startISO}&end_time=${endISO}${driver ? `&driver_id=${driver.user_id}` : ''}`
      );
      
      setAvailabilityCheck({
        available: !response.data.has_conflict,
        conflicts: response.data.conflicting_schedules || [],
        staffUnavailable: response.data.staff_unavailable || []
      });
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error(language === 'sr' ? 'Greška pri proveri dostupnosti' : 'Error checking availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Confirm assignment with time slot (creates schedule)
  const confirmTimeSlotAssignment = async (force = false) => {
    if (!pendingAssignment) return;
    
    const { vehicle, booking, driver } = pendingAssignment;
    
    setAssigning(true);
    try {
      // First, assign driver to booking (existing flow)
      const assignResponse = await axios.post(
        `${API}/admin/assign-driver-public?booking_id=${booking.id}&driver_id=${driver.user_id}&force=true`
      );
      
      // Then, create schedule entry (supports multi-day)
      const startISO = `${assignmentTimeSlot.startDate}T${assignmentTimeSlot.startTime}:00Z`;
      const endISO = `${assignmentTimeSlot.endDate}T${assignmentTimeSlot.endTime}:00Z`;
      
      await axios.post(`${API}/fleet/schedules${force ? '?force=true' : ''}`, {
        vehicle_id: vehicle.id,
        booking_id: booking.id,
        booking_type: 'booking',
        driver_id: driver.user_id,
        start_time: startISO,
        end_time: endISO
      });
      
      // Format display message
      const isMultiDay = assignmentTimeSlot.startDate !== assignmentTimeSlot.endDate;
      const displayMsg = isMultiDay
        ? `${assignmentTimeSlot.startDate} ${assignmentTimeSlot.startTime} → ${assignmentTimeSlot.endDate} ${assignmentTimeSlot.endTime}`
        : `${assignmentTimeSlot.startTime} - ${assignmentTimeSlot.endTime}`;
      
      toast.success(
        language === 'sr' 
          ? `✅ ${vehicle.name} zakazan: ${displayMsg}` 
          : `✅ ${vehicle.name} scheduled: ${displayMsg}`,
        { duration: 5000 }
      );
      
      setShowTimeSlotModal(false);
      setPendingAssignment(null);
      fetchData();
    } catch (error) {
      // If there's a conflict, show the conflict data
      if (error.response?.status === 409) {
        const conflicts = error.response.data.detail?.conflicts || [];
        setAvailabilityCheck({
          available: false,
          conflicts: conflicts
        });
        if (!force) {
          toast.error(language === 'sr' ? 'Postoji konflikt u rasporedu' : 'Schedule conflict detected');
        }
      } else {
        const errMsg = typeof error.response?.data?.detail === 'string' 
          ? error.response.data.detail 
          : (language === 'sr' ? 'Greška pri dodeli' : 'Assignment error');
        toast.error(errMsg);
      }
    } finally {
      setAssigning(false);
    }
  };

  // Handle conflict confirmation (proceed with assignment despite conflicts)
  const handleConflictConfirm = async () => {
    if (!conflictData) return;
    
    setAssigning(true);
    try {
      await axios.post(`${API}/admin/assign-driver-public?booking_id=${conflictData.bookingId}&driver_id=${conflictData.driverId}&force=true`);
      toast.success(
        language === 'sr' 
          ? `✅ ${conflictData.vehicleName} dodeljen pacijentu ${conflictData.patientName}` 
          : `✅ ${conflictData.vehicleName} assigned to ${conflictData.patientName}`,
        { duration: 5000 }
      );
      fetchData();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri dodeli' : 'Assignment error');
    } finally {
      setAssigning(false);
      setShowConflictWarning(false);
      setConflictData(null);
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

  // Create manual booking
  const handleCreateBooking = async () => {
    if (!newBooking.patient_name || !newBooking.contact_phone || !newBooking.pickup_address || !newBooking.destination_address) {
      toast.error(language === 'sr' ? 'Popunite obavezna polja' : 'Fill required fields');
      return;
    }
    
    // Build pickup and arrival datetimes
    const pickupDate = newBooking.pickup_date || new Date().toISOString().split('T')[0];
    const pickupTime = newBooking.pickup_time || '09:00';
    const pickupDatetime = `${pickupDate}T${pickupTime}:00`;
    
    let estimatedArrival = null;
    if (newBooking.arrival_date) {
      const arrivalTime = newBooking.arrival_time || '18:00';
      estimatedArrival = `${newBooking.arrival_date}T${arrivalTime}:00`;
    }
    
    setCreatingBooking(true);
    try {
      await axios.post(`${API}/bookings`, {
        patient_name: newBooking.patient_name,
        contact_phone: newBooking.contact_phone,
        contact_email: newBooking.contact_email || 'nema@email.com',
        start_point: newBooking.pickup_address,
        end_point: newBooking.destination_address,
        start_lat: newBooking.pickup_lat,
        start_lng: newBooking.pickup_lng,
        end_lat: newBooking.destination_lat,
        end_lng: newBooking.destination_lng,
        booking_date: pickupDate,
        booking_time: pickupTime,
        pickup_datetime: pickupDatetime,
        estimated_arrival: estimatedArrival,
        mobility_status: newBooking.mobility_status,
        notes: newBooking.notes || '',
        booking_type: 'transport',
        language: language
      });
      
      toast.success(language === 'sr' ? 'Rezervacija kreirana!' : 'Booking created!');
      setShowCreateBooking(false);
      setNewBooking({
        patient_name: '',
        contact_phone: '',
        contact_email: '',
        pickup_address: '',
        pickup_lat: null,
        pickup_lng: null,
        destination_address: '',
        destination_lat: null,
        destination_lng: null,
        pickup_date: '',
        pickup_time: '',
        arrival_date: '',
        arrival_time: '',
        mobility_status: 'walking',
        notes: ''
      });
      setPickupSuggestions([]);
      setDestinationSuggestions([]);
      fetchData();
    } catch (error) {
      const errMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : (language === 'sr' ? 'Greška pri kreiranju rezervacije' : 'Error creating booking');
      toast.error(errMsg);
    } finally {
      setCreatingBooking(false);
    }
  };

  // Open edit booking modal
  const openEditBooking = (booking) => {
    setBookingToEdit({
      id: booking.id,
      patient_name: booking.patient_name || '',
      contact_phone: booking.contact_phone || '',
      contact_email: booking.contact_email || '',
      pickup_address: booking.start_point || booking.pickup_address || '',
      pickup_lat: booking.start_lat || booking.pickup_lat,
      pickup_lng: booking.start_lng || booking.pickup_lng,
      destination_address: booking.end_point || booking.destination_address || '',
      destination_lat: booking.end_lat || booking.destination_lat,
      destination_lng: booking.end_lng || booking.destination_lng,
      booking_date: booking.booking_date || booking.preferred_date || '',
      booking_time: booking.booking_time || booking.preferred_time || '',
      mobility_status: booking.mobility_status || 'walking',
      notes: booking.notes || '',
      status: booking.status
    });
    setShowEditBooking(true);
  };

  // Handle edit booking submission
  const handleEditBooking = async () => {
    if (!bookingToEdit.patient_name || !bookingToEdit.contact_phone || !bookingToEdit.pickup_address || !bookingToEdit.destination_address) {
      toast.error(language === 'sr' ? 'Popunite sva obavezna polja' : 'Please fill all required fields');
      return;
    }
    
    setEditingBooking(true);
    try {
      await axios.put(`${API}/api/bookings/${bookingToEdit.id}`, {
        patient_name: bookingToEdit.patient_name,
        contact_phone: bookingToEdit.contact_phone,
        contact_email: bookingToEdit.contact_email || 'nema@email.com',
        start_point: bookingToEdit.pickup_address,
        end_point: bookingToEdit.destination_address,
        start_lat: bookingToEdit.pickup_lat,
        start_lng: bookingToEdit.pickup_lng,
        end_lat: bookingToEdit.destination_lat,
        end_lng: bookingToEdit.destination_lng,
        booking_date: bookingToEdit.booking_date,
        booking_time: bookingToEdit.booking_time,
        mobility_status: bookingToEdit.mobility_status,
        notes: bookingToEdit.notes || '',
        status: bookingToEdit.status
      });
      
      toast.success(language === 'sr' ? 'Rezervacija ažurirana!' : 'Booking updated!');
      setShowEditBooking(false);
      setBookingToEdit(null);
      fetchData();
    } catch (error) {
      const errMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : (language === 'sr' ? 'Greška pri ažuriranju rezervacije' : 'Error updating booking');
      toast.error(errMsg);
    } finally {
      setEditingBooking(false);
    }
  };

  // Handle detach driver from booking
  const handleDetachDriver = async (booking) => {
    if (!window.confirm(language === 'sr' 
      ? `Da li ste sigurni da želite da uklonite vozača "${booking.assigned_driver_name}" sa ove rezervacije?` 
      : `Are you sure you want to remove driver "${booking.assigned_driver_name}" from this booking?`
    )) {
      return;
    }
    
    try {
      await axios.put(`${API}/bookings/${booking.id}`, {
        assigned_driver: null,
        assigned_driver_name: null,
        status: 'pending'
      });
      
      toast.success(language === 'sr' ? 'Vozač uklonjen sa rezervacije' : 'Driver removed from booking');
      fetchData();
    } catch (error) {
      const errMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : (language === 'sr' ? 'Greška pri uklanjanju vozača' : 'Error removing driver');
      toast.error(errMsg);
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
  const activeCount = bookings.filter(b => ['confirmed', 'in_progress', 'en_route', 'on_site', 'transporting'].includes(b.status)).length;
  const readyVehicles = vehicles.filter(v => !v.current_mission && v.team?.some(m => m.role === 'driver')).length;

  // Address search using Nominatim (OpenStreetMap) - Europe-wide
  const searchAddress = async (query, type) => {
    if (!query || query.length < 3) {
      if (type === 'pickup') setPickupSuggestions([]);
      else setDestinationSuggestions([]);
      return;
    }
    
    if (type === 'pickup') setSearchingPickup(true);
    else setSearchingDestination(true);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en,sr-Latn,de,fr,it,es' } }
      );
      const data = await response.json();
      
      const suggestions = data.map(item => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));
      
      if (type === 'pickup') setPickupSuggestions(suggestions);
      else setDestinationSuggestions(suggestions);
    } catch (error) {
      console.error('Address search error:', error);
    } finally {
      if (type === 'pickup') setSearchingPickup(false);
      else setSearchingDestination(false);
    }
  };

  // Debounced address search handlers
  const handlePickupSearch = (value) => {
    setNewBooking({...newBooking, pickup_address: value, pickup_lat: null, pickup_lng: null});
    
    if (pickupSearchTimeout.current) clearTimeout(pickupSearchTimeout.current);
    pickupSearchTimeout.current = setTimeout(() => {
      searchAddress(value, 'pickup');
    }, 300);
  };

  const handleDestinationSearch = (value) => {
    setNewBooking({...newBooking, destination_address: value, destination_lat: null, destination_lng: null});
    
    if (destinationSearchTimeout.current) clearTimeout(destinationSearchTimeout.current);
    destinationSearchTimeout.current = setTimeout(() => {
      searchAddress(value, 'destination');
    }, 300);
  };

  // Select address from suggestions
  const selectPickupAddress = (suggestion) => {
    const updatedBooking = {
      ...newBooking,
      pickup_address: suggestion.display_name,
      pickup_lat: suggestion.lat,
      pickup_lng: suggestion.lng
    };
    setNewBooking(updatedBooking);
    setPickupSuggestions([]);
    
    // Auto-calculate ETA if destination coordinates are already available
    if (newBooking.destination_lat && newBooking.destination_lng) {
      calculateETA(
        suggestion.lat, 
        suggestion.lng, 
        newBooking.destination_lat, 
        newBooking.destination_lng,
        newBooking.pickup_date,
        newBooking.pickup_time
      );
    }
  };

  // Calculate ETA when both addresses are selected
  const calculateETA = async (pickupLat, pickupLng, destLat, destLng, pickupDate, pickupTime) => {
    if (!pickupLat || !pickupLng || !destLat || !destLng) return;
    
    try {
      const startTime = pickupDate && pickupTime 
        ? `${pickupDate}T${pickupTime}:00` 
        : new Date().toISOString();
      
      const response = await axios.post(`${API}/route/calculate?start_time=${encodeURIComponent(startTime)}`, {
        start_lat: parseFloat(pickupLat),
        start_lng: parseFloat(pickupLng),
        end_lat: parseFloat(destLat),
        end_lng: parseFloat(destLng)
      });
      
      if (response.data.estimated_arrival) {
        const eta = new Date(response.data.estimated_arrival);
        setNewBooking(prev => ({
          ...prev,
          arrival_date: eta.toISOString().split('T')[0],
          arrival_time: eta.toTimeString().slice(0, 5),
          route_distance_km: response.data.distance_km,
          route_duration: response.data.duration_formatted
        }));
        
        toast.info(
          language === 'sr' 
            ? `📍 Ruta: ${response.data.distance_km}km, ${response.data.duration_formatted}` 
            : `📍 Route: ${response.data.distance_km}km, ${response.data.duration_formatted}`,
          { duration: 4000 }
        );
      }
    } catch (error) {
      console.error('Error calculating ETA:', error);
    }
  };

  const selectDestinationAddress = (suggestion) => {
    const updatedBooking = {
      ...newBooking,
      destination_address: suggestion.display_name,
      destination_lat: suggestion.lat,
      destination_lng: suggestion.lng
    };
    setNewBooking(updatedBooking);
    setDestinationSuggestions([]);
    
    // Auto-calculate ETA if pickup coordinates are available
    if (newBooking.pickup_lat && newBooking.pickup_lng) {
      calculateETA(
        newBooking.pickup_lat, 
        newBooking.pickup_lng, 
        suggestion.lat, 
        suggestion.lng,
        newBooking.pickup_date,
        newBooking.pickup_time
      );
    }
  };

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
          </div>
        </div>

        {/* Split View */}
        <div className="flex gap-6 h-[calc(100vh-280px)]">
          {/* LEFT: Vehicles */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-slate-100 rounded-t-xl px-4 py-3 border-b border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Ambulance className="w-4 h-4" />
                  {language === 'sr' ? 'Flota vozila' : 'Vehicle Fleet'}
                  <Badge variant="secondary" className="ml-2">{vehicles.length}</Badge>
                </h3>
                <Button
                  onClick={() => setShowAddVehicle(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-xs"
                  size="sm"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {language === 'sr' ? 'Novo vozilo' : 'Add Vehicle'}
                </Button>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={language === 'sr' ? 'Pretraži (naziv, registracija, vozač...)' : 'Search (name, plate, driver...)'}
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="pl-9 h-8 text-sm"
                    data-testid="vehicle-search-input"
                  />
                  {vehicleSearch && (
                    <button
                      onClick={() => setVehicleSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-1">
                  {[
                    { key: 'all', label: language === 'sr' ? 'Sva' : 'All' },
                    { key: 'ready', label: language === 'sr' ? 'Spremna' : 'Ready', count: readyVehicles },
                    { key: 'busy', label: language === 'sr' ? 'Zauzeta' : 'Busy', count: vehicles.filter(v => v.current_mission).length },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setVehicleFilter(tab.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        vehicleFilter === tab.key 
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
              {filteredVehicles.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Ambulance className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{language === 'sr' ? (vehicleSearch ? 'Nema rezultata pretrage' : 'Nema vozila') : (vehicleSearch ? 'No search results' : 'No vehicles')}</p>
                  {vehicleSearch && (
                    <button
                      onClick={() => setVehicleSearch('')}
                      className="mt-2 text-sm text-sky-600 hover:underline"
                    >
                      {language === 'sr' ? 'Očisti pretragu' : 'Clear search'}
                    </button>
                  )}
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
                    schedules={vehicleSchedules[vehicle.id] || []}
                  />
                ))
              )}
            </div>
          </div>

          {/* RIGHT: Bookings */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-slate-100 rounded-t-xl px-4 py-3 border-b border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {language === 'sr' ? 'Rezervacije' : 'Bookings'}
                </h3>
                <Button
                  size="sm"
                  onClick={() => setShowCreateBooking(true)}
                  className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                  data-testid="create-booking-btn"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {language === 'sr' ? 'Nova Rezervacija' : 'New Booking'}
                </Button>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={language === 'sr' ? 'Pretraži (ime, adresa, telefon...)' : 'Search (name, address, phone...)'}
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="pl-9 h-8 text-sm"
                    data-testid="booking-search-input"
                  />
                  {bookingSearch && (
                    <button
                      onClick={() => setBookingSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
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
                  <p>{language === 'sr' ? (bookingSearch ? 'Nema rezultata pretrage' : 'Nema rezervacija') : (bookingSearch ? 'No search results' : 'No bookings')}</p>
                  {bookingSearch && (
                    <button
                      onClick={() => setBookingSearch('')}
                      className="mt-2 text-sm text-sky-600 hover:underline"
                    >
                      {language === 'sr' ? 'Očisti pretragu' : 'Clear search'}
                    </button>
                  )}
                </div>
              ) : (
                filteredBookings.map(booking => (
                  <DroppableBookingCard
                    key={booking.id}
                    booking={booking}
                    language={language}
                    onEdit={openEditBooking}
                    onDetach={handleDetachDriver}
                    onSendSMS={openSMSDialog}
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

        {/* Create Manual Booking Dialog */}
        <Dialog open={showCreateBooking} onOpenChange={setShowCreateBooking}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{language === 'sr' ? 'Nova Rezervacija' : 'New Booking'}</DialogTitle>
              <DialogDescription>
                {language === 'sr' 
                  ? 'Ručno kreirajte novu rezervaciju transporta'
                  : 'Manually create a new transport booking'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Patient Name */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Ime pacijenta' : 'Patient Name'} *
                </label>
                <Input
                  value={newBooking.patient_name}
                  onChange={(e) => setNewBooking({...newBooking, patient_name: e.target.value})}
                  placeholder={language === 'sr' ? 'Ime i prezime' : 'Full name'}
                  data-testid="booking-patient-name"
                />
              </div>
              
              {/* Contact Phone */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Telefon' : 'Phone'} *
                </label>
                <Input
                  value={newBooking.contact_phone}
                  onChange={(e) => setNewBooking({...newBooking, contact_phone: e.target.value})}
                  placeholder="+381..."
                  data-testid="booking-phone"
                />
              </div>
              
              {/* Contact Email */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Email (opciono)' : 'Email (optional)'}
                </label>
                <Input
                  type="email"
                  value={newBooking.contact_email}
                  onChange={(e) => setNewBooking({...newBooking, contact_email: e.target.value})}
                  placeholder="email@example.com"
                  data-testid="booking-email"
                />
              </div>
              
              {/* Pickup Address with Autocomplete */}
              <div className="relative">
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Adresa polaska' : 'Pickup Address'} *
                </label>
                <div className="relative">
                  <Input
                    value={newBooking.pickup_address}
                    onChange={(e) => handlePickupSearch(e.target.value)}
                    placeholder={language === 'sr' ? 'Počnite kucati adresu...' : 'Start typing address...'}
                    data-testid="booking-pickup"
                    className="pr-8"
                  />
                  {searchingPickup && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                  )}
                  {newBooking.pickup_lat && (
                    <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                </div>
                {pickupSuggestions.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ zIndex: 9999 }}>
                    {pickupSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectPickupAddress(suggestion)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-start gap-2 border-b border-slate-100 last:border-0"
                      >
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{suggestion.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Destination Address with Autocomplete */}
              <div className="relative">
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Adresa odredišta' : 'Destination Address'} *
                </label>
                <div className="relative">
                  <Input
                    value={newBooking.destination_address}
                    onChange={(e) => handleDestinationSearch(e.target.value)}
                    placeholder={language === 'sr' ? 'Počnite kucati adresu...' : 'Start typing address...'}
                    data-testid="booking-destination"
                    className="pr-8"
                  />
                  {searchingDestination && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                  )}
                  {newBooking.destination_lat && (
                    <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                </div>
                {destinationSuggestions.length > 0 && (
                  <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ zIndex: 9999 }}>
                    {destinationSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectDestinationAddress(suggestion)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-start gap-2 border-b border-slate-100 last:border-0"
                      >
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{suggestion.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Route Info - Show when calculated */}
              {newBooking.route_distance_km && (
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Navigation className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-sm font-semibold text-indigo-700">
                        {language === 'sr' ? 'Izračunata ruta' : 'Calculated Route'}
                      </p>
                      <p className="text-xs text-indigo-600">
                        {newBooking.route_distance_km} km • {newBooking.route_duration}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => calculateETA(
                      newBooking.pickup_lat,
                      newBooking.pickup_lng,
                      newBooking.destination_lat,
                      newBooking.destination_lng,
                      newBooking.pickup_date,
                      newBooking.pickup_time
                    )}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {/* Pickup Date and Time */}
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <label className="text-sm font-semibold text-emerald-700 mb-2 block">
                  {language === 'sr' ? '🚑 Polazak (Pickup)' : '🚑 Pickup Start'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      {language === 'sr' ? 'Datum' : 'Date'}
                    </label>
                    <Input
                      type="date"
                      value={newBooking.pickup_date}
                      onChange={(e) => setNewBooking({...newBooking, pickup_date: e.target.value})}
                      data-testid="booking-pickup-date"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      {language === 'sr' ? 'Vreme' : 'Time'}
                    </label>
                    <Input
                      type="time"
                      value={newBooking.pickup_time}
                      onChange={(e) => setNewBooking({...newBooking, pickup_time: e.target.value})}
                      data-testid="booking-pickup-time"
                      step="60"
                      className="[&::-webkit-calendar-picker-indicator]:hidden"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Estimated Arrival Date and Time */}
              <div className="bg-sky-50 p-3 rounded-lg border border-sky-200">
                <label className="text-sm font-semibold text-sky-700 mb-2 block">
                  {language === 'sr' ? '🏁 Procenjeni dolazak (ETA)' : '🏁 Estimated Arrival (ETA)'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      {language === 'sr' ? 'Datum' : 'Date'}
                    </label>
                    <Input
                      type="date"
                      value={newBooking.arrival_date}
                      onChange={(e) => setNewBooking({...newBooking, arrival_date: e.target.value})}
                      data-testid="booking-arrival-date"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      {language === 'sr' ? 'Vreme' : 'Time'}
                    </label>
                    <Input
                      type="time"
                      value={newBooking.arrival_time}
                      onChange={(e) => setNewBooking({...newBooking, arrival_time: e.target.value})}
                      data-testid="booking-arrival-time"
                      step="60"
                      className="[&::-webkit-calendar-picker-indicator]:hidden"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    />
                  </div>
                </div>
                {newBooking.pickup_date && newBooking.arrival_date && (
                  <p className="text-xs text-sky-600 mt-2">
                    {(() => {
                      const pickup = new Date(`${newBooking.pickup_date}T${newBooking.pickup_time || '00:00'}`);
                      const arrival = new Date(`${newBooking.arrival_date}T${newBooking.arrival_time || '00:00'}`);
                      const diffMs = arrival - pickup;
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffDays = Math.floor(diffHours / 24);
                      const remainingHours = diffHours % 24;
                      if (diffDays > 0) {
                        return language === 'sr' 
                          ? `⏱️ Trajanje: ${diffDays} dana i ${remainingHours}h`
                          : `⏱️ Duration: ${diffDays} days and ${remainingHours}h`;
                      }
                      return language === 'sr' 
                        ? `⏱️ Trajanje: ${diffHours}h`
                        : `⏱️ Duration: ${diffHours}h`;
                    })()}
                  </p>
                )}
              </div>
              
              {/* Mobility Status */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Pokretljivost pacijenta' : 'Patient Mobility'}
                </label>
                <Select
                  value={newBooking.mobility_status}
                  onValueChange={(value) => setNewBooking({...newBooking, mobility_status: value})}
                >
                  <SelectTrigger data-testid="booking-mobility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walking">{language === 'sr' ? 'Pokretan - hoda' : 'Walking'}</SelectItem>
                    <SelectItem value="wheelchair">{language === 'sr' ? 'Invalidska kolica' : 'Wheelchair'}</SelectItem>
                    <SelectItem value="stretcher">{language === 'sr' ? 'Nosilica' : 'Stretcher'}</SelectItem>
                    <SelectItem value="bedridden">{language === 'sr' ? 'Nepokretan' : 'Bedridden'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Napomene' : 'Notes'}
                </label>
                <Textarea
                  value={newBooking.notes}
                  onChange={(e) => setNewBooking({...newBooking, notes: e.target.value})}
                  placeholder={language === 'sr' ? 'Dodatne informacije...' : 'Additional information...'}
                  rows={3}
                  data-testid="booking-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateBooking(false)}>
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleCreateBooking} 
                disabled={creatingBooking || !newBooking.patient_name || !newBooking.contact_phone || !newBooking.pickup_address || !newBooking.destination_address}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="save-booking-btn"
              >
                {creatingBooking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                {language === 'sr' ? 'Sačuvaj' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Booking Dialog */}
        <Dialog open={showEditBooking} onOpenChange={setShowEditBooking}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                {language === 'sr' ? 'Uredi rezervaciju' : 'Edit Booking'}
              </DialogTitle>
            </DialogHeader>
            {bookingToEdit && (
              <div className="grid gap-4 py-4">
                {/* Patient Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      {language === 'sr' ? 'Ime pacijenta' : 'Patient Name'} *
                    </label>
                    <Input
                      value={bookingToEdit.patient_name}
                      onChange={(e) => setBookingToEdit({...bookingToEdit, patient_name: e.target.value})}
                      placeholder={language === 'sr' ? 'Unesite ime' : 'Enter name'}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      {language === 'sr' ? 'Telefon' : 'Phone'} *
                    </label>
                    <Input
                      value={bookingToEdit.contact_phone}
                      onChange={(e) => setBookingToEdit({...bookingToEdit, contact_phone: e.target.value})}
                      placeholder="+381..."
                    />
                  </div>
                </div>
                
                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Email' : 'Email'}
                  </label>
                  <Input
                    type="email"
                    value={bookingToEdit.contact_email}
                    onChange={(e) => setBookingToEdit({...bookingToEdit, contact_email: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>
                
                {/* Pickup Address */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Adresa preuzimanja' : 'Pickup Address'} *
                  </label>
                  <Input
                    value={bookingToEdit.pickup_address}
                    onChange={(e) => setBookingToEdit({...bookingToEdit, pickup_address: e.target.value})}
                    placeholder={language === 'sr' ? 'Unesite adresu' : 'Enter address'}
                  />
                </div>
                
                {/* Destination Address */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Adresa destinacije' : 'Destination Address'} *
                  </label>
                  <Input
                    value={bookingToEdit.destination_address}
                    onChange={(e) => setBookingToEdit({...bookingToEdit, destination_address: e.target.value})}
                    placeholder={language === 'sr' ? 'Unesite adresu' : 'Enter address'}
                  />
                </div>
                
                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      {language === 'sr' ? 'Datum' : 'Date'}
                    </label>
                    <Input
                      type="date"
                      value={bookingToEdit.booking_date}
                      onChange={(e) => setBookingToEdit({...bookingToEdit, booking_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      {language === 'sr' ? 'Vreme' : 'Time'}
                    </label>
                    <Input
                      type="time"
                      value={bookingToEdit.booking_time}
                      onChange={(e) => setBookingToEdit({...bookingToEdit, booking_time: e.target.value})}
                    />
                  </div>
                </div>
                
                {/* Mobility Status */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Status pokretljivosti' : 'Mobility Status'}
                  </label>
                  <Select 
                    value={bookingToEdit.mobility_status} 
                    onValueChange={(v) => setBookingToEdit({...bookingToEdit, mobility_status: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walking">{language === 'sr' ? 'Pokretan - hoda' : 'Walking'}</SelectItem>
                      <SelectItem value="wheelchair">{language === 'sr' ? 'Invalidska kolica' : 'Wheelchair'}</SelectItem>
                      <SelectItem value="stretcher">{language === 'sr' ? 'Nosilica' : 'Stretcher'}</SelectItem>
                      <SelectItem value="bedridden">{language === 'sr' ? 'Nepokretan' : 'Bedridden'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Notes */}
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Napomene' : 'Notes'}
                  </label>
                  <Textarea
                    value={bookingToEdit.notes}
                    onChange={(e) => setBookingToEdit({...bookingToEdit, notes: e.target.value})}
                    placeholder={language === 'sr' ? 'Dodatne informacije...' : 'Additional information...'}
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowEditBooking(false); setBookingToEdit(null); }}>
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleEditBooking} 
                disabled={editingBooking || !bookingToEdit?.patient_name || !bookingToEdit?.contact_phone || !bookingToEdit?.pickup_address || !bookingToEdit?.destination_address}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {editingBooking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                {language === 'sr' ? 'Sačuvaj izmene' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Time Slot Assignment Modal */}
        <Dialog open={showTimeSlotModal} onOpenChange={(open) => {
          if (!open) {
            setShowTimeSlotModal(false);
            setPendingAssignment(null);
            setAvailabilityCheck(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-sky-600" />
                </div>
                {language === 'sr' ? 'Zakazivanje transporta' : 'Schedule Transport'}
              </DialogTitle>
            </DialogHeader>
            
            {pendingAssignment && (
              <div className="py-4 space-y-4">
                {/* Assignment Summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-sky-600" />
                    <div>
                      <p className="font-semibold text-slate-800">{pendingAssignment.vehicle.name}</p>
                      <p className="text-xs text-slate-500">{pendingAssignment.driver?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-slate-800">{pendingAssignment.booking.patient_name}</p>
                      <p className="text-xs text-slate-500">{pendingAssignment.bookingDate}</p>
                    </div>
                  </div>
                </div>

                {/* Time Selection - Supports Multi-Day Transports */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Period transporta' : 'Transport Period'}
                  </label>
                  
                  {/* Start Date/Time */}
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    <label className="text-xs font-semibold text-emerald-700 mb-2 block">
                      {language === 'sr' ? '🚑 Polazak' : '🚑 Departure'}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={assignmentTimeSlot.startDate}
                        onChange={(e) => {
                          setAssignmentTimeSlot(prev => ({ ...prev, startDate: e.target.value }));
                          setAvailabilityCheck(null);
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="time"
                        value={assignmentTimeSlot.startTime}
                        onChange={(e) => {
                          setAssignmentTimeSlot(prev => ({ ...prev, startTime: e.target.value }));
                          setAvailabilityCheck(null);
                        }}
                        className="w-28"
                        step="60"
                      />
                    </div>
                  </div>
                  
                  {/* End Date/Time */}
                  <div className="bg-sky-50 p-3 rounded-lg border border-sky-200">
                    <label className="text-xs font-semibold text-sky-700 mb-2 block">
                      {language === 'sr' ? '🏁 Procenjeni dolazak (ETA)' : '🏁 Estimated Arrival (ETA)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={assignmentTimeSlot.endDate}
                        onChange={(e) => {
                          setAssignmentTimeSlot(prev => ({ ...prev, endDate: e.target.value }));
                          setAvailabilityCheck(null);
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="time"
                        value={assignmentTimeSlot.endTime}
                        onChange={(e) => {
                          setAssignmentTimeSlot(prev => ({ ...prev, endTime: e.target.value }));
                          setAvailabilityCheck(null);
                        }}
                        className="w-28"
                        step="60"
                      />
                    </div>
                  </div>
                  
                  {/* Duration Display */}
                  {assignmentTimeSlot.startDate && assignmentTimeSlot.endDate && assignmentTimeSlot.startTime && assignmentTimeSlot.endTime && (
                    <div className="text-center py-2">
                      {(() => {
                        const start = new Date(`${assignmentTimeSlot.startDate}T${assignmentTimeSlot.startTime}`);
                        const end = new Date(`${assignmentTimeSlot.endDate}T${assignmentTimeSlot.endTime}`);
                        const diffMs = end - start;
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffDays = Math.floor(diffHours / 24);
                        const remainingHours = diffHours % 24;
                        
                        if (diffHours < 0) {
                          return <span className="text-red-500 text-sm">⚠️ {language === 'sr' ? 'Kraj mora biti posle početka' : 'End must be after start'}</span>;
                        }
                        
                        if (diffDays > 0) {
                          return (
                            <span className="text-slate-600 text-sm">
                              ⏱️ {language === 'sr' ? 'Trajanje:' : 'Duration:'} <strong>{diffDays}</strong> {language === 'sr' ? 'dana' : 'days'} {remainingHours > 0 && `i ${remainingHours}h`}
                            </span>
                          );
                        }
                        return (
                          <span className="text-slate-600 text-sm">
                            ⏱️ {language === 'sr' ? 'Trajanje:' : 'Duration:'} <strong>{diffHours}</strong>h
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkTimeSlotAvailability}
                    disabled={checkingAvailability || !assignmentTimeSlot.startTime || !assignmentTimeSlot.endTime || !assignmentTimeSlot.startDate || !assignmentTimeSlot.endDate}
                    className="w-full"
                  >
                    {checkingAvailability ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {language === 'sr' ? 'Proveravam...' : 'Checking...'}</>
                    ) : (
                      <><RefreshCw className="w-4 h-4 mr-2" /> {language === 'sr' ? 'Proveri dostupnost' : 'Check Availability'}</>
                    )}
                  </Button>
                </div>

                {/* Availability Status */}
                {availabilityCheck && (
                  <div className={`rounded-xl p-4 ${
                    availabilityCheck.available 
                      ? 'bg-emerald-50 border border-emerald-200' 
                      : 'bg-amber-50 border border-amber-200'
                  }`}>
                    {availabilityCheck.available ? (
                      <div className="flex items-center gap-3 text-emerald-700">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">
                          {language === 'sr' ? 'Termin je slobodan!' : 'Time slot is available!'}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-3 text-amber-700 mb-3">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="font-medium">
                            {language === 'sr' ? 'Pronađeni konflikti' : 'Conflicts found'}
                          </span>
                        </div>
                        
                        {/* Staff Unavailability - Show first as it's more important */}
                        {availabilityCheck.staffUnavailable?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {language === 'sr' ? 'Osoblje nije dostupno:' : 'Staff unavailable:'}
                            </p>
                            <div className="space-y-2">
                              {availabilityCheck.staffUnavailable.map((staff, idx) => (
                                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm">
                                  <p className="font-medium text-red-800">{staff.user_name}</p>
                                  <p className="text-xs text-red-600">
                                    {staff.start_time} - {staff.end_time} • 
                                    <span className="ml-1 capitalize">
                                      {staff.status === 'on_leave' ? (language === 'sr' ? 'Na odmoru' : 'On leave') :
                                       staff.status === 'sick' ? (language === 'sr' ? 'Bolovanje' : 'Sick') :
                                       (language === 'sr' ? 'Nedostupan' : 'Unavailable')}
                                    </span>
                                  </p>
                                  {staff.notes && (
                                    <p className="text-xs text-red-500 mt-1 italic">{staff.notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Schedule Conflicts */}
                        {availabilityCheck.conflicts?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {language === 'sr' ? 'Postojeće rezervacije:' : 'Existing bookings:'}
                            </p>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {availabilityCheck.conflicts.map((conflict, idx) => (
                                <div key={idx} className="bg-white rounded-lg p-2 text-sm">
                                  <p className="font-medium text-slate-800">{conflict.patient_name || 'Booking'}</p>
                                  <p className="text-xs text-slate-500">
                                    {conflict.start_time?.slice(11, 16)} - {conflict.end_time?.slice(11, 16)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Mini Timeline Preview */}
                <div className="bg-slate-100 rounded-xl p-3">
                  <p className="text-xs font-medium text-slate-600 mb-2">
                    {language === 'sr' ? 'Raspored za danas' : 'Today\'s Schedule'}
                  </p>
                  <VehicleTimeline 
                    schedules={vehicleSchedules[pendingAssignment.vehicle.id] || []} 
                    language={language} 
                  />
                </div>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTimeSlotModal(false);
                  setPendingAssignment(null);
                }}
              >
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button 
                onClick={() => confirmTimeSlotAssignment(availabilityCheck && !availabilityCheck.available)}
                disabled={assigning || !assignmentTimeSlot.startTime || !assignmentTimeSlot.endTime}
                className={availabilityCheck && !availabilityCheck.available 
                  ? 'bg-amber-600 hover:bg-amber-700' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
                }
              >
                {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {availabilityCheck && !availabilityCheck.available 
                  ? (language === 'sr' ? 'Zakaži svejedno' : 'Schedule Anyway')
                  : (language === 'sr' ? 'Potvrdi' : 'Confirm')
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Conflict Warning Modal */}
        <Dialog open={showConflictWarning} onOpenChange={setShowConflictWarning}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-amber-600">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                {language === 'sr' ? 'Upozorenje o sukobu rasporeda' : 'Schedule Conflict Warning'}
              </DialogTitle>
            </DialogHeader>
            
            {conflictData && (
              <div className="py-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-slate-700 mb-2">
                    {language === 'sr' 
                      ? <>Vozač <span className="font-bold text-amber-700">{conflictData.driverName}</span> već ima {conflictData.conflicts.length} rezervacija na isti datum:</>
                      : <>Driver <span className="font-bold text-amber-700">{conflictData.driverName}</span> already has {conflictData.conflicts.length} booking(s) on the same date:</>
                    }
                  </p>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {conflictData.conflicts.map((conflict, idx) => (
                    <div 
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{conflict.patient_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {conflict.booking_time || 'N/A'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            conflict.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                            conflict.status === 'en_route' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {conflict.status}
                          </span>
                        </div>
                        {conflict.pickup && (
                          <p className="text-xs text-slate-400 mt-1 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {conflict.pickup}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                  <p className="text-sm text-slate-600">
                    {language === 'sr' 
                      ? 'Da li želite da nastavite sa dodelom? Vozač će imati više rezervacija istog dana.'
                      : 'Do you want to proceed with the assignment? The driver will have multiple bookings on the same day.'
                    }
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => { setShowConflictWarning(false); setConflictData(null); }}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleConflictConfirm}
                disabled={assigning}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {language === 'sr' ? 'Nastavi svakako' : 'Proceed Anyway'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SMS Send Dialog */}
        <Dialog open={showSMSDialog} onOpenChange={setShowSMSDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                {language === 'sr' ? 'Pošalji SMS' : 'Send SMS'}
              </DialogTitle>
            </DialogHeader>
            {smsBooking && (
              <div className="space-y-4 pt-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium">{smsBooking.patient_name}</p>
                  <p className="text-sm text-slate-600">{smsBooking.contact_phone}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {language === 'sr' ? 'Tip poruke' : 'Message Type'}
                  </label>
                  <select
                    value={smsType}
                    onChange={(e) => setSmsType(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="reminder">
                      {language === 'sr' ? 'Podsetnik za preuzimanje' : 'Pickup Reminder'}
                    </option>
                    <option value="driver_arriving">
                      {language === 'sr' ? 'Vozač stiže' : 'Driver Arriving'}
                    </option>
                    <option value="custom">
                      {language === 'sr' ? 'Prilagođena poruka' : 'Custom Message'}
                    </option>
                  </select>
                </div>
                
                {smsType === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'sr' ? 'Poruka' : 'Message'}
                    </label>
                    <textarea
                      value={smsCustomMessage}
                      onChange={(e) => setSmsCustomMessage(e.target.value)}
                      placeholder={language === 'sr' ? 'Unesite poruku...' : 'Enter message...'}
                      rows={3}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowSMSDialog(false)}>
                    {language === 'sr' ? 'Otkaži' : 'Cancel'}
                  </Button>
                  <Button 
                    onClick={handleSendSMS} 
                    disabled={sendingSMS || (smsType === 'custom' && !smsCustomMessage)}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {sendingSMS ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {language === 'sr' ? 'Pošalji' : 'Send'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
};

export default FleetDispatch;
