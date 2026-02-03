/**
 * DoctorDecisionPanel - Allows doctors to send live instructions to drivers/nurses
 * during active transports
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Stethoscope,
  AlertTriangle,
  Send,
  Check,
  Clock,
  User,
  Pill,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Bell,
  Truck,
  Activity
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const priorityColors = {
  low: 'bg-slate-100 text-slate-700 border-slate-300',
  normal: 'bg-blue-100 text-blue-700 border-blue-300',
  high: 'bg-amber-100 text-amber-700 border-amber-300',
  urgent: 'bg-red-100 text-red-700 border-red-300 animate-pulse'
};

const priorityLabels = {
  low: { sr: 'Nizak', en: 'Low' },
  normal: { sr: 'Normalan', en: 'Normal' },
  high: { sr: 'Visok', en: 'High' },
  urgent: { sr: 'HITNO', en: 'URGENT' }
};

const decisionTypes = [
  { value: 'instruction', label: { sr: 'Instrukcija', en: 'Instruction' }, icon: MessageSquare },
  { value: 'medication_order', label: { sr: 'Nalog za lek', en: 'Medication Order' }, icon: Pill },
  { value: 'alert', label: { sr: 'Upozorenje', en: 'Alert' }, icon: AlertTriangle },
  { value: 'status_change', label: { sr: 'Promena statusa', en: 'Status Change' }, icon: Activity }
];

const DoctorDecisionPanel = ({ language = 'sr', bookingId = null, patientName = null, onClose = null }) => {
  const [activeTransports, setActiveTransports] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(bookingId);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [decisionType, setDecisionType] = useState('instruction');
  const [instruction, setInstruction] = useState('');
  const [priority, setPriority] = useState('normal');
  const [targetRole, setTargetRole] = useState('all');
  const [medicationName, setMedicationName] = useState('');
  const [medicationDosage, setMedicationDosage] = useState('');
  const [medicationRoute, setMedicationRoute] = useState('');

  useEffect(() => {
    fetchActiveTransports();
    if (selectedBooking) {
      fetchDecisions(selectedBooking);
    }
  }, [selectedBooking]);

  const fetchActiveTransports = async () => {
    try {
      const response = await axios.get(`${API}/api/medical/dashboard`);
      setActiveTransports(response.data.active_transports || []);
    } catch (error) {
      console.error('Error fetching transports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecisions = async (bookingId) => {
    try {
      const response = await axios.get(`${API}/api/medical/decisions/${bookingId}`);
      setDecisions(response.data || []);
    } catch (error) {
      console.error('Error fetching decisions:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBooking) {
      toast.error(language === 'sr' ? 'Izaberite transport' : 'Select a transport');
      return;
    }
    
    if (!instruction && decisionType !== 'medication_order') {
      toast.error(language === 'sr' ? 'Unesite instrukciju' : 'Enter instruction');
      return;
    }

    setSending(true);
    try {
      const payload = {
        booking_id: selectedBooking,
        decision_type: decisionType,
        instruction: instruction || null,
        priority,
        target_role: targetRole === 'all' ? null : targetRole
      };

      if (decisionType === 'medication_order') {
        payload.medication_name = medicationName;
        payload.medication_dosage = medicationDosage;
        payload.medication_route = medicationRoute;
        payload.instruction = `${medicationName} ${medicationDosage} (${medicationRoute})`;
      }

      await axios.post(`${API}/api/medical/decisions`, payload);
      
      toast.success(language === 'sr' ? 'Odluka poslata!' : 'Decision sent!');
      
      // Reset form
      setInstruction('');
      setMedicationName('');
      setMedicationDosage('');
      setMedicationRoute('');
      setShowForm(false);
      
      // Refresh decisions
      fetchDecisions(selectedBooking);
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri slanju' : 'Error sending'));
    } finally {
      setSending(false);
    }
  };

  const handleAcknowledge = async (decisionId) => {
    try {
      await axios.put(`${API}/api/medical/decisions/${decisionId}/acknowledge`);
      fetchDecisions(selectedBooking);
      toast.success(language === 'sr' ? 'Potvrđeno' : 'Acknowledged');
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  const handleExecute = async (decisionId) => {
    try {
      await axios.put(`${API}/api/medical/decisions/${decisionId}/execute`);
      fetchDecisions(selectedBooking);
      toast.success(language === 'sr' ? 'Izvršeno' : 'Executed');
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  const handleCancel = async (decisionId) => {
    try {
      await axios.put(`${API}/api/medical/decisions/${decisionId}/cancel`);
      fetchDecisions(selectedBooking);
      toast.success(language === 'sr' ? 'Otkazano' : 'Cancelled');
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  const selectedTransport = activeTransports.find(t => t.id === selectedBooking);

  return (
    <div className="space-y-4" data-testid="doctor-decision-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Stethoscope className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {language === 'sr' ? 'Panel za odluke doktora' : 'Doctor Decision Panel'}
            </h2>
            <p className="text-sm text-slate-500">
              {language === 'sr' 
                ? 'Pošaljite instrukcije timu u realnom vremenu' 
                : 'Send real-time instructions to the team'}
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Transport Selection */}
      {!bookingId && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4" />
              {language === 'sr' ? 'Aktivni transporti' : 'Active Transports'}
              <Badge variant="secondary">{activeTransports.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
            ) : activeTransports.length === 0 ? (
              <p className="text-center text-slate-500 py-4">
                {language === 'sr' ? 'Nema aktivnih transporta' : 'No active transports'}
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeTransports.map(transport => (
                  <button
                    key={transport.id}
                    onClick={() => setSelectedBooking(transport.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedBooking === transport.id 
                        ? 'bg-purple-100 border-2 border-purple-500' 
                        : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                    }`}
                  >
                    <p className="font-medium">{transport.patient_name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {transport.start_point || transport.pickup_address} → {transport.end_point || transport.destination_address}
                    </p>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {transport.status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Transport Info */}
      {selectedTransport && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{selectedTransport.patient_name}</p>
                <p className="text-sm text-slate-600">
                  {selectedTransport.start_point || selectedTransport.pickup_address}
                </p>
              </div>
              <Badge>{selectedTransport.status}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Decision Form */}
      {selectedBooking && (
        <Card>
          <CardHeader className="py-3 cursor-pointer" onClick={() => setShowForm(!showForm)}>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                {language === 'sr' ? 'Nova odluka/instrukcija' : 'New Decision/Instruction'}
              </span>
              {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
          
          {showForm && (
            <CardContent className="space-y-4 pt-0">
              {/* Decision Type */}
              <div className="grid grid-cols-2 gap-2">
                {decisionTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setDecisionType(type.value)}
                      className={`p-3 rounded-lg border-2 flex items-center gap-2 transition-all ${
                        decisionType === type.value 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{type.label[language]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Priority */}
              <div>
                <Label>{language === 'sr' ? 'Prioritet' : 'Priority'}</Label>
                <div className="flex gap-2 mt-1">
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setPriority(key)}
                      className={`px-3 py-1 rounded-full text-sm border ${
                        priority === key ? priorityColors[key] : 'bg-white border-slate-200'
                      }`}
                    >
                      {label[language]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Role */}
              <div>
                <Label>{language === 'sr' ? 'Primaoci' : 'Recipients'}</Label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'sr' ? 'Svi' : 'All'}</SelectItem>
                    <SelectItem value="driver">{language === 'sr' ? 'Samo vozač' : 'Driver only'}</SelectItem>
                    <SelectItem value="nurse">{language === 'sr' ? 'Samo sestra' : 'Nurse only'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Medication Fields */}
              {decisionType === 'medication_order' && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{language === 'sr' ? 'Naziv leka' : 'Medication'}</Label>
                      <Input
                        value={medicationName}
                        onChange={e => setMedicationName(e.target.value)}
                        placeholder="e.g., Diazepam"
                      />
                    </div>
                    <div>
                      <Label>{language === 'sr' ? 'Doza' : 'Dosage'}</Label>
                      <Input
                        value={medicationDosage}
                        onChange={e => setMedicationDosage(e.target.value)}
                        placeholder="e.g., 5mg"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{language === 'sr' ? 'Način primene' : 'Route'}</Label>
                    <Select value={medicationRoute} onValueChange={setMedicationRoute}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'sr' ? 'Izaberite...' : 'Select...'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iv">IV (Intravenozno)</SelectItem>
                        <SelectItem value="im">IM (Intramuskularno)</SelectItem>
                        <SelectItem value="oral">{language === 'sr' ? 'Oralno' : 'Oral'}</SelectItem>
                        <SelectItem value="sublingual">Sublingvalno</SelectItem>
                        <SelectItem value="inhalation">{language === 'sr' ? 'Inhalacija' : 'Inhalation'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Instruction Text */}
              <div>
                <Label>{language === 'sr' ? 'Instrukcija/Napomena' : 'Instruction/Note'}</Label>
                <Textarea
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  placeholder={language === 'sr' ? 'Unesite instrukciju...' : 'Enter instruction...'}
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={handleSubmit}
                disabled={sending}
              >
                {sending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {language === 'sr' ? 'Pošalji odluku' : 'Send Decision'}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Existing Decisions */}
      {selectedBooking && decisions.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {language === 'sr' ? 'Poslate odluke' : 'Sent Decisions'}
              <Badge variant="secondary">{decisions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 space-y-2 max-h-64 overflow-y-auto">
            {decisions.map(decision => (
              <div 
                key={decision.id}
                className={`p-3 rounded-lg border-l-4 ${
                  decision.status === 'active' 
                    ? `border-l-purple-500 bg-purple-50 ${decision.priority === 'urgent' ? 'animate-pulse' : ''}` 
                    : decision.status === 'completed'
                    ? 'border-l-emerald-500 bg-emerald-50'
                    : 'border-l-slate-300 bg-slate-50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={priorityColors[decision.priority]} variant="outline">
                        {priorityLabels[decision.priority]?.[language]}
                      </Badge>
                      <Badge variant="outline">{decision.decision_type}</Badge>
                      {decision.target_role && (
                        <Badge variant="secondary" className="text-[10px]">
                          → {decision.target_role}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{decision.instruction}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <User className="w-3 h-3" />
                      {decision.created_by_name}
                      <Clock className="w-3 h-3 ml-2" />
                      {new Date(decision.created_at).toLocaleTimeString()}
                    </div>
                    
                    {/* Acknowledged by */}
                    {decision.acknowledged_by?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {decision.acknowledged_by.map((ack, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px] bg-blue-50">
                            <Check className="w-2 h-2 mr-1" />
                            {ack.user_name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  {decision.status === 'active' && (
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 px-2"
                        onClick={() => handleAcknowledge(decision.id)}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleExecute(decision.id)}
                      >
                        <Activity className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="h-7 px-2"
                        onClick={() => handleCancel(decision.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {decision.executed && (
                  <div className="mt-2 p-2 bg-emerald-100 rounded text-xs">
                    <Check className="w-3 h-3 inline mr-1 text-emerald-600" />
                    {language === 'sr' ? 'Izvršeno od' : 'Executed by'}: {decision.executed_by_name}
                    {decision.execution_notes && ` - ${decision.execution_notes}`}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DoctorDecisionPanel;
