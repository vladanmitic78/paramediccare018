import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar,
  Clock,
  User,
  Trash2,
  Edit,
  Loader2,
  Users,
  Truck,
  Stethoscope,
  HeartPulse,
  UserCog,
  Check,
  X,
  Palmtree,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status configuration
const STATUS_CONFIG = {
  available: { 
    label_sr: 'Dostupan', 
    label_en: 'Available', 
    color: 'bg-green-500', 
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: Check
  },
  unavailable: { 
    label_sr: 'Nedostupan', 
    label_en: 'Unavailable', 
    color: 'bg-red-500', 
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: X
  },
  on_leave: { 
    label_sr: 'Na odmoru', 
    label_en: 'On Leave', 
    color: 'bg-amber-500', 
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    icon: Palmtree
  },
  sick: { 
    label_sr: 'Bolovanje', 
    label_en: 'Sick Leave', 
    color: 'bg-purple-500', 
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    icon: AlertCircle
  }
};

// Role configuration
const ROLE_CONFIG = {
  driver: { 
    label_sr: 'Vozač', 
    label_en: 'Driver', 
    color: 'bg-blue-500',
    icon: Truck
  },
  doctor: { 
    label_sr: 'Doktor', 
    label_en: 'Doctor', 
    color: 'bg-emerald-500',
    icon: Stethoscope
  },
  nurse: { 
    label_sr: 'Med. sestra', 
    label_en: 'Nurse', 
    color: 'bg-pink-500',
    icon: HeartPulse
  },
  admin: { 
    label_sr: 'Admin', 
    label_en: 'Admin', 
    color: 'bg-slate-500',
    icon: UserCog
  },
  superadmin: { 
    label_sr: 'Super Admin', 
    label_en: 'Super Admin', 
    color: 'bg-slate-700',
    icon: UserCog
  }
};

const StaffAvailabilityCalendar = () => {
  const { language } = useLanguage();
  const { user, isAdmin } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  const [availability, setAvailability] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    date: '',
    start_time: '08:00',
    end_time: '16:00',
    status: 'available',
    notes: '',
    repeat_weekly: false
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch availability data
  const fetchAvailability = useCallback(async () => {
    try {
      const startDate = getWeekStart(currentDate);
      const endDate = viewMode === 'week' 
        ? new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)
        : getMonthEnd(currentDate);
      
      const params = new URLSearchParams({
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
      });
      
      if (selectedRole !== 'all') params.append('role', selectedRole);
      if (selectedStaff !== 'all') params.append('user_id', selectedStaff);
      
      const endpoint = isAdmin() 
        ? `${API}/admin/staff-availability?${params}`
        : `${API}/staff/availability?${params}`;
      
      const response = await axios.get(endpoint);
      setAvailability(response.data);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode, selectedRole, selectedStaff, isAdmin, language]);

  // Fetch staff list (admin only)
  const fetchStaffList = useCallback(async () => {
    if (!isAdmin()) return;
    try {
      const response = await axios.get(`${API}/admin/staff-list`);
      setStaffList(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAvailability();
    fetchStaffList();
  }, [fetchAvailability, fetchStaffList]);

  // Date helpers
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getMonthEnd = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const getWeekDays = () => {
    const start = getWeekStart(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = (firstDay.getDay() + 6) % 7; // Monday = 0
    
    const days = [];
    // Add padding for days before month starts
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(firstDay);
      d.setDate(d.getDate() - i - 1);
      days.push({ date: d, isCurrentMonth: false });
    }
    // Add days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    // Add padding to complete the grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(lastDay);
      d.setDate(d.getDate() + i);
      days.push({ date: d, isCurrentMonth: false });
    }
    return days;
  };

  // Navigation
  const navigatePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)));
    } else {
      setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)));
    } else {
      setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get slots for a specific date
  const getSlotsForDate = (date) => {
    const dateStr = formatDate(date);
    return availability.filter(slot => slot.date === dateStr);
  };

  // Handle add/edit slot
  const handleOpenAddDialog = (date = null) => {
    setSelectedDate(date);
    setFormData({
      date: date ? formatDate(date) : formatDate(new Date()),
      start_time: '08:00',
      end_time: '16:00',
      status: 'available',
      notes: '',
      repeat_weekly: false
    });
    setEditingSlot(null);
    setIsAddDialogOpen(true);
  };

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    setFormData({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      status: slot.status,
      notes: slot.notes || '',
      repeat_weekly: false
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editingSlot) {
        // Update existing slot
        await axios.put(`${API}/staff/availability/${editingSlot.id}`, {
          start_time: formData.start_time,
          end_time: formData.end_time,
          status: formData.status,
          notes: formData.notes || null
        });
        toast.success(language === 'sr' ? 'Dostupnost ažurirana' : 'Availability updated');
      } else {
        // Create new slot
        await axios.post(`${API}/staff/availability`, formData);
        toast.success(
          formData.repeat_weekly 
            ? (language === 'sr' ? 'Dostupnost kreirana za 5 nedelja' : 'Availability created for 5 weeks')
            : (language === 'sr' ? 'Dostupnost kreirana' : 'Availability created')
        );
      }
      setIsAddDialogOpen(false);
      fetchAvailability();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška' : 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!confirm(language === 'sr' ? 'Obrisati ovu dostupnost?' : 'Delete this availability?')) return;
    try {
      await axios.delete(`${API}/staff/availability/${slotId}`);
      toast.success(language === 'sr' ? 'Obrisano' : 'Deleted');
      fetchAvailability();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška' : 'Error'));
    }
  };

  // Day names
  const dayNames = language === 'sr' 
    ? ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const monthNames = language === 'sr'
    ? ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="availability-calendar">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {language === 'sr' ? 'Raspored dostupnosti' : 'Availability Schedule'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isAdmin() 
              ? (language === 'sr' ? 'Pregled dostupnosti celokupnog tima' : 'View all team availability')
              : (language === 'sr' ? 'Upravljajte svojom dostupnošću' : 'Manage your availability')
            }
          </p>
        </div>
        
        <Button onClick={() => handleOpenAddDialog()} className="gap-2" data-testid="add-availability-btn">
          <Plus className="w-4 h-4" />
          {language === 'sr' ? 'Dodaj dostupnost' : 'Add Availability'}
        </Button>
      </div>

      {/* Filters (Admin only) */}
      {isAdmin() && (
        <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={language === 'sr' ? 'Svi zaposleni' : 'All Staff'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'sr' ? 'Svi zaposleni' : 'All Staff'}</SelectItem>
                {staffList.map(staff => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={language === 'sr' ? 'Sve uloge' : 'All Roles'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'sr' ? 'Sve uloge' : 'All Roles'}</SelectItem>
                <SelectItem value="driver">{language === 'sr' ? 'Vozači' : 'Drivers'}</SelectItem>
                <SelectItem value="doctor">{language === 'sr' ? 'Doktori' : 'Doctors'}</SelectItem>
                <SelectItem value="nurse">{language === 'sr' ? 'Med. sestre' : 'Nurses'}</SelectItem>
                <SelectItem value="admin">{language === 'sr' ? 'Admini' : 'Admins'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Calendar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={goToToday} className="text-sm">
            {language === 'sr' ? 'Danas' : 'Today'}
          </Button>
        </div>
        
        <h2 className="text-lg font-semibold text-slate-900">
          {viewMode === 'week' 
            ? `${formatDate(getWeekStart(currentDate))} - ${formatDate(new Date(getWeekStart(currentDate).getTime() + 6 * 24 * 60 * 60 * 1000))}`
            : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
          }
        </h2>
        
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('week')}
          >
            {language === 'sr' ? 'Nedelja' : 'Week'}
          </Button>
          <Button 
            variant={viewMode === 'month' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('month')}
          >
            {language === 'sr' ? 'Mesec' : 'Month'}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${config.color}`}></div>
            <span className="text-slate-600">{language === 'sr' ? config.label_sr : config.label_en}</span>
          </div>
        ))}
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200">
            {getWeekDays().map((day, idx) => {
              const isToday = formatDate(day) === formatDate(new Date());
              return (
                <div 
                  key={idx} 
                  className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-sky-50' : ''}`}
                >
                  <p className="text-xs text-slate-500">{dayNames[idx]}</p>
                  <p className={`text-lg font-semibold ${isToday ? 'text-sky-600' : 'text-slate-900'}`}>
                    {day.getDate()}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* Day Content */}
          <div className="grid grid-cols-7 min-h-[400px]">
            {getWeekDays().map((day, idx) => {
              const slots = getSlotsForDate(day);
              const isToday = formatDate(day) === formatDate(new Date());
              
              return (
                <div 
                  key={idx} 
                  className={`border-r last:border-r-0 p-2 ${isToday ? 'bg-sky-50/50' : ''}`}
                  onClick={() => handleOpenAddDialog(day)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="space-y-1">
                    {slots.map(slot => {
                      const statusConfig = STATUS_CONFIG[slot.status] || STATUS_CONFIG.available;
                      const roleConfig = ROLE_CONFIG[slot.user_role] || ROLE_CONFIG.admin;
                      const RoleIcon = roleConfig.icon;
                      
                      return (
                        <div 
                          key={slot.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (slot.user_id === user?.id || isAdmin()) {
                              handleEditSlot(slot);
                            }
                          }}
                          className={`p-2 rounded-lg text-xs ${statusConfig.bgColor} ${statusConfig.textColor} cursor-pointer hover:opacity-80 transition-opacity`}
                        >
                          <div className="flex items-center gap-1 font-medium">
                            <RoleIcon className="w-3 h-3" />
                            <span className="truncate">{slot.user_name.split(' ')[0]}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 opacity-75">
                            <Clock className="w-3 h-3" />
                            {slot.start_time}-{slot.end_time}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-xs font-medium text-slate-500">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {getMonthDays().map(({ date, isCurrentMonth }, idx) => {
              const slots = getSlotsForDate(date);
              const isToday = formatDate(date) === formatDate(new Date());
              
              return (
                <div 
                  key={idx}
                  onClick={() => handleOpenAddDialog(date)}
                  className={`min-h-[100px] p-1 border-b border-r cursor-pointer hover:bg-slate-50 transition-colors ${
                    !isCurrentMonth ? 'bg-slate-50/50' : ''
                  } ${isToday ? 'bg-sky-50' : ''}`}
                >
                  <p className={`text-sm font-medium mb-1 ${
                    !isCurrentMonth ? 'text-slate-300' : isToday ? 'text-sky-600' : 'text-slate-700'
                  }`}>
                    {date.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {slots.slice(0, 3).map(slot => {
                      const statusConfig = STATUS_CONFIG[slot.status];
                      return (
                        <div 
                          key={slot.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (slot.user_id === user?.id || isAdmin()) {
                              handleEditSlot(slot);
                            }
                          }}
                          className={`text-[10px] px-1 py-0.5 rounded truncate ${statusConfig.color} text-white`}
                        >
                          {slot.user_name.split(' ')[0]}
                        </div>
                      );
                    })}
                    {slots.length > 3 && (
                      <p className="text-[10px] text-slate-400 pl-1">+{slots.length - 3}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSlot 
                ? (language === 'sr' ? 'Izmeni dostupnost' : 'Edit Availability')
                : (language === 'sr' ? 'Dodaj dostupnost' : 'Add Availability')
              }
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {language === 'sr' ? 'Datum' : 'Date'}
              </label>
              <Input 
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                disabled={!!editingSlot}
              />
            </div>
            
            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {language === 'sr' ? 'Od' : 'From'}
                </label>
                <Input 
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {language === 'sr' ? 'Do' : 'To'}
                </label>
                <Input 
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                />
              </div>
            </div>
            
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {language === 'sr' ? 'Status' : 'Status'}
              </label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded ${config.color}`}></div>
                        {language === 'sr' ? config.label_sr : config.label_en}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {language === 'sr' ? 'Napomena (opciono)' : 'Notes (optional)'}
              </label>
              <Input 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder={language === 'sr' ? 'Npr. samo za hitne slučajeve' : 'E.g. emergencies only'}
              />
            </div>
            
            {/* Repeat Weekly (only for new slots) */}
            {!editingSlot && (
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="repeat_weekly"
                  checked={formData.repeat_weekly}
                  onChange={(e) => setFormData({...formData, repeat_weekly: e.target.checked})}
                  className="rounded border-slate-300"
                />
                <label htmlFor="repeat_weekly" className="text-sm text-slate-600">
                  {language === 'sr' ? 'Ponovi naredne 4 nedelje' : 'Repeat for next 4 weeks'}
                </label>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {editingSlot && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    handleDeleteSlot(editingSlot.id);
                    setIsAddDialogOpen(false);
                  }}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {language === 'sr' ? 'Obriši' : 'Delete'}
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                className="flex-1"
              >
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingSlot 
                  ? (language === 'sr' ? 'Sačuvaj' : 'Save')
                  : (language === 'sr' ? 'Dodaj' : 'Add')
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffAvailabilityCalendar;
