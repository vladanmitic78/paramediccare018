import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { sr } from 'date-fns/locale';
import {
  Pill,
  Plus,
  Search,
  Clock,
  User,
  FileText,
  Download,
  Calendar,
  Syringe,
  ChevronDown,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Administration routes
const ROUTES = [
  { value: 'oral', label: { sr: 'Oralno', en: 'Oral' } },
  { value: 'IV', label: { sr: 'Intravenski (IV)', en: 'Intravenous (IV)' } },
  { value: 'IM', label: { sr: 'Intramuskularno (IM)', en: 'Intramuscular (IM)' } },
  { value: 'SC', label: { sr: 'Subkutano (SC)', en: 'Subcutaneous (SC)' } },
  { value: 'sublingual', label: { sr: 'Sublingvalno', en: 'Sublingual' } },
  { value: 'topical', label: { sr: 'Lokalno', en: 'Topical' } },
  { value: 'inhalation', label: { sr: 'Inhalacija', en: 'Inhalation' } },
  { value: 'rectal', label: { sr: 'Rektalno', en: 'Rectal' } },
];

// Dosage units
const DOSAGE_UNITS = ['mg', 'g', 'mcg', 'ml', 'IU', 'units'];

const MedicationManager = ({ patient, language = 'sr', onClose }) => {
  const [medications, setMedications] = useState([]);
  const [medicationLibrary, setMedicationLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Allergy warning state
  const [showAllergyWarning, setShowAllergyWarning] = useState(false);
  const [allergyMatch, setAllergyMatch] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    medication_name: '',
    dosage: '',
    dosage_unit: 'mg',
    route: 'oral',
    notes: ''
  });

  // Report state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Check if medication matches any patient allergies
  const checkAllergyMatch = (medicationName) => {
    if (!patient?.allergies || !medicationName) return null;
    
    const medNameLower = medicationName.toLowerCase();
    
    for (const allergy of patient.allergies) {
      const allergenName = (allergy.allergen || allergy).toString().toLowerCase();
      // Check if medication name contains allergen or vice versa
      if (medNameLower.includes(allergenName) || allergenName.includes(medNameLower)) {
        return allergy;
      }
    }
    return null;
  };

  // Handle medication name change with allergy check
  const handleMedicationNameChange = (name) => {
    setForm({ ...form, medication_name: name });
    setShowSuggestions(true);
    
    // Check for allergy match
    const match = checkAllergyMatch(name);
    if (match && name.length >= 3) {
      setAllergyMatch(match);
      setShowAllergyWarning(true);
    }
  };

  // Fetch patient medications
  const fetchMedications = useCallback(async () => {
    if (!patient?.id) return;
    try {
      const response = await axios.get(`${API}/patients/${patient.id}/medications`);
      setMedications(response.data);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  // Fetch medication library
  const fetchLibrary = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/medications/library`);
      setMedicationLibrary(response.data);
    } catch (error) {
      console.error('Error fetching medication library:', error);
    }
  }, []);

  useEffect(() => {
    fetchMedications();
    fetchLibrary();
  }, [fetchMedications, fetchLibrary]);

  // Filter suggestions based on input
  const filteredSuggestions = medicationLibrary.filter(med =>
    med.name.toLowerCase().includes(form.medication_name.toLowerCase())
  ).slice(0, 8);

  // Handle medication selection from dropdown
  const selectMedication = (med) => {
    // Check for allergy before selecting
    const match = checkAllergyMatch(med.name);
    if (match) {
      setAllergyMatch(match);
      setShowAllergyWarning(true);
      setShowSuggestions(false);
      return; // Don't select the medication
    }
    
    setForm({
      ...form,
      medication_name: med.name,
      dosage: med.default_dosage_mg || '',
      dosage_unit: med.dosage_unit || 'mg'
    });
    setShowSuggestions(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.medication_name || !form.dosage) {
      toast.error(language === 'sr' ? 'Unesite ime leka i dozu' : 'Enter medication name and dosage');
      return;
    }

    // Final allergy check before submission
    const match = checkAllergyMatch(form.medication_name);
    if (match) {
      setAllergyMatch(match);
      setShowAllergyWarning(true);
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/patients/${patient.id}/medications`, null, {
        params: {
          medication_name: form.medication_name,
          dosage: parseFloat(form.dosage),
          dosage_unit: form.dosage_unit,
          route: form.route,
          notes: form.notes || null
        }
      });
      
      toast.success(language === 'sr' ? 'Lek evidentiran' : 'Medication recorded');
      setForm({ medication_name: '', dosage: '', dosage_unit: 'mg', route: 'oral', notes: '' });
      setShowAddForm(false);
      fetchMedications();
      fetchLibrary(); // Refresh to get updated usage counts
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error recording medication');
    } finally {
      setSaving(false);
    }
  };

  // Generate PDF report
  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const params = new URLSearchParams();
      params.append('format', 'pdf');
      if (reportFromDate) params.append('from_date', reportFromDate);
      if (reportToDate) params.append('to_date', reportToDate);

      const response = await axios.get(
        `${API}/patients/${patient.id}/report?${params.toString()}`,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `patient_report_${patient.full_name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(language === 'sr' ? 'Izveštaj generisan' : 'Report generated');
      setShowReportDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error generating report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: sr });
    } catch {
      return dateString;
    }
  };

  const getRouteLabel = (route) => {
    const found = ROUTES.find(r => r.value === route);
    return found ? found.label[language] : route;
  };

  if (!patient) return null;

  return (
    <div className="space-y-4" data-testid="medication-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Pill className="w-5 h-5 text-sky-600" />
            {language === 'sr' ? 'Lekovi' : 'Medications'} - {patient.full_name}
          </h3>
          <p className="text-sm text-slate-500">
            {language === 'sr' ? `${medications.length} evidentiranih lekova` : `${medications.length} recorded medications`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-sky-600 hover:bg-sky-700"
            onClick={() => setShowAddForm(true)}
            data-testid="add-medication-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            {language === 'sr' ? 'Dodaj lek' : 'Add Medication'}
          </Button>
        </div>
      </div>

      {/* Add Medication Form */}
      {showAddForm && (
        <Card className="border-sky-200 bg-sky-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Syringe className="w-4 h-4" />
              {language === 'sr' ? 'Evidentiraj dati lek' : 'Record Administered Medication'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Medication Name with Autocomplete */}
              <div className="relative">
                <label className="text-sm font-medium mb-1 block">
                  {language === 'sr' ? 'Ime leka *' : 'Medication Name *'}
                </label>
                <div className="relative">
                  <Input
                    value={form.medication_name}
                    onChange={(e) => handleMedicationNameChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={language === 'sr' ? 'Unesite ili izaberite lek...' : 'Enter or select medication...'}
                    className="pr-10"
                    data-testid="medication-name-input"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                
                {/* Suggestions Dropdown */}
                {showSuggestions && form.medication_name && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-sky-50 flex items-center justify-between"
                        onClick={() => selectMedication(med)}
                      >
                        <span>{med.name}</span>
                        <span className="text-xs text-slate-400">
                          {med.default_dosage_mg && `${med.default_dosage_mg} ${med.dosage_unit}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dosage and Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {language === 'sr' ? 'Doza *' : 'Dosage *'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.dosage}
                    onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                    placeholder="100"
                    data-testid="medication-dosage-input"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {language === 'sr' ? 'Jedinica' : 'Unit'}
                  </label>
                  <Select value={form.dosage_unit} onValueChange={(v) => setForm({ ...form, dosage_unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOSAGE_UNITS.map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Route */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === 'sr' ? 'Put administracije' : 'Administration Route'}
                </label>
                <Select value={form.route} onValueChange={(v) => setForm({ ...form, route: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTES.map(route => (
                      <SelectItem key={route.value} value={route.value}>
                        {route.label[language]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === 'sr' ? 'Napomene' : 'Notes'}
                </label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={language === 'sr' ? 'Dodatne napomene...' : 'Additional notes...'}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  <X className="w-4 h-4 mr-1" />
                  {language === 'sr' ? 'Otkaži' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700"
                  disabled={saving}
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {language === 'sr' ? 'Sačuvaj' : 'Save'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Medications List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
          </div>
        ) : medications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Pill className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">
                {language === 'sr' ? 'Nema evidentiranih lekova' : 'No medications recorded'}
              </p>
            </CardContent>
          </Card>
        ) : (
          medications.map((med) => (
            <Card key={med.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Pill className="w-4 h-4 text-sky-600" />
                      <span className="font-medium">{med.medication_name}</span>
                      <Badge className="bg-sky-100 text-sky-800">
                        {med.dosage} {med.dosage_unit}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getRouteLabel(med.route)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(med.administered_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {med.administered_by_name}
                      </span>
                    </div>
                    {med.notes && (
                      <p className="text-sm text-slate-600 mt-1 italic">&ldquo;{med.notes}&rdquo;</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Generate Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600" />
              {language === 'sr' ? 'Generiši PDF izveštaj' : 'Generate PDF Report'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {language === 'sr' 
                ? 'Izaberite vremenski okvir za izveštaj. Ostavite prazno za sve podatke.'
                : 'Select time range for the report. Leave empty for all data.'}
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === 'sr' ? 'Od datuma' : 'From Date'}
                </label>
                <Input
                  type="date"
                  value={reportFromDate}
                  onChange={(e) => setReportFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {language === 'sr' ? 'Do datuma' : 'To Date'}
                </label>
                <Input
                  type="date"
                  value={reportToDate}
                  onChange={(e) => setReportToDate(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">{language === 'sr' ? 'Izveštaj će sadržati:' : 'Report will include:'}</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                <li>{language === 'sr' ? 'Podaci o pacijentu' : 'Patient information'}</li>
                <li>{language === 'sr' ? 'Istorija vitalnih znakova' : 'Vital signs history'}</li>
                <li>{language === 'sr' ? 'Istorija datih lekova' : 'Medication history'}</li>
                <li>{language === 'sr' ? 'Medicinski pregledi' : 'Medical checks'}</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button 
                className="bg-sky-600 hover:bg-sky-700"
                onClick={generateReport}
                disabled={generatingReport}
              >
                {generatingReport ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {language === 'sr' ? 'Generiši PDF' : 'Generate PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ALLERGY WARNING DIALOG - Big Red Popup */}
      <Dialog open={showAllergyWarning} onOpenChange={setShowAllergyWarning}>
        <DialogContent className="max-w-md border-4 border-red-500 bg-red-50">
          <DialogHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center animate-pulse">
                <ShieldAlert className="w-12 h-12 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl text-red-700">
              {language === 'sr' ? '⚠️ UPOZORENJE NA ALERGIJU!' : '⚠️ ALLERGY WARNING!'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-red-800 mb-2">
                {language === 'sr' 
                  ? 'NIJE DOZVOLJENO DATI OVAJ LEK!'
                  : 'NOT ALLOWED TO GIVE THIS MEDICATION!'}
              </p>
              <p className="text-red-700">
                {language === 'sr' 
                  ? `Pacijent ${patient?.full_name} je ALERGIČAN na:`
                  : `Patient ${patient?.full_name} is ALLERGIC to:`}
              </p>
              <p className="text-2xl font-bold text-red-900 mt-2">
                {allergyMatch?.allergen || allergyMatch}
              </p>
              {allergyMatch?.severity && (
                <Badge className={`mt-2 ${
                  allergyMatch.severity === 'severe' 
                    ? 'bg-red-700 text-white' 
                    : allergyMatch.severity === 'moderate'
                    ? 'bg-orange-600 text-white'
                    : 'bg-yellow-500 text-black'
                }`}>
                  {allergyMatch.severity === 'severe' 
                    ? (language === 'sr' ? 'TEŠKA ALERGIJA' : 'SEVERE ALLERGY')
                    : allergyMatch.severity === 'moderate'
                    ? (language === 'sr' ? 'UMERENA ALERGIJA' : 'MODERATE ALLERGY')
                    : (language === 'sr' ? 'BLAGA ALERGIJA' : 'MILD ALLERGY')}
                </Badge>
              )}
              {allergyMatch?.reaction && (
                <p className="text-sm text-red-600 mt-2">
                  {language === 'sr' ? 'Reakcija: ' : 'Reaction: '}{allergyMatch.reaction}
                </p>
              )}
            </div>
            
            <div className="bg-white border border-red-300 rounded-lg p-3">
              <p className="text-sm text-slate-700 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                {language === 'sr' 
                  ? 'Davanje ovog leka može izazvati ozbiljnu alergijsku reakciju kod pacijenta. Molimo izaberite alternativni lek.'
                  : 'Administering this medication may cause a serious allergic reaction in the patient. Please select an alternative medication.'}
              </p>
            </div>

            <Button 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3"
              onClick={() => {
                setShowAllergyWarning(false);
                setAllergyMatch(null);
                setForm({ ...form, medication_name: '' });
              }}
            >
              {language === 'sr' ? 'RAZUMEM - ZATVORI' : 'I UNDERSTAND - CLOSE'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicationManager;
