import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Activity,
  Heart,
  Wind,
  Thermometer,
  Droplets,
  Brain,
  AlertTriangle,
  Loader2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TransportVitalsDialog = ({ 
  isOpen, 
  onClose, 
  bookingId, 
  patientName,
  language = 'sr',
  darkMode = false,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    temperature: '',
    blood_glucose: '',
    pain_score: '',
    gcs_score: '',
    consciousness_level: '',
    oxygen_delivery: '',
    iv_access: '',
    notes: ''
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        booking_id: bookingId,
        patient_name: patientName,
        systolic_bp: formData.systolic_bp ? parseInt(formData.systolic_bp) : null,
        diastolic_bp: formData.diastolic_bp ? parseInt(formData.diastolic_bp) : null,
        heart_rate: formData.heart_rate ? parseInt(formData.heart_rate) : null,
        oxygen_saturation: formData.oxygen_saturation ? parseInt(formData.oxygen_saturation) : null,
        respiratory_rate: formData.respiratory_rate ? parseInt(formData.respiratory_rate) : null,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        blood_glucose: formData.blood_glucose ? parseFloat(formData.blood_glucose) : null,
        pain_score: formData.pain_score ? parseInt(formData.pain_score) : null,
        gcs_score: formData.gcs_score ? parseInt(formData.gcs_score) : null,
        consciousness_level: formData.consciousness_level || null,
        oxygen_delivery: formData.oxygen_delivery || null,
        iv_access: formData.iv_access === 'yes' ? true : formData.iv_access === 'no' ? false : null,
        notes: formData.notes || null
      };

      const response = await axios.post(`${API}/transport/vitals`, payload);
      
      if (response.data.is_critical) {
        toast.error(
          language === 'sr' 
            ? '⚠️ KRITIČNI VITALNI PARAMETRI - Admin je obavešten!' 
            : '⚠️ CRITICAL VITALS - Admin has been notified!',
          { duration: 5000 }
        );
      } else {
        toast.success(language === 'sr' ? 'Vitalni parametri zabeleženi' : 'Vital signs recorded');
      }
      
      // Reset form
      setFormData({
        systolic_bp: '', diastolic_bp: '', heart_rate: '', oxygen_saturation: '',
        respiratory_rate: '', temperature: '', blood_glucose: '', pain_score: '',
        gcs_score: '', consciousness_level: '', oxygen_delivery: '', iv_access: '', notes: ''
      });
      
      if (onSuccess) onSuccess(response.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška' : 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = darkMode ? 'bg-slate-700 border-slate-600 text-white' : '';
  const labelClass = darkMode ? 'text-slate-300' : 'text-slate-700';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-800 text-white border-slate-700' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500" />
            {language === 'sr' ? 'Unos vitalnih parametara - Transport' : 'Record Vital Signs - Transport'}
          </DialogTitle>
        </DialogHeader>

        <div className={`text-sm p-2 rounded-lg mb-4 ${darkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-800'}`}>
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          {language === 'sr' 
            ? `Pacijent: ${patientName}` 
            : `Patient: ${patientName}`}
        </div>

        <div className="space-y-4">
          {/* Blood Pressure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                <Activity className="w-4 h-4 inline mr-1 text-red-500" />
                {language === 'sr' ? 'Sistolni BP' : 'Systolic BP'} (mmHg)
              </label>
              <Input
                type="number"
                value={formData.systolic_bp}
                onChange={(e) => setFormData({...formData, systolic_bp: e.target.value})}
                placeholder="120"
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                {language === 'sr' ? 'Dijastolni BP' : 'Diastolic BP'} (mmHg)
              </label>
              <Input
                type="number"
                value={formData.diastolic_bp}
                onChange={(e) => setFormData({...formData, diastolic_bp: e.target.value})}
                placeholder="80"
                className={inputClass}
              />
            </div>
          </div>

          {/* Heart Rate & SpO2 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                <Heart className="w-4 h-4 inline mr-1 text-pink-500" />
                {language === 'sr' ? 'Puls' : 'Heart Rate'} (bpm)
              </label>
              <Input
                type="number"
                value={formData.heart_rate}
                onChange={(e) => setFormData({...formData, heart_rate: e.target.value})}
                placeholder="72"
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                <Wind className="w-4 h-4 inline mr-1 text-blue-500" />
                SpO₂ (%)
              </label>
              <Input
                type="number"
                value={formData.oxygen_saturation}
                onChange={(e) => setFormData({...formData, oxygen_saturation: e.target.value})}
                placeholder="98"
                className={inputClass}
              />
            </div>
          </div>

          {/* Respiratory Rate & Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                {language === 'sr' ? 'Respiracija' : 'Resp Rate'} (/min)
              </label>
              <Input
                type="number"
                value={formData.respiratory_rate}
                onChange={(e) => setFormData({...formData, respiratory_rate: e.target.value})}
                placeholder="16"
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                <Thermometer className="w-4 h-4 inline mr-1 text-orange-500" />
                {language === 'sr' ? 'Temperatura' : 'Temperature'} (°C)
              </label>
              <Input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                placeholder="36.6"
                className={inputClass}
              />
            </div>
          </div>

          {/* Blood Glucose & Pain */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                <Droplets className="w-4 h-4 inline mr-1 text-purple-500" />
                {language === 'sr' ? 'Glukoza' : 'Blood Glucose'}
              </label>
              <Input
                type="number"
                value={formData.blood_glucose}
                onChange={(e) => setFormData({...formData, blood_glucose: e.target.value})}
                placeholder="100"
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                {language === 'sr' ? 'Bol (1-10)' : 'Pain (1-10)'}
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.pain_score}
                onChange={(e) => setFormData({...formData, pain_score: e.target.value})}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>

          {/* GCS & Consciousness */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                <Brain className="w-4 h-4 inline mr-1 text-indigo-500" />
                GCS (3-15)
              </label>
              <Input
                type="number"
                min="3"
                max="15"
                value={formData.gcs_score}
                onChange={(e) => setFormData({...formData, gcs_score: e.target.value})}
                placeholder="15"
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                {language === 'sr' ? 'Svest' : 'Consciousness'}
              </label>
              <Select value={formData.consciousness_level} onValueChange={(v) => setFormData({...formData, consciousness_level: v})}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={language === 'sr' ? 'Izaberi' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alert">{language === 'sr' ? 'Budan (A)' : 'Alert (A)'}</SelectItem>
                  <SelectItem value="verbal">{language === 'sr' ? 'Reaguje na glas (V)' : 'Verbal (V)'}</SelectItem>
                  <SelectItem value="pain">{language === 'sr' ? 'Reaguje na bol (P)' : 'Pain (P)'}</SelectItem>
                  <SelectItem value="unresponsive">{language === 'sr' ? 'Ne reaguje (U)' : 'Unresponsive (U)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Oxygen & IV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                {language === 'sr' ? 'Kiseonik' : 'Oxygen Delivery'}
              </label>
              <Select value={formData.oxygen_delivery} onValueChange={(v) => setFormData({...formData, oxygen_delivery: v})}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={language === 'sr' ? 'Izaberi' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room_air">{language === 'sr' ? 'Sobni vazduh' : 'Room Air'}</SelectItem>
                  <SelectItem value="nasal_cannula">{language === 'sr' ? 'Nazalna kanila' : 'Nasal Cannula'}</SelectItem>
                  <SelectItem value="mask">{language === 'sr' ? 'Maska' : 'Mask'}</SelectItem>
                  <SelectItem value="bvm">{language === 'sr' ? 'Balon-maska' : 'BVM'}</SelectItem>
                  <SelectItem value="intubated">{language === 'sr' ? 'Intubiran' : 'Intubated'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
                {language === 'sr' ? 'IV pristup' : 'IV Access'}
              </label>
              <Select value={formData.iv_access} onValueChange={(v) => setFormData({...formData, iv_access: v})}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={language === 'sr' ? 'Izaberi' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{language === 'sr' ? 'Da' : 'Yes'}</SelectItem>
                  <SelectItem value="no">{language === 'sr' ? 'Ne' : 'No'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${labelClass}`}>
              {language === 'sr' ? 'Napomena' : 'Notes'}
            </label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder={language === 'sr' ? 'Dodatne napomene...' : 'Additional notes...'}
              className={inputClass}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {language === 'sr' ? 'Otkaži' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {language === 'sr' ? 'Sačuvaj' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransportVitalsDialog;
