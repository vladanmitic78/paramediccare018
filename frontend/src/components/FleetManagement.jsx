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
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Ambulance,
  Plus,
  Users,
  UserPlus,
  UserMinus,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  History,
  Phone,
  Stethoscope,
  Activity,
  RefreshCw,
  Shield,
  Video,
  Wrench,
  Search,
  Trash2,
  Save,
  X,
  VideoIcon,
  ExternalLink
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

const FleetManagement = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAssignTeam, setShowAssignTeam] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Team assignment with confirmation
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [showConfirmAssignment, setShowConfirmAssignment] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  
  // Video call state
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeCallRoom, setActiveCallRoom] = useState(null);
  
  // Check if user is super admin or admin (both can delete)
  const canDeleteVehicle = () => user?.role === 'superadmin' || user?.role === 'admin';
  
  // New vehicle form
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
  
  // Equipment options
  const equipmentOptions = [
    'LIFEPAK', 'Oxygen', 'Stretcher', 'AED', 'Suction', 'IV Pump', 
    'Ventilator', 'Wheelchair', 'Spine Board', 'Medication Kit'
  ];

  const fetchVehicles = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await axios.get(`${API}/fleet/vehicles`);
      setVehicles(response.data);
      if (isRefresh) toast.success(language === 'sr' ? 'Osveženo!' : 'Refreshed!');
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju vozila' : 'Error loading vehicles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  const fetchAvailableStaff = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/fleet/available-staff`);
      setAvailableStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  }, []);

  const handleRefresh = () => {
    fetchVehicles(true);
    fetchAvailableStaff();
  };

  useEffect(() => {
    fetchVehicles();
    fetchAvailableStaff();
  }, [fetchVehicles, fetchAvailableStaff]);

  const handleCreateVehicle = async () => {
    if (!newVehicle.name || !newVehicle.registration_plate) {
      toast.error(language === 'sr' ? 'Popunite obavezna polja' : 'Fill required fields');
      return;
    }
    
    try {
      await axios.post(`${API}/fleet/vehicles`, newVehicle);
      toast.success(language === 'sr' ? 'Vozilo dodato' : 'Vehicle added');
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
      fetchVehicles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error creating vehicle');
    }
  };

  // Delete vehicle (Super Admin only)
  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    
    setDeleting(true);
    try {
      await axios.delete(`${API}/fleet/vehicles/${vehicleToDelete.id}`);
      toast.success(language === 'sr' ? 'Vozilo obrisano' : 'Vehicle deleted');
      setShowDeleteConfirm(false);
      setVehicleToDelete(null);
      fetchVehicles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting vehicle');
    } finally {
      setDeleting(false);
    }
  };

  // Toggle team member selection
  const toggleTeamMemberSelection = (staff, role) => {
    const existingIndex = selectedTeamMembers.findIndex(
      m => m.user_id === staff.id && m.role === role
    );
    
    if (existingIndex >= 0) {
      setSelectedTeamMembers(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedTeamMembers(prev => [...prev, {
        user_id: staff.id,
        user_name: staff.full_name,
        role: role,
        is_remote: role === 'remote_doctor',
        is_primary: true
      }]);
    }
  };

  // Check if member is selected
  const isMemberSelected = (staffId, role) => {
    return selectedTeamMembers.some(m => m.user_id === staffId && m.role === role);
  };

  // Save team assignments (batch)
  const handleSaveTeam = async () => {
    if (selectedTeamMembers.length === 0) {
      toast.error(language === 'sr' ? 'Izaberite članove tima' : 'Select team members');
      return;
    }
    
    setSavingTeam(true);
    try {
      for (const member of selectedTeamMembers) {
        if (member.role === 'remote_doctor') {
          await axios.post(`${API}/fleet/vehicles/${selectedVehicle.id}/remote-doctor`, null, {
            params: { doctor_id: member.user_id }
          });
        } else {
          await axios.post(`${API}/fleet/vehicles/${selectedVehicle.id}/team`, {
            user_id: member.user_id,
            role: member.role,
            is_primary: true,
            is_remote: member.is_remote
          });
        }
      }
      
      toast.success(language === 'sr' ? 'Tim sačuvan!' : 'Team saved!');
      setShowConfirmAssignment(false);
      setShowAssignTeam(false);
      setSelectedTeamMembers([]);
      fetchVehicles();
      fetchAvailableStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving team');
    } finally {
      setSavingTeam(false);
    }
  };

  const handleRemoveMember = async (vehicleId, userId) => {
    if (!window.confirm(language === 'sr' ? 'Ukloniti člana tima?' : 'Remove team member?')) return;
    
    try {
      await axios.delete(`${API}/fleet/vehicles/${vehicleId}/team/${userId}`);
      toast.success(language === 'sr' ? 'Član tima uklonjen' : 'Team member removed');
      fetchVehicles();
      fetchAvailableStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error removing member');
    }
  };

  // Start video call for vehicle
  const startVideoCall = (vehicle) => {
    const roomId = generateJitsiRoomId(vehicle.id, vehicle.current_mission?.id);
    setActiveCallRoom(roomId);
    setSelectedVehicle(vehicle);
    setShowVideoCall(true);
  };

  // Join video call
  const joinVideoCall = () => {
    if (activeCallRoom) {
      openJitsiCall(activeCallRoom, user?.full_name || 'User');
    }
  };

  const handleAddRemoteDoctor = async (vehicleId, doctorId) => {
    try {
      await axios.post(`${API}/fleet/vehicles/${vehicleId}/remote-doctor`, null, {
        params: { doctor_id: doctorId }
      });
      toast.success(language === 'sr' ? 'Lekar na daljinu dodat' : 'Remote doctor added');
      fetchVehicles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error adding remote doctor');
    }
  };

  const fetchAuditLog = async (vehicleId) => {
    try {
      const response = await axios.get(`${API}/fleet/vehicles/${vehicleId}/audit`);
      setAuditLog(response.data);
      setShowAuditLog(true);
    } catch (error) {
      toast.error('Error fetching audit log');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      available: { class: 'bg-emerald-100 text-emerald-800', label: language === 'sr' ? 'Dostupno' : 'Available', icon: CheckCircle },
      on_mission: { class: 'bg-sky-100 text-sky-800', label: language === 'sr' ? 'Na misiji' : 'On Mission', icon: Activity },
      maintenance: { class: 'bg-amber-100 text-amber-800', label: language === 'sr' ? 'Održavanje' : 'Maintenance', icon: Wrench },
      out_of_service: { class: 'bg-red-100 text-red-800', label: language === 'sr' ? 'Van funkcije' : 'Out of Service', icon: XCircle }
    };
    const c = config[status] || config.available;
    return (
      <Badge className={`${c.class} flex items-center gap-1`}>
        <c.icon className="w-3 h-3" />
        {c.label}
      </Badge>
    );
  };

  const getRoleBadge = (role, isRemote = false) => {
    const config = {
      driver: { class: 'bg-amber-100 text-amber-800', label: language === 'sr' ? 'Vozač' : 'Driver' },
      nurse: { class: 'bg-pink-100 text-pink-800', label: language === 'sr' ? 'Sestra' : 'Nurse' },
      paramedic: { class: 'bg-purple-100 text-purple-800', label: language === 'sr' ? 'Paramedicar' : 'Paramedic' },
      doctor: { class: 'bg-sky-100 text-sky-800', label: language === 'sr' ? 'Lekar' : 'Doctor' },
      remote_doctor: { class: 'bg-indigo-100 text-indigo-800', label: language === 'sr' ? 'Lekar (daljinski)' : 'Remote Doctor' }
    };
    const c = config[role] || { class: 'bg-slate-100 text-slate-800', label: role };
    return (
      <Badge className={`${c.class} flex items-center gap-1`}>
        {isRemote && <Video className="w-3 h-3" />}
        {c.label}
      </Badge>
    );
  };

  const getActionLabel = (action) => {
    const labels = {
      vehicle_created: language === 'sr' ? 'Vozilo kreirano' : 'Vehicle created',
      member_assigned: language === 'sr' ? 'Član dodeljen' : 'Member assigned',
      member_removed: language === 'sr' ? 'Član uklonjen' : 'Member removed',
      member_replaced: language === 'sr' ? 'Član zamenjen' : 'Member replaced',
      team_locked: language === 'sr' ? 'Tim zaključan' : 'Team locked',
      team_unlocked: language === 'sr' ? 'Tim otključan' : 'Team unlocked',
      emergency_assignment: language === 'sr' ? 'Hitna dodela' : 'Emergency assignment',
      emergency_removal: language === 'sr' ? 'Hitno uklanjanje' : 'Emergency removal',
      remote_doctor_joined: language === 'sr' ? 'Lekar pristupio' : 'Doctor joined',
      remote_doctor_left: language === 'sr' ? 'Lekar napustio' : 'Doctor left'
    };
    return labels[action] || action;
  };

  // Filter staff based on search
  const filteredStaff = availableStaff.filter(s => {
    if (!staffSearch) return true;
    const search = staffSearch.toLowerCase();
    return s.full_name?.toLowerCase().includes(search) || 
           s.email?.toLowerCase().includes(search) ||
           s.role?.toLowerCase().includes(search);
  });

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter(v => {
    if (!vehicleSearch) return true;
    const search = vehicleSearch.toLowerCase();
    return v.name?.toLowerCase().includes(search) || 
           v.registration_plate?.toLowerCase().includes(search) ||
           v.status?.toLowerCase().includes(search) ||
           v.vehicle_type?.toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {language === 'sr' ? 'Upravljanje Flotom' : 'Fleet Management'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {language === 'sr' ? 'Vozila i timovi za medicinski transport' : 'Vehicles and teams for medical transport'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchVehicles}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'sr' ? 'Osveži' : 'Refresh'}
          </Button>
          <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
            <DialogTrigger asChild>
              <Button className="bg-sky-600 hover:bg-sky-700">
                <Plus className="w-4 h-4 mr-2" />
                {language === 'sr' ? 'Dodaj vozilo' : 'Add Vehicle'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{language === 'sr' ? 'Novo vozilo' : 'New Vehicle'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{language === 'sr' ? 'Naziv' : 'Name'} *</label>
                  <Input
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                    placeholder="Ambulance 1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{language === 'sr' ? 'Registracija' : 'Registration'} *</label>
                  <Input
                    value={newVehicle.registration_plate}
                    onChange={(e) => setNewVehicle({...newVehicle, registration_plate: e.target.value})}
                    placeholder="NI-018-PC"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{language === 'sr' ? 'Tip' : 'Type'}</label>
                  <Select value={newVehicle.vehicle_type} onValueChange={(v) => setNewVehicle({...newVehicle, vehicle_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambulance">{language === 'sr' ? 'Ambulantno vozilo' : 'Ambulance'}</SelectItem>
                      <SelectItem value="medical_transport">{language === 'sr' ? 'Medicinski transport' : 'Medical Transport'}</SelectItem>
                      <SelectItem value="emergency">{language === 'sr' ? 'Hitna pomoć' : 'Emergency'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{language === 'sr' ? 'Oprema' : 'Equipment'}</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {equipmentOptions.map(eq => (
                      <Badge
                        key={eq}
                        className={`cursor-pointer ${newVehicle.equipment.includes(eq) ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                        onClick={() => {
                          const current = newVehicle.equipment;
                          setNewVehicle({
                            ...newVehicle,
                            equipment: current.includes(eq) 
                              ? current.filter(e => e !== eq)
                              : [...current, eq]
                          });
                        }}
                      >
                        {eq}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">{language === 'sr' ? 'Napomena' : 'Notes'}</label>
                  <Textarea
                    value={newVehicle.notes}
                    onChange={(e) => setNewVehicle({...newVehicle, notes: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddVehicle(false)}>
                  {language === 'sr' ? 'Otkaži' : 'Cancel'}
                </Button>
                <Button onClick={handleCreateVehicle} className="bg-sky-600 hover:bg-sky-700">
                  {language === 'sr' ? 'Kreiraj' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          value={vehicleSearch}
          onChange={(e) => setVehicleSearch(e.target.value)}
          placeholder={language === 'sr' 
            ? 'Pretraži vozila po imenu, registraciji, statusu...' 
            : 'Search vehicles by name, registration, status...'}
          className="pl-10 h-11"
          data-testid="vehicle-search-input"
        />
        {vehicleSearch && (
          <button
            onClick={() => setVehicleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results count when searching */}
      {vehicleSearch && (
        <p className="text-sm text-slate-500">
          {language === 'sr' 
            ? `Pronađeno ${filteredVehicles.length} od ${vehicles.length} vozila`
            : `Found ${filteredVehicles.length} of ${vehicles.length} vehicles`}
        </p>
      )}

      {/* Vehicle Cards */}
      {filteredVehicles.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Ambulance className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-500">
            {vehicleSearch 
              ? (language === 'sr' ? 'Nema rezultata pretrage' : 'No search results')
              : (language === 'sr' ? 'Nema vozila. Dodajte prvo vozilo.' : 'No vehicles. Add your first vehicle.')}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map(vehicle => (
            <div 
              key={vehicle.id} 
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Vehicle Header */}
              <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      vehicle.status === 'on_mission' ? 'bg-sky-100' : 
                      vehicle.status === 'maintenance' ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                      <Ambulance className={`w-6 h-6 ${
                        vehicle.status === 'on_mission' ? 'text-sky-600' : 
                        vehicle.status === 'maintenance' ? 'text-amber-600' : 'text-emerald-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{vehicle.name}</h3>
                      <p className="text-sm text-slate-500">{vehicle.registration_plate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(vehicle.status)}
                    {/* Delete button (Admin and Super Admin) */}
                    {canDeleteVehicle() && !vehicle.current_mission && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setVehicleToDelete(vehicle); setShowDeleteConfirm(true); }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        title={language === 'sr' ? 'Obriši vozilo' : 'Delete vehicle'}
                        data-testid="delete-vehicle-btn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Team */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {language === 'sr' ? 'Trenutni tim' : 'Current Team'}
                  </h4>
                  {vehicle.current_mission && (
                    <Badge className="bg-sky-100 text-sky-800 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      {language === 'sr' ? 'Zaključano' : 'Locked'}
                    </Badge>
                  )}
                </div>
                
                {vehicle.current_team?.length > 0 ? (
                  <div className="space-y-2">
                    {vehicle.current_team.map((member, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getRoleBadge(member.role, member.is_remote)}
                          <span className="text-sm font-medium">{member.user_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Video call button for remote doctors */}
                          {member.is_remote && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startVideoCall(vehicle)}
                              className="text-indigo-500 hover:text-indigo-700 h-7 w-7 p-0"
                              title={language === 'sr' ? 'Video poziv' : 'Video call'}
                            >
                              <Video className="w-4 h-4" />
                            </Button>
                          )}
                          {!vehicle.current_mission && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(vehicle.id, member.user_id)}
                              className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    {language === 'sr' ? 'Nema dodeljenog tima' : 'No team assigned'}
                  </p>
                )}

                {/* Required Roles Warning */}
                {vehicle.required_roles && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      {vehicle.required_roles.map(role => {
                        const filled = vehicle.current_team?.some(m => m.role === role);
                        return (
                          <Badge 
                            key={role} 
                            className={filled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}
                          >
                            {filled ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                            {role}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 pt-0 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => { setSelectedVehicle(vehicle); setShowAssignTeam(true); }}
                  disabled={vehicle.current_mission}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  {language === 'sr' ? 'Dodeli' : 'Assign'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedVehicle(vehicle); fetchAuditLog(vehicle.id); }}
                >
                  <History className="w-4 h-4" />
                </Button>
              </div>

              {/* Current Mission */}
              {vehicle.current_mission && (
                <div className="px-4 pb-4">
                  <div className="p-3 bg-sky-50 rounded-lg border border-sky-100">
                    <p className="text-sm font-medium text-sky-800 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {language === 'sr' ? 'Aktivna misija' : 'Active Mission'}
                    </p>
                    <p className="text-sm text-sky-600 mt-1">
                      {vehicle.current_mission.patient_name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Team Dialog - With Selection & Save */}
      <Dialog open={showAssignTeam} onOpenChange={(open) => {
        setShowAssignTeam(open);
        if (!open) {
          setSelectedTeamMembers([]);
          setStaffSearch('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {language === 'sr' ? 'Dodeli tim' : 'Assign Team'} - {selectedVehicle?.name}
            </DialogTitle>
            <DialogDescription>
              {language === 'sr' 
                ? 'Izaberite članove tima, zatim kliknite "Sačuvaj tim"' 
                : 'Select team members, then click "Save Team"'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder={language === 'sr' ? 'Pretraži osoblje...' : 'Search staff...'}
                className="pl-9"
              />
            </div>

            {/* Selected Members Preview */}
            {selectedTeamMembers.length > 0 && (
              <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-sm font-medium text-sky-800 mb-2">
                  {language === 'sr' ? 'Izabrani članovi' : 'Selected Members'} ({selectedTeamMembers.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTeamMembers.map((m, idx) => (
                    <Badge key={idx} className="bg-sky-600 text-white flex items-center gap-1">
                      {m.is_remote && <Video className="w-3 h-3" />}
                      {m.user_name} ({m.role})
                      <button 
                        onClick={() => setSelectedTeamMembers(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-1 hover:bg-sky-700 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Staff List with Checkboxes */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredStaff.map(staff => {
                const isAlreadyAssigned = staff.current_assignment?.vehicle_id === selectedVehicle?.id;
                
                return (
                  <div 
                    key={staff.id} 
                    className={`p-3 rounded-lg border ${
                      isAlreadyAssigned ? 'bg-emerald-50 border-emerald-200' : 
                      staff.current_assignment ? 'bg-slate-50 border-slate-200' : 
                      'bg-white border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{staff.full_name}</p>
                          {isAlreadyAssigned && (
                            <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {language === 'sr' ? 'Već u timu' : 'Already assigned'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${
                            staff.role === 'driver' ? 'bg-amber-100 text-amber-800' :
                            staff.role === 'nurse' ? 'bg-pink-100 text-pink-800' :
                            staff.role === 'doctor' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100'
                          }`}>
                            {staff.role}
                          </Badge>
                          {staff.current_assignment && !isAlreadyAssigned && (
                            <span className="text-xs text-amber-600">
                              ⚠️ {staff.current_assignment.vehicle_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {staff.role === 'driver' && !isAlreadyAssigned && (
                          <Button
                            size="sm"
                            variant={isMemberSelected(staff.id, 'driver') ? 'default' : 'outline'}
                            onClick={() => toggleTeamMemberSelection(staff, 'driver')}
                            className={isMemberSelected(staff.id, 'driver') ? 'bg-amber-600 hover:bg-amber-700' : ''}
                          >
                            {isMemberSelected(staff.id, 'driver') ? <CheckCircle className="w-3 h-3 mr-1" /> : null}
                            {language === 'sr' ? 'Vozač' : 'Driver'}
                          </Button>
                        )}
                        {staff.role === 'nurse' && !isAlreadyAssigned && (
                          <Button
                            size="sm"
                            variant={isMemberSelected(staff.id, 'nurse') ? 'default' : 'outline'}
                            onClick={() => toggleTeamMemberSelection(staff, 'nurse')}
                            className={isMemberSelected(staff.id, 'nurse') ? 'bg-pink-600 hover:bg-pink-700' : ''}
                          >
                            {isMemberSelected(staff.id, 'nurse') ? <CheckCircle className="w-3 h-3 mr-1" /> : null}
                            {language === 'sr' ? 'Sestra' : 'Nurse'}
                          </Button>
                        )}
                        {staff.role === 'doctor' && !isAlreadyAssigned && (
                          <>
                            <Button
                              size="sm"
                              variant={isMemberSelected(staff.id, 'doctor') ? 'default' : 'outline'}
                              onClick={() => toggleTeamMemberSelection(staff, 'doctor')}
                              className={isMemberSelected(staff.id, 'doctor') ? 'bg-sky-600 hover:bg-sky-700' : ''}
                            >
                              {isMemberSelected(staff.id, 'doctor') ? <CheckCircle className="w-3 h-3 mr-1" /> : <Stethoscope className="w-3 h-3 mr-1" />}
                              {language === 'sr' ? 'Fizički' : 'On-site'}
                            </Button>
                            <Button
                              size="sm"
                              variant={isMemberSelected(staff.id, 'remote_doctor') ? 'default' : 'outline'}
                              onClick={() => toggleTeamMemberSelection(staff, 'remote_doctor')}
                              className={isMemberSelected(staff.id, 'remote_doctor') ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'}
                            >
                              {isMemberSelected(staff.id, 'remote_doctor') ? <CheckCircle className="w-3 h-3 mr-1" /> : <Video className="w-3 h-3 mr-1" />}
                              {language === 'sr' ? 'Daljinski' : 'Remote'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowAssignTeam(false)}>
              {language === 'sr' ? 'Otkaži' : 'Cancel'}
            </Button>
            <Button 
              onClick={() => setShowConfirmAssignment(true)}
              disabled={selectedTeamMembers.length === 0}
              className="bg-sky-600 hover:bg-sky-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {language === 'sr' ? 'Sačuvaj tim' : 'Save Team'} ({selectedTeamMembers.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmAssignment} onOpenChange={setShowConfirmAssignment}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'sr' ? 'Potvrda dodele tima' : 'Confirm Team Assignment'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {language === 'sr' 
                    ? `Da li ste sigurni da želite da dodelite sledeće članove vozilu "${selectedVehicle?.name}"?`
                    : `Are you sure you want to assign the following members to "${selectedVehicle?.name}"?`}
                </p>
                <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                  {selectedTeamMembers.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {m.is_remote ? <Video className="w-4 h-4 text-indigo-500" /> : <Users className="w-4 h-4 text-slate-500" />}
                      <span className="font-medium">{m.user_name}</span>
                      <Badge className="text-xs">{m.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingTeam}>
              {language === 'sr' ? 'Otkaži' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSaveTeam}
              disabled={savingTeam}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {savingTeam ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {language === 'sr' ? 'Čuvanje...' : 'Saving...'}</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> {language === 'sr' ? 'Potvrdi' : 'Confirm'}</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Vehicle Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              {language === 'sr' ? 'Obriši vozilo' : 'Delete Vehicle'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'sr' 
                ? `Da li ste sigurni da želite da obrišete vozilo "${vehicleToDelete?.name}" (${vehicleToDelete?.registration_plate})? Ova akcija se ne može poništiti.`
                : `Are you sure you want to delete vehicle "${vehicleToDelete?.name}" (${vehicleToDelete?.registration_plate})? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {language === 'sr' ? 'Otkaži' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteVehicle}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {language === 'sr' ? 'Brisanje...' : 'Deleting...'}</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> {language === 'sr' ? 'Obriši' : 'Delete'}</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Video Call Dialog */}
      <Dialog open={showVideoCall} onOpenChange={setShowVideoCall}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-600" />
              {language === 'sr' ? 'Video poziv' : 'Video Call'} - {selectedVehicle?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-800 mb-3">
                {language === 'sr' 
                  ? 'Kliknite dugme ispod da pokrenete video poziv sa timom u vozilu. Poziv se otvara u novom prozoru koristeći Jitsi Meet (besplatno, bez registracije).'
                  : 'Click the button below to start a video call with the team in the vehicle. The call opens in a new window using Jitsi Meet (free, no registration required).'}
              </p>
              <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-100 px-3 py-2 rounded">
                <span className="font-mono">{activeCallRoom}</span>
              </div>
            </div>
            <Button 
              onClick={joinVideoCall}
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
            >
              <Video className="w-5 h-5 mr-2" />
              {language === 'sr' ? 'Pokreni video poziv' : 'Start Video Call'}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-slate-500 text-center">
              {language === 'sr' 
                ? 'Podelite ID sobe sa udaljenim lekarom da bi se pridružio pozivu'
                : 'Share the room ID with the remote doctor to join the call'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {language === 'sr' ? 'Istorija promena' : 'Change History'} - {selectedVehicle?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {auditLog.length === 0 ? (
              <p className="text-center py-8 text-slate-500">
                {language === 'sr' ? 'Nema zapisanih promena' : 'No changes recorded'}
              </p>
            ) : (
              <div className="space-y-3">
                {auditLog.map((entry, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{getActionLabel(entry.action)}</Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {entry.user_name && (
                      <p className="text-sm">
                        <span className="font-medium">{entry.user_name}</span>
                        {entry.role && <span className="text-slate-500"> ({entry.role})</span>}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {language === 'sr' ? 'Izvršio' : 'By'}: {entry.performed_by_name}
                    </p>
                    {entry.reason && (
                      <p className="text-sm text-amber-600 mt-2">
                        {language === 'sr' ? 'Razlog' : 'Reason'}: {entry.reason}
                      </p>
                    )}
                    {entry.handover_notes && (
                      <p className="text-sm text-sky-600 mt-1">
                        {language === 'sr' ? 'Napomena predaje' : 'Handover notes'}: {entry.handover_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetManagement;
