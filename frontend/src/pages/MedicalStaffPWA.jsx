import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Activity,
  Heart,
  Wind,
  Thermometer,
  Droplets,
  Brain,
  AlertTriangle,
  Loader2,
  Save,
  Ambulance,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  LogOut,
  Globe,
  RefreshCw,
  ChevronLeft,
  Stethoscope
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Extra large styles for gloved hands in shaking ambulance
const bigButtonClass = "h-20 text-xl font-bold rounded-2xl shadow-lg";
const inputBigClass = "h-16 text-2xl text-center font-bold rounded-2xl border-2";

const MedicalStaffPWA = () => {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [activeTransports, setActiveTransports] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Vital signs form - simplified for quick entry
  const [vitals, setVitals] = useState({
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    temperature: '',
    gcs_score: '',
    consciousness: '',
    notes: ''
  });

  // Fetch active transports
  const fetchTransports = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/medical/dashboard`);
      setActiveTransports(response.data.active_transports || []);
    } catch (error) {
      console.error('Error fetching transports:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransports();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTransports, 30000);
    return () => clearInterval(interval);
  }, [fetchTransports]);

  // Quick vital presets
  const applyPreset = (type) => {
    if (type === 'normal') {
      setVitals({
        ...vitals,
        systolic_bp: '120',
        diastolic_bp: '80',
        heart_rate: '75',
        oxygen_saturation: '98',
        respiratory_rate: '16',
        temperature: '36.6',
        gcs_score: '15',
        consciousness: 'alert'
      });
    } else if (type === 'clear') {
      setVitals({
        systolic_bp: '',
        diastolic_bp: '',
        heart_rate: '',
        oxygen_saturation: '',
        respiratory_rate: '',
        temperature: '',
        gcs_score: '',
        consciousness: '',
        notes: ''
      });
    }
  };

  // Check if values are critical
  const isCritical = (field, value) => {
    if (!value) return false;
    const v = parseFloat(value);
    
    switch(field) {
      case 'systolic_bp': return v < 90 || v > 180;
      case 'diastolic_bp': return v < 60 || v > 120;
      case 'heart_rate': return v < 50 || v > 150;
      case 'oxygen_saturation': return v < 90;
      case 'respiratory_rate': return v < 8 || v > 30;
      case 'temperature': return v < 35 || v > 39;
      case 'gcs_score': return v <= 8;
      default: return false;
    }
  };

  // Get input style based on value
  const getInputStyle = (field, value) => {
    if (isCritical(field, value)) {
      return 'bg-red-100 border-red-500 text-red-700 animate-pulse';
    }
    return 'bg-slate-800 border-slate-600 text-white';
  };

  // Save vitals
  const handleSave = async () => {
    if (!selectedTransport) {
      toast.error(language === 'sr' ? 'Izaberite transport' : 'Select a transport');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        booking_id: selectedTransport.id,
        patient_name: selectedTransport.patient_name,
        systolic_bp: vitals.systolic_bp ? parseInt(vitals.systolic_bp) : null,
        diastolic_bp: vitals.diastolic_bp ? parseInt(vitals.diastolic_bp) : null,
        heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate) : null,
        oxygen_saturation: vitals.oxygen_saturation ? parseInt(vitals.oxygen_saturation) : null,
        respiratory_rate: vitals.respiratory_rate ? parseInt(vitals.respiratory_rate) : null,
        temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
        gcs_score: vitals.gcs_score ? parseInt(vitals.gcs_score) : null,
        consciousness_level: vitals.consciousness || null,
        notes: vitals.notes || null
      };

      const response = await axios.post(`${API}/transport/vitals`, payload);
      
      setLastSaved(new Date());
      
      if (response.data.is_critical) {
        toast.error(
          language === 'sr' 
            ? '⚠️ KRITIČNI PARAMETRI - Upozorenje poslato!' 
            : '⚠️ CRITICAL VALUES - Alert sent!',
          { duration: 5000 }
        );
      } else {
        toast.success(
          language === 'sr' ? '✓ Sačuvano' : '✓ Saved',
          { duration: 2000 }
        );
      }
      
      // Clear form for next entry
      applyPreset('clear');
      
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri čuvanju' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white" data-testid="medical-staff-pwa">
      {/* Header - Compact */}
      <header className="bg-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg" data-testid="pwa-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden">
            <img src="/logo.jpg" alt="PC018" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-bold text-sm">{user?.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleLanguage} className="text-slate-400" data-testid="language-toggle-btn">
            <Globe className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchTransports} className="text-slate-400" data-testid="refresh-btn">
            <RefreshCw className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400" data-testid="logout-btn">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 pb-28" data-testid="pwa-main-content">
        {/* Transport Selection */}
        {!selectedTransport ? (
          <div className="space-y-4" data-testid="transport-selection-view">
            <h1 className="text-2xl font-bold text-center mb-6">
              {language === 'sr' ? 'Aktivni Transporti' : 'Active Transports'}
            </h1>
            
            {activeTransports.length === 0 ? (
              <div className="text-center py-12" data-testid="no-transports-message">
                <Ambulance className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 text-lg">
                  {language === 'sr' ? 'Nema aktivnih transporta' : 'No active transports'}
                </p>
              </div>
            ) : (
              <div className="space-y-4" data-testid="transports-list">
                {activeTransports.map((transport, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedTransport(transport)}
                    className="w-full bg-slate-800 rounded-2xl p-5 text-left active:bg-slate-700 transition-all duration-200 border-2 border-transparent hover:border-red-500 shadow-lg"
                    data-testid={`transport-card-${idx}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
                          <Ambulance className="w-7 h-7 text-red-500" />
                        </div>
                        <span className="font-bold text-xl">{transport.patient_name}</span>
                      </div>
                      <Badge className={`text-sm px-3 py-1 ${
                        transport.status === 'en_route' ? 'bg-amber-500' : 
                        transport.status === 'picked_up' ? 'bg-sky-500' : 'bg-green-500'
                      }`}>
                        {transport.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-400 space-y-2 ml-15">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{transport.pickup_address || transport.start_point}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        {transport.contact_phone}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Vital Signs Entry */
          <div className="space-y-4">
            {/* Back & Patient Info */}
            <div className="flex items-center gap-3 mb-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedTransport(null)}
                className="text-slate-400"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <div className="flex-1">
                <h2 className="font-bold text-lg">{selectedTransport.patient_name}</h2>
                <p className="text-sm text-slate-400">{selectedTransport.contact_phone}</p>
              </div>
              <Badge className="bg-red-600 animate-pulse">
                {language === 'sr' ? 'TRANSPORT' : 'IN TRANSIT'}
              </Badge>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button 
                onClick={() => applyPreset('normal')}
                className="h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {language === 'sr' ? 'Normalni parametri' : 'Normal Values'}
              </Button>
              <Button 
                onClick={() => applyPreset('clear')}
                variant="outline"
                className="h-12 border-slate-600 text-slate-300"
              >
                {language === 'sr' ? 'Obriši sve' : 'Clear All'}
              </Button>
            </div>

            {/* Vital Signs Grid - Large Inputs */}
            <div className="grid grid-cols-2 gap-4">
              {/* Blood Pressure */}
              <div className="col-span-2 bg-slate-800 rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Activity className="w-5 h-5 text-red-500" />
                  {language === 'sr' ? 'Krvni pritisak' : 'Blood Pressure'} (mmHg)
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={vitals.systolic_bp}
                    onChange={(e) => setVitals({...vitals, systolic_bp: e.target.value})}
                    placeholder="120"
                    className={`${inputBigClass} flex-1 ${getInputStyle('systolic_bp', vitals.systolic_bp)}`}
                  />
                  <span className="text-2xl text-slate-500">/</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={vitals.diastolic_bp}
                    onChange={(e) => setVitals({...vitals, diastolic_bp: e.target.value})}
                    placeholder="80"
                    className={`${inputBigClass} flex-1 ${getInputStyle('diastolic_bp', vitals.diastolic_bp)}`}
                  />
                </div>
              </div>

              {/* Heart Rate */}
              <div className="bg-slate-800 rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  {language === 'sr' ? 'Puls' : 'HR'} (bpm)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={vitals.heart_rate}
                  onChange={(e) => setVitals({...vitals, heart_rate: e.target.value})}
                  placeholder="75"
                  className={`${inputBigClass} ${getInputStyle('heart_rate', vitals.heart_rate)}`}
                />
              </div>

              {/* SpO2 */}
              <div className="bg-slate-800 rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Wind className="w-5 h-5 text-blue-500" />
                  SpO₂ (%)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={vitals.oxygen_saturation}
                  onChange={(e) => setVitals({...vitals, oxygen_saturation: e.target.value})}
                  placeholder="98"
                  className={`${inputBigClass} ${getInputStyle('oxygen_saturation', vitals.oxygen_saturation)}`}
                />
              </div>

              {/* Respiratory Rate */}
              <div className="bg-slate-800 rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Wind className="w-5 h-5 text-green-500" />
                  {language === 'sr' ? 'Disanje' : 'RR'} (/min)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={vitals.respiratory_rate}
                  onChange={(e) => setVitals({...vitals, respiratory_rate: e.target.value})}
                  placeholder="16"
                  className={`${inputBigClass} ${getInputStyle('respiratory_rate', vitals.respiratory_rate)}`}
                />
              </div>

              {/* Temperature */}
              <div className="bg-slate-800 rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Thermometer className="w-5 h-5 text-orange-500" />
                  {language === 'sr' ? 'Temp' : 'Temp'} (°C)
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={(e) => setVitals({...vitals, temperature: e.target.value})}
                  placeholder="36.6"
                  className={`${inputBigClass} ${getInputStyle('temperature', vitals.temperature)}`}
                />
              </div>

              {/* GCS */}
              <div className="bg-slate-800 rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  GCS (3-15)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="3"
                  max="15"
                  value={vitals.gcs_score}
                  onChange={(e) => setVitals({...vitals, gcs_score: e.target.value})}
                  placeholder="15"
                  className={`${inputBigClass} ${getInputStyle('gcs_score', vitals.gcs_score)}`}
                />
              </div>

              {/* Consciousness - AVPU */}
              <div className="bg-slate-800 rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <User className="w-5 h-5 text-sky-500" />
                  AVPU
                </label>
                <Select value={vitals.consciousness} onValueChange={(v) => setVitals({...vitals, consciousness: v})}>
                  <SelectTrigger className="h-14 text-lg bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alert">A - Alert</SelectItem>
                    <SelectItem value="verbal">V - Verbal</SelectItem>
                    <SelectItem value="pain">P - Pain</SelectItem>
                    <SelectItem value="unresponsive">U - Unresponsive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-slate-800 rounded-xl p-4">
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                {language === 'sr' ? 'Napomena' : 'Notes'}
              </label>
              <Input
                value={vitals.notes}
                onChange={(e) => setVitals({...vitals, notes: e.target.value})}
                placeholder={language === 'sr' ? 'Dodatne napomene...' : 'Additional notes...'}
                className="h-12 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Last Saved Indicator */}
            {lastSaved && (
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                {language === 'sr' ? 'Poslednje čuvanje' : 'Last saved'}: {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fixed Save Button - Only when transport selected */}
      {selectedTransport && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-700">
          <Button
            onClick={handleSave}
            disabled={saving}
            className={`w-full ${bigButtonClass} bg-red-600 hover:bg-red-700 active:bg-red-800`}
          >
            {saving ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <Save className="w-6 h-6 mr-2" />
            )}
            {language === 'sr' ? 'SAČUVAJ VITALNE PARAMETRE' : 'SAVE VITAL SIGNS'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MedicalStaffPWA;
