import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import VitalSignsGraph from '../components/VitalSignsGraph';
import TransportVitalsDialog from '../components/TransportVitalsDialog';
import CriticalAlertsPanel from '../components/CriticalAlertsPanel';
import MedicationManager from '../components/MedicationManager';
import DiagnosesManager from '../components/DiagnosesManager';
import TransportTimeline from '../components/TransportTimeline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Activity,
  Users,
  Ambulance,
  AlertTriangle,
  Search,
  Plus,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Clock,
  Calendar,
  FileText,
  Stethoscope,
  HeartPulse,
  LogOut,
  Moon,
  Sun,
  Globe,
  ChevronRight,
  AlertCircle,
  Loader2,
  X,
  Save,
  Pill,
  Syringe,
  ClipboardList,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Download,
  CalendarRange
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import VitalSignsHistory from '../components/VitalSignsHistory';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Blood type options
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Status colors for vitals
const VITAL_STATUS = {
  normal: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
};

const MedicalDashboard = () => {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const { user, logout } = useAuth();
  
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('medicalDarkMode') === 'true';
  });
  
  // View state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  
  // Patients
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [patientForm, setPatientForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: 'male',
    phone: '',
    email: '',
    address: '',
    city: '',
    blood_type: '',
    height_cm: '',
    weight_kg: '',
    allergies: [],
    chronic_conditions: [],
    current_medications: [],
    emergency_contacts: [],
    notes: ''
  });
  const [savingPatient, setSavingPatient] = useState(false);
  
  // Transport Timeline
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedTransportId, setSelectedTransportId] = useState(null);
  const [selectedTransportPatient, setSelectedTransportPatient] = useState('');
  
  // Vital entry
  const [vitalDialogOpen, setVitalDialogOpen] = useState(false);
  const [vitalForm, setVitalForm] = useState({
    patient_id: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    temperature: '',
    blood_glucose: '',
    pain_score: '',
    notes: ''
  });
  const [savingVitals, setSavingVitals] = useState(false);
  
  // Patient vitals history
  const [patientVitals, setPatientVitals] = useState([]);
  
  // Transport vitals dialog
  const [transportVitalsOpen, setTransportVitalsOpen] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(null);
  
  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('medicalDarkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/medical/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  }, [language]);
  
  // Fetch patients
  const fetchPatients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (patientSearch) params.append('search', patientSearch);
      
      const response = await axios.get(`${API}/medical/patients?${params}`);
      setPatients(response.data.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  }, [patientSearch]);
  
  // Fetch patient vitals
  const fetchPatientVitals = useCallback(async (patientId) => {
    try {
      const response = await axios.get(`${API}/medical/vitals/${patientId}`);
      setPatientVitals(response.data.vitals || []);
    } catch (error) {
      console.error('Error fetching vitals:', error);
    }
  }, []);
  
  useEffect(() => {
    fetchDashboard();
    fetchPatients();
  }, [fetchDashboard, fetchPatients]);
  
  useEffect(() => {
    if (selectedPatient) {
      fetchPatientVitals(selectedPatient.id);
    }
  }, [selectedPatient, fetchPatientVitals]);
  
  // Handle patient form
  const handleOpenPatientDialog = (patient = null) => {
    if (patient) {
      setPatientForm({
        ...patient,
        height_cm: patient.height_cm || '',
        weight_kg: patient.weight_kg || ''
      });
      setSelectedPatient(patient);
    } else {
      setPatientForm({
        full_name: '',
        date_of_birth: '',
        gender: 'male',
        phone: '',
        email: '',
        address: '',
        city: '',
        blood_type: '',
        height_cm: '',
        weight_kg: '',
        allergies: [],
        chronic_conditions: [],
        current_medications: [],
        emergency_contacts: [],
        notes: ''
      });
      setSelectedPatient(null);
    }
    setPatientDialogOpen(true);
  };
  
  const handleSavePatient = async () => {
    if (!patientForm.full_name || !patientForm.date_of_birth || !patientForm.phone) {
      toast.error(language === 'sr' ? 'Popunite obavezna polja' : 'Fill required fields');
      return;
    }
    
    setSavingPatient(true);
    try {
      const payload = {
        ...patientForm,
        height_cm: patientForm.height_cm ? parseInt(patientForm.height_cm) : null,
        weight_kg: patientForm.weight_kg ? parseFloat(patientForm.weight_kg) : null
      };
      
      if (selectedPatient) {
        await axios.put(`${API}/medical/patients/${selectedPatient.id}`, payload);
        toast.success(language === 'sr' ? 'Pacijent ažuriran' : 'Patient updated');
      } else {
        await axios.post(`${API}/medical/patients`, payload);
        toast.success(language === 'sr' ? 'Pacijent kreiran' : 'Patient created');
      }
      
      setPatientDialogOpen(false);
      fetchPatients();
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška' : 'Error'));
    } finally {
      setSavingPatient(false);
    }
  };
  
  // Handle vitals form
  const handleOpenVitalDialog = (patient) => {
    setVitalForm({
      patient_id: patient.id,
      systolic_bp: '',
      diastolic_bp: '',
      heart_rate: '',
      oxygen_saturation: '',
      respiratory_rate: '',
      temperature: '',
      blood_glucose: '',
      pain_score: '',
      notes: ''
    });
    setSelectedPatient(patient);
    setVitalDialogOpen(true);
  };
  
  const handleSaveVitals = async () => {
    setSavingVitals(true);
    try {
      const payload = {
        ...vitalForm,
        systolic_bp: vitalForm.systolic_bp ? parseInt(vitalForm.systolic_bp) : null,
        diastolic_bp: vitalForm.diastolic_bp ? parseInt(vitalForm.diastolic_bp) : null,
        heart_rate: vitalForm.heart_rate ? parseInt(vitalForm.heart_rate) : null,
        oxygen_saturation: vitalForm.oxygen_saturation ? parseInt(vitalForm.oxygen_saturation) : null,
        respiratory_rate: vitalForm.respiratory_rate ? parseInt(vitalForm.respiratory_rate) : null,
        temperature: vitalForm.temperature ? parseFloat(vitalForm.temperature) : null,
        blood_glucose: vitalForm.blood_glucose ? parseFloat(vitalForm.blood_glucose) : null,
        pain_score: vitalForm.pain_score ? parseInt(vitalForm.pain_score) : null,
        measurement_type: 'routine'
      };
      
      await axios.post(`${API}/medical/vitals`, payload);
      toast.success(language === 'sr' ? 'Vitalni parametri zabeleženi' : 'Vital signs recorded');
      
      setVitalDialogOpen(false);
      if (selectedPatient) {
        fetchPatientVitals(selectedPatient.id);
      }
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška' : 'Error'));
    } finally {
      setSavingVitals(false);
    }
  };
  
  // View patient details
  const handleViewPatient = (patient) => {
    setSelectedPatient(patient);
    setActiveTab('patient-detail');
    fetchPatientVitals(patient.id);
  };

  // Generate PDF report for patient
  const generatePatientReport = async () => {
    if (!selectedPatient) return;
    
    setGeneratingReport(true);
    try {
      // Build query params with date range
      const params = new URLSearchParams({ format: 'pdf' });
      if (reportDateFrom) params.append('from_date', reportDateFrom);
      if (reportDateTo) params.append('to_date', reportDateTo);
      
      const response = await axios.get(
        `${API}/patients/${selectedPatient.id}/report?${params}`,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateRange = reportDateFrom || reportDateTo 
        ? `_${reportDateFrom || 'start'}_to_${reportDateTo || 'now'}` 
        : '';
      link.setAttribute('download', `patient_report_${selectedPatient.full_name.replace(/\s+/g, '_')}${dateRange}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(language === 'sr' ? 'Izveštaj generisan' : 'Report generated');
      setReportDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri generisanju izveštaja' : 'Error generating report'));
    } finally {
      setGeneratingReport(false);
    }
  };
  
  // Get vital status color
  const getVitalStatus = (type, value) => {
    if (!value) return VITAL_STATUS.normal;
    
    const ranges = {
      systolic_bp: { low: 90, normal: 120, high: 140 },
      diastolic_bp: { low: 60, normal: 80, high: 90 },
      heart_rate: { low: 60, normal: 100, high: 100 },
      oxygen_saturation: { low: 90, normal: 95, critical: 90 },
      temperature: { low: 36, normal: 37.5, high: 38 },
      respiratory_rate: { low: 12, normal: 20, high: 20 }
    };
    
    const range = ranges[type];
    if (!range) return VITAL_STATUS.normal;
    
    if (type === 'oxygen_saturation') {
      if (value < range.critical) return VITAL_STATUS.critical;
      if (value < range.normal) return VITAL_STATUS.warning;
      return VITAL_STATUS.normal;
    }
    
    if (value < range.low || value > range.high) return VITAL_STATUS.critical;
    if (value > range.normal) return VITAL_STATUS.warning;
    return VITAL_STATUS.normal;
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Base classes for dark mode
  const bgClass = darkMode ? 'bg-slate-900' : 'bg-slate-50';
  const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textClass = darkMode ? 'text-slate-100' : 'text-slate-900';
  const textMutedClass = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900';
  
  if (loading) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <Loader2 className={`w-12 h-12 animate-spin ${darkMode ? 'text-sky-400' : 'text-sky-600'}`} />
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      {/* Header */}
      <header className={`${cardClass} border-b sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <img src="/logo.jpg" alt="Paramedic Care 018" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${textClass}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                Paramedic Care 018
              </h1>
              <p className={`text-xs ${textMutedClass}`}>
                {language === 'sr' ? 'Medicinski panel' : 'Medical Dashboard'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* PDF Report button - only show when viewing patient details */}
            {activeTab === 'patient-detail' && selectedPatient && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReportDateFrom('');
                  setReportDateTo('');
                  setReportDialogOpen(true);
                }}
                className={`gap-2 ${darkMode ? 'border-slate-600 text-slate-300 hover:text-white' : ''}`}
                data-testid="header-pdf-report-btn"
              >
                <Download className="w-4 h-4" />
                {language === 'sr' ? 'PDF Izveštaj' : 'PDF Report'}
              </Button>
            )}
            
            {/* Language toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              className={darkMode ? 'text-slate-300 hover:text-white' : ''}
              data-testid="language-toggle"
              title={language === 'sr' ? 'Switch to English' : 'Prebaci na srpski'}
            >
              <Globe className="w-5 h-5" />
            </Button>
            
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className={darkMode ? 'text-slate-300 hover:text-white' : ''}
              data-testid="dark-mode-toggle"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            {/* User info */}
            <div className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <p className={`text-sm font-medium ${textClass}`}>{user?.full_name}</p>
              <p className={`text-xs ${textMutedClass} capitalize`}>{user?.role}</p>
            </div>
            
            {/* Logout */}
            <Button variant="ghost" size="icon" onClick={handleLogout} className={darkMode ? 'text-slate-300 hover:text-white' : ''}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="max-w-7xl mx-auto px-4 py-2 flex gap-1 overflow-x-auto">
          {[
            { id: 'dashboard', icon: Activity, label: language === 'sr' ? 'Pregled' : 'Overview' },
            { id: 'patients', icon: Users, label: language === 'sr' ? 'Pacijenti' : 'Patients' },
            { id: 'transports', icon: Ambulance, label: language === 'sr' ? 'Transporti' : 'Transports' },
            { id: 'alerts', icon: AlertTriangle, label: language === 'sr' ? 'Upozorenja' : 'Alerts' }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={`gap-2 ${activeTab !== tab.id && darkMode ? 'text-slate-300 hover:text-white' : ''}`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Overview */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { 
                  label: language === 'sr' ? 'Ukupno pacijenata' : 'Total Patients', 
                  value: dashboardData.stats.total_patients, 
                  icon: Users, 
                  color: 'sky' 
                },
                { 
                  label: language === 'sr' ? 'Novih (7 dana)' : 'New (7 days)', 
                  value: dashboardData.stats.recent_patients, 
                  icon: User, 
                  color: 'emerald' 
                },
                { 
                  label: language === 'sr' ? 'Aktivni transporti' : 'Active Transports', 
                  value: dashboardData.stats.active_transports, 
                  icon: Ambulance, 
                  color: 'amber' 
                },
                { 
                  label: language === 'sr' ? 'Kritična upozorenja' : 'Critical Alerts', 
                  value: dashboardData.stats.critical_alerts, 
                  icon: AlertTriangle, 
                  color: 'red' 
                }
              ].map((stat, idx) => (
                <div key={idx} className={`${cardClass} border rounded-xl p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${textMutedClass}`}>{stat.label}</p>
                      <p className={`text-3xl font-bold ${textClass} mt-1`}>{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg bg-${stat.color}-${darkMode ? '900' : '100'}`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}-${darkMode ? '400' : '600'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Quick Actions */}
            <div className={`${cardClass} border rounded-xl p-4`}>
              <h2 className={`text-lg font-semibold ${textClass} mb-4`}>
                {language === 'sr' ? 'Brze akcije' : 'Quick Actions'}
              </h2>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => handleOpenPatientDialog()} className="gap-2" data-testid="add-patient-btn">
                  <Plus className="w-4 h-4" />
                  {language === 'sr' ? 'Novi pacijent' : 'New Patient'}
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('patients')} className={`gap-2 ${darkMode ? 'border-slate-600 text-slate-300' : ''}`}>
                  <Search className="w-4 h-4" />
                  {language === 'sr' ? 'Pretraži pacijente' : 'Search Patients'}
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('transports')} className={`gap-2 ${darkMode ? 'border-slate-600 text-slate-300' : ''}`}>
                  <Ambulance className="w-4 h-4" />
                  {language === 'sr' ? 'Aktivni transporti' : 'Active Transports'}
                </Button>
              </div>
            </div>
            
            {/* Active Transports */}
            {dashboardData.active_transports.length > 0 && (
              <div className={`${cardClass} border rounded-xl p-4`}>
                <h2 className={`text-lg font-semibold ${textClass} mb-4 flex items-center gap-2`}>
                  <Ambulance className={darkMode ? 'text-amber-400' : 'text-amber-600'} />
                  {language === 'sr' ? 'Aktivni transporti' : 'Active Transports'}
                </h2>
                <div className="space-y-3">
                  {dashboardData.active_transports.slice(0, 5).map((transport, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'} flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${darkMode ? 'bg-amber-900' : 'bg-amber-100'}`}>
                          <Ambulance className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                        </div>
                        <div>
                          <p className={`font-medium ${textClass}`}>{transport.patient_name}</p>
                          <p className={`text-sm ${textMutedClass}`}>
                            {transport.pickup_address || transport.start_point} → {transport.destination_address || transport.end_point}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTransportId(transport.id);
                            setSelectedTransportPatient(transport.patient_name);
                            setTimelineOpen(true);
                          }}
                          className={`${darkMode ? 'hover:bg-slate-600' : ''}`}
                          title={language === 'sr' ? 'Vremenska linija' : 'Timeline'}
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                        <Badge className={
                          transport.status === 'en_route' ? 'bg-amber-500' : 
                          transport.status === 'picked_up' ? 'bg-sky-500' : 'bg-green-500'
                        }>
                          {transport.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Patients */}
            <div className={`${cardClass} border rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${textClass}`}>
                  {language === 'sr' ? 'Nedavni pacijenti' : 'Recent Patients'}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('patients')} className={darkMode ? 'text-slate-300' : ''}>
                  {language === 'sr' ? 'Vidi sve' : 'View all'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="space-y-2">
                {patients.slice(0, 5).map((patient, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'} cursor-pointer transition-colors flex items-center justify-between`}
                    onClick={() => handleViewPatient(patient)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-sky-900' : 'bg-sky-100'} flex items-center justify-center`}>
                        <span className={`font-medium ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>
                          {patient.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className={`font-medium ${textClass}`}>{patient.full_name}</p>
                        <p className={`text-sm ${textMutedClass}`}>{patient.patient_id} • {patient.blood_type || 'N/A'}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${textMutedClass}`} />
                  </div>
                ))}
                {patients.length === 0 && (
                  <p className={`text-center py-8 ${textMutedClass}`}>
                    {language === 'sr' ? 'Nema registrovanih pacijenata' : 'No patients registered'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Patients List */}
        {activeTab === 'patients' && (
          <div className="space-y-4">
            {/* Search and Actions */}
            <div className={`${cardClass} border rounded-xl p-4`}>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textMutedClass}`} />
                  <Input
                    placeholder={language === 'sr' ? 'Pretraži po imenu, ID, telefonu...' : 'Search by name, ID, phone...'}
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className={`pl-10 ${inputClass}`}
                    data-testid="patient-search"
                  />
                </div>
                <Button onClick={() => handleOpenPatientDialog()} className="gap-2" data-testid="add-patient-btn-list">
                  <Plus className="w-4 h-4" />
                  {language === 'sr' ? 'Novi pacijent' : 'New Patient'}
                </Button>
              </div>
            </div>
            
            {/* Patients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.map((patient, idx) => (
                <div key={idx} className={`${cardClass} border rounded-xl p-4 hover:shadow-lg transition-shadow`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-sky-900' : 'bg-sky-100'} flex items-center justify-center`}>
                        {patient.photo_url ? (
                          <img src={patient.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <span className={`text-lg font-medium ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>
                            {patient.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className={`font-semibold ${textClass}`}>{patient.full_name}</p>
                        <p className={`text-sm ${textMutedClass}`}>{patient.patient_id}</p>
                      </div>
                    </div>
                    {patient.blood_type && (
                      <Badge variant="outline" className={`${darkMode ? 'border-red-700 text-red-400' : 'border-red-300 text-red-600'}`}>
                        {patient.blood_type}
                      </Badge>
                    )}
                  </div>
                  
                  <div className={`space-y-2 text-sm ${textMutedClass}`}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{patient.age} {language === 'sr' ? 'god' : 'yrs'} • {patient.gender === 'male' ? (language === 'sr' ? 'Muški' : 'Male') : (language === 'sr' ? 'Ženski' : 'Female')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{patient.phone}</span>
                    </div>
                    {patient.allergies?.length > 0 && (
                      <div className="flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{patient.allergies.length} {language === 'sr' ? 'alergija' : 'allergies'}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`flex-1 ${darkMode ? 'border-slate-600 text-slate-300' : ''}`}
                      onClick={() => handleViewPatient(patient)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {language === 'sr' ? 'Detalji' : 'View'}
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleOpenVitalDialog(patient)}
                    >
                      <HeartPulse className="w-4 h-4 mr-1" />
                      {language === 'sr' ? 'Vitali' : 'Vitals'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {patients.length === 0 && (
              <div className={`${cardClass} border rounded-xl p-12 text-center`}>
                <Users className={`w-12 h-12 mx-auto mb-4 ${textMutedClass}`} />
                <p className={`${textClass} font-medium mb-2`}>
                  {language === 'sr' ? 'Nema pronađenih pacijenata' : 'No patients found'}
                </p>
                <p className={textMutedClass}>
                  {language === 'sr' ? 'Kreirajte novog pacijenta ili promenite pretragu' : 'Create a new patient or change your search'}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Patient Detail */}
        {activeTab === 'patient-detail' && selectedPatient && (
          <div className="space-y-6">
            {/* Back button */}
            <Button 
              variant="ghost" 
              onClick={() => setActiveTab('patients')}
              className={darkMode ? 'text-slate-300' : ''}
            >
              ← {language === 'sr' ? 'Nazad na listu' : 'Back to list'}
            </Button>
            
            {/* Patient Header */}
            <div className={`${cardClass} border rounded-xl p-6`}>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-20 h-20 rounded-full ${darkMode ? 'bg-sky-900' : 'bg-sky-100'} flex items-center justify-center`}>
                    {selectedPatient.photo_url ? (
                      <img src={selectedPatient.photo_url} alt="" className="w-20 h-20 rounded-full object-cover" />
                    ) : (
                      <span className={`text-2xl font-bold ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>
                        {selectedPatient.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${textClass}`}>{selectedPatient.full_name}</h2>
                    <p className={textMutedClass}>{selectedPatient.patient_id}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className={selectedPatient.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}>
                        {selectedPatient.gender === 'male' ? '♂' : '♀'} {selectedPatient.age} {language === 'sr' ? 'god' : 'yrs'}
                      </Badge>
                      {selectedPatient.blood_type && (
                        <Badge variant="outline" className="border-red-500 text-red-500">
                          🩸 {selectedPatient.blood_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleOpenPatientDialog(selectedPatient)} className={darkMode ? 'border-slate-600 text-slate-300' : ''}>
                    <Edit className="w-4 h-4 mr-2" />
                    {language === 'sr' ? 'Izmeni' : 'Edit'}
                  </Button>
                  <Button onClick={() => handleOpenVitalDialog(selectedPatient)}>
                    <HeartPulse className="w-4 h-4 mr-2" />
                    {language === 'sr' ? 'Novi vitali' : 'New Vitals'}
                  </Button>
                </div>
              </div>
              
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <p className={`text-sm ${textMutedClass}`}>{language === 'sr' ? 'Telefon' : 'Phone'}</p>
                  <p className={`font-medium ${textClass}`}>{selectedPatient.phone}</p>
                </div>
                <div>
                  <p className={`text-sm ${textMutedClass}`}>{language === 'sr' ? 'Email' : 'Email'}</p>
                  <p className={`font-medium ${textClass}`}>{selectedPatient.email || 'N/A'}</p>
                </div>
                <div>
                  <p className={`text-sm ${textMutedClass}`}>{language === 'sr' ? 'Visina' : 'Height'}</p>
                  <p className={`font-medium ${textClass}`}>{selectedPatient.height_cm ? `${selectedPatient.height_cm} cm` : 'N/A'}</p>
                </div>
                <div>
                  <p className={`text-sm ${textMutedClass}`}>{language === 'sr' ? 'Težina / BMI' : 'Weight / BMI'}</p>
                  <p className={`font-medium ${textClass}`}>
                    {selectedPatient.weight_kg ? `${selectedPatient.weight_kg} kg` : 'N/A'}
                    {selectedPatient.bmi && <span className={textMutedClass}> (BMI: {selectedPatient.bmi})</span>}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Allergies Warning */}
            {selectedPatient.allergies?.length > 0 && (
              <div className={`${darkMode ? 'bg-amber-900/50 border-amber-700' : 'bg-amber-50 border-amber-300'} border rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={darkMode ? 'text-amber-400' : 'text-amber-600'} />
                  <h3 className={`font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                    {language === 'sr' ? 'Alergije' : 'Allergies'}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.allergies.map((allergy, idx) => (
                    <Badge key={idx} variant="outline" className={`${darkMode ? 'border-amber-600 text-amber-400' : 'border-amber-500 text-amber-700'}`}>
                      ⚠️ {allergy.allergen} {allergy.severity === 'severe' && '(SEVERE)'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Conditions and Medications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chronic Conditions */}
              <div className={`${cardClass} border rounded-xl p-4`}>
                <h3 className={`font-semibold ${textClass} mb-3 flex items-center gap-2`}>
                  <Syringe className="w-5 h-5" />
                  {language === 'sr' ? 'Hronična stanja' : 'Chronic Conditions'}
                </h3>
                {selectedPatient.chronic_conditions?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPatient.chronic_conditions.map((condition, idx) => (
                      <div key={idx} className={`p-2 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                        <p className={`font-medium ${textClass}`}>{condition.name}</p>
                        {condition.diagnosed_date && (
                          <p className={`text-sm ${textMutedClass}`}>
                            {language === 'sr' ? 'Dijagnoza' : 'Diagnosed'}: {condition.diagnosed_date}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={textMutedClass}>{language === 'sr' ? 'Nema zabeleženih' : 'None recorded'}</p>
                )}
              </div>
              
              {/* Current Medications */}
              <div className={`${cardClass} border rounded-xl p-4`}>
                <h3 className={`font-semibold ${textClass} mb-3 flex items-center gap-2`}>
                  <Pill className="w-5 h-5" />
                  {language === 'sr' ? 'Trenutni lekovi' : 'Current Medications'}
                </h3>
                {selectedPatient.current_medications?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPatient.current_medications.map((med, idx) => (
                      <div key={idx} className={`p-2 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                        <p className={`font-medium ${textClass}`}>{med.name}</p>
                        <p className={`text-sm ${textMutedClass}`}>{med.dosage} • {med.frequency}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={textMutedClass}>{language === 'sr' ? 'Nema zabeleženih' : 'None recorded'}</p>
                )}
              </div>
            </div>
            
            {/* Vital Signs Graph */}
            <VitalSignsGraph 
              vitals={patientVitals}
              patientName={selectedPatient.full_name}
              language={language}
              darkMode={darkMode}
            />
            
            {/* Diagnoses and Medications - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Diagnoses Manager */}
              <div className={`${cardClass} border rounded-xl p-4`}>
                <DiagnosesManager 
                  patient={selectedPatient}
                  language={language}
                  onUpdate={() => fetchPatients()}
                />
              </div>
              
              {/* Medication Administration */}
              <div className={`${cardClass} border rounded-xl p-4`}>
                <MedicationManager 
                  patient={selectedPatient}
                  language={language}
                />
              </div>
            </div>
            
            {/* Vital Signs History */}
            <div className={`${cardClass} border rounded-xl p-4`}>
              <h3 className={`font-semibold ${textClass} mb-4 flex items-center gap-2`}>
                <TrendingUp className="w-5 h-5" />
                {language === 'sr' ? 'Istorija vitalnih parametara' : 'Vital Signs History'}
              </h3>
              
              {patientVitals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                        <th className={`text-left p-2 text-sm ${textMutedClass}`}>{language === 'sr' ? 'Datum' : 'Date'}</th>
                        <th className={`text-center p-2 text-sm ${textMutedClass}`}>BP</th>
                        <th className={`text-center p-2 text-sm ${textMutedClass}`}>HR</th>
                        <th className={`text-center p-2 text-sm ${textMutedClass}`}>SpO₂</th>
                        <th className={`text-center p-2 text-sm ${textMutedClass}`}>Temp</th>
                        <th className={`text-center p-2 text-sm ${textMutedClass}`}>RR</th>
                        <th className={`text-left p-2 text-sm ${textMutedClass}`}>{language === 'sr' ? 'Upozorenja' : 'Flags'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientVitals.map((vital, idx) => (
                        <tr key={idx} className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          <td className={`p-2 ${textClass}`}>
                            <p className="font-medium">{new Date(vital.recorded_at).toLocaleDateString()}</p>
                            <p className={`text-xs ${textMutedClass}`}>{new Date(vital.recorded_at).toLocaleTimeString()}</p>
                          </td>
                          <td className="text-center p-2">
                            <span className={`px-2 py-1 rounded text-sm ${getVitalStatus('systolic_bp', vital.systolic_bp).bg} ${getVitalStatus('systolic_bp', vital.systolic_bp).text}`}>
                              {vital.systolic_bp || '-'}/{vital.diastolic_bp || '-'}
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <span className={`px-2 py-1 rounded text-sm ${getVitalStatus('heart_rate', vital.heart_rate).bg} ${getVitalStatus('heart_rate', vital.heart_rate).text}`}>
                              {vital.heart_rate || '-'}
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <span className={`px-2 py-1 rounded text-sm ${getVitalStatus('oxygen_saturation', vital.oxygen_saturation).bg} ${getVitalStatus('oxygen_saturation', vital.oxygen_saturation).text}`}>
                              {vital.oxygen_saturation ? `${vital.oxygen_saturation}%` : '-'}
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <span className={`px-2 py-1 rounded text-sm ${getVitalStatus('temperature', vital.temperature).bg} ${getVitalStatus('temperature', vital.temperature).text}`}>
                              {vital.temperature ? `${vital.temperature}°` : '-'}
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <span className={`px-2 py-1 rounded text-sm ${getVitalStatus('respiratory_rate', vital.respiratory_rate).bg} ${getVitalStatus('respiratory_rate', vital.respiratory_rate).text}`}>
                              {vital.respiratory_rate || '-'}
                            </span>
                          </td>
                          <td className="p-2">
                            {vital.flags?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {vital.flags.map((flag, fIdx) => (
                                  <Badge key={fIdx} variant="destructive" className="text-xs">
                                    {flag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className={textMutedClass}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={`text-center py-8 ${textMutedClass}`}>
                  {language === 'sr' ? 'Nema zabeleženih vitalnih parametara' : 'No vital signs recorded'}
                </p>
              )}
            </div>
            
            {/* Emergency Contacts */}
            {selectedPatient.emergency_contacts?.length > 0 && (
              <div className={`${cardClass} border rounded-xl p-4`}>
                <h3 className={`font-semibold ${textClass} mb-3 flex items-center gap-2`}>
                  <Phone className="w-5 h-5" />
                  {language === 'sr' ? 'Hitni kontakti' : 'Emergency Contacts'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedPatient.emergency_contacts.map((contact, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'} flex items-center justify-between`}>
                      <div>
                        <p className={`font-medium ${textClass}`}>{contact.name}</p>
                        <p className={`text-sm ${textMutedClass}`}>{contact.relationship}</p>
                      </div>
                      <a href={`tel:${contact.phone}`} className={`p-2 rounded-lg ${darkMode ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'}`}>
                        <Phone className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Active Transports */}
        {activeTab === 'transports' && (
          <div className="space-y-4">
            <div className={`${cardClass} border rounded-xl p-4`}>
              <h2 className={`text-lg font-semibold ${textClass} mb-4`}>
                {language === 'sr' ? 'Aktivni transporti' : 'Active Transports'}
              </h2>
              {dashboardData?.active_transports?.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.active_transports.map((transport, idx) => (
                    <div key={idx} className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Ambulance className={darkMode ? 'text-amber-400' : 'text-amber-600'} />
                          <div>
                            <p className={`font-semibold ${textClass}`}>{transport.patient_name}</p>
                            <p className={`text-sm ${textMutedClass}`}>{transport.contact_phone}</p>
                          </div>
                        </div>
                        <Badge className={
                          transport.status === 'en_route' ? 'bg-amber-500' : 
                          transport.status === 'picked_up' ? 'bg-sky-500' : 
                          transport.status === 'confirmed' ? 'bg-green-500' : 'bg-slate-500'
                        }>
                          {transport.status}
                        </Badge>
                      </div>
                      <div className={`text-sm ${textMutedClass}`}>
                        <p>📍 {transport.pickup_address || transport.start_point}</p>
                        <p>🎯 {transport.destination_address || transport.end_point}</p>
                        {transport.assigned_driver_name && (
                          <p className="mt-2">🚑 {language === 'sr' ? 'Vozač' : 'Driver'}: {transport.assigned_driver_name}</p>
                        )}
                      </div>
                      {/* Record Vitals Button */}
                      <Button 
                        size="sm" 
                        className="mt-3 w-full bg-red-600 hover:bg-red-700"
                        onClick={() => {
                          setSelectedTransport(transport);
                          setTransportVitalsOpen(true);
                        }}
                      >
                        <HeartPulse className="w-4 h-4 mr-2" />
                        {language === 'sr' ? 'Unesi vitalne parametre' : 'Record Vital Signs'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center py-8 ${textMutedClass}`}>
                  {language === 'sr' ? 'Nema aktivnih transporta' : 'No active transports'}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Alerts */}
        {activeTab === 'alerts' && (
          <CriticalAlertsPanel language={language} darkMode={darkMode} embedded={true} />
        )}
      </main>
      
      {/* Patient Dialog */}
      <Dialog open={patientDialogOpen} onOpenChange={setPatientDialogOpen}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-800 text-slate-100' : ''}`}>
          <DialogHeader>
            <DialogTitle>
              {selectedPatient ? (language === 'sr' ? 'Izmeni pacijenta' : 'Edit Patient') : (language === 'sr' ? 'Novi pacijent' : 'New Patient')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Ime i prezime' : 'Full Name'} *</label>
                <Input
                  value={patientForm.full_name}
                  onChange={(e) => setPatientForm({...patientForm, full_name: e.target.value})}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Datum rođenja' : 'Date of Birth'} *</label>
                <Input
                  type="date"
                  value={patientForm.date_of_birth}
                  onChange={(e) => setPatientForm({...patientForm, date_of_birth: e.target.value})}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Pol' : 'Gender'}</label>
                <Select value={patientForm.gender} onValueChange={(v) => setPatientForm({...patientForm, gender: v})}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{language === 'sr' ? 'Muški' : 'Male'}</SelectItem>
                    <SelectItem value="female">{language === 'sr' ? 'Ženski' : 'Female'}</SelectItem>
                    <SelectItem value="other">{language === 'sr' ? 'Drugo' : 'Other'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Telefon' : 'Phone'} *</label>
                <Input
                  value={patientForm.phone}
                  onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Email' : 'Email'}</label>
                <Input
                  type="email"
                  value={patientForm.email}
                  onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Krvna grupa' : 'Blood Type'}</label>
                <Select value={patientForm.blood_type || ''} onValueChange={(v) => setPatientForm({...patientForm, blood_type: v})}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder={language === 'sr' ? 'Izaberi' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map(bt => (
                      <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Visina (cm)' : 'Height (cm)'}</label>
                <Input
                  type="number"
                  value={patientForm.height_cm}
                  onChange={(e) => setPatientForm({...patientForm, height_cm: e.target.value})}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Težina (kg)' : 'Weight (kg)'}</label>
                <Input
                  type="number"
                  step="0.1"
                  value={patientForm.weight_kg}
                  onChange={(e) => setPatientForm({...patientForm, weight_kg: e.target.value})}
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Adresa' : 'Address'}</label>
                <Input
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Grad' : 'City'}</label>
                <Input
                  value={patientForm.city}
                  onChange={(e) => setPatientForm({...patientForm, city: e.target.value})}
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">{language === 'sr' ? 'Napomene' : 'Notes'}</label>
                <Input
                  value={patientForm.notes}
                  onChange={(e) => setPatientForm({...patientForm, notes: e.target.value})}
                  className={inputClass}
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setPatientDialogOpen(false)} className="flex-1">
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button onClick={handleSavePatient} disabled={savingPatient} className="flex-1">
                {savingPatient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {language === 'sr' ? 'Sačuvaj' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Vital Signs Dialog */}
      <Dialog open={vitalDialogOpen} onOpenChange={setVitalDialogOpen}>
        <DialogContent className={`max-w-md ${darkMode ? 'bg-slate-800 text-slate-100' : ''}`}>
          <DialogHeader>
            <DialogTitle>
              {language === 'sr' ? 'Unos vitalnih parametara' : 'Record Vital Signs'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPatient && (
            <p className={`text-sm ${textMutedClass} -mt-2`}>
              {language === 'sr' ? 'Pacijent' : 'Patient'}: {selectedPatient.full_name}
            </p>
          )}
          
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'sr' ? 'Sistolni BP' : 'Systolic BP'} (mmHg)
                </label>
                <Input
                  type="number"
                  value={vitalForm.systolic_bp}
                  onChange={(e) => setVitalForm({...vitalForm, systolic_bp: e.target.value})}
                  placeholder="120"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'sr' ? 'Dijastolni BP' : 'Diastolic BP'} (mmHg)
                </label>
                <Input
                  type="number"
                  value={vitalForm.diastolic_bp}
                  onChange={(e) => setVitalForm({...vitalForm, diastolic_bp: e.target.value})}
                  placeholder="80"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'sr' ? 'Puls' : 'Heart Rate'} (bpm)
                </label>
                <Input
                  type="number"
                  value={vitalForm.heart_rate}
                  onChange={(e) => setVitalForm({...vitalForm, heart_rate: e.target.value})}
                  placeholder="72"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  SpO₂ (%)
                </label>
                <Input
                  type="number"
                  value={vitalForm.oxygen_saturation}
                  onChange={(e) => setVitalForm({...vitalForm, oxygen_saturation: e.target.value})}
                  placeholder="98"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'sr' ? 'Respiracija' : 'Resp Rate'} (/min)
                </label>
                <Input
                  type="number"
                  value={vitalForm.respiratory_rate}
                  onChange={(e) => setVitalForm({...vitalForm, respiratory_rate: e.target.value})}
                  placeholder="16"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'sr' ? 'Temperatura' : 'Temperature'} (°C)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={vitalForm.temperature}
                  onChange={(e) => setVitalForm({...vitalForm, temperature: e.target.value})}
                  placeholder="36.6"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'sr' ? 'Glukoza' : 'Blood Glucose'}
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={vitalForm.blood_glucose}
                  onChange={(e) => setVitalForm({...vitalForm, blood_glucose: e.target.value})}
                  placeholder="100"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'sr' ? 'Bol (1-10)' : 'Pain (1-10)'}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={vitalForm.pain_score}
                  onChange={(e) => setVitalForm({...vitalForm, pain_score: e.target.value})}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                {language === 'sr' ? 'Napomena' : 'Notes'}
              </label>
              <Input
                value={vitalForm.notes}
                onChange={(e) => setVitalForm({...vitalForm, notes: e.target.value})}
                placeholder={language === 'sr' ? 'Opcione napomene...' : 'Optional notes...'}
                className={inputClass}
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setVitalDialogOpen(false)} className="flex-1">
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button onClick={handleSaveVitals} disabled={savingVitals} className="flex-1">
                {savingVitals && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {language === 'sr' ? 'Sačuvaj' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Transport Vitals Dialog */}
      <TransportVitalsDialog
        isOpen={transportVitalsOpen}
        onClose={() => {
          setTransportVitalsOpen(false);
          setSelectedTransport(null);
        }}
        bookingId={selectedTransport?.id}
        patientName={selectedTransport?.patient_name}
        language={language}
        darkMode={darkMode}
        onSuccess={() => fetchDashboard()}
      />

      {/* Transport Timeline Dialog */}
      <TransportTimeline
        bookingId={selectedTransportId}
        isOpen={timelineOpen}
        onClose={() => {
          setTimelineOpen(false);
          setSelectedTransportId(null);
        }}
        patientName={selectedTransportPatient}
      />
    </div>
  );
};

export default MedicalDashboard;
