import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { sr } from 'date-fns/locale';
import {
  ClipboardList,
  Plus,
  Search,
  Clock,
  User,
  X,
  Check,
  RefreshCw,
  Tag,
  Trash2,
  AlertCircle
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
  DialogDescription,
} from './ui/dialog';
import { toast } from 'sonner';
import { diagnoses, searchDiagnoses } from '../data/diagnoses';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Category colors for visual grouping
const CATEGORY_COLORS = {
  'Circulatory system': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  'Sistem krvotoka': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  'Respiratory system': { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  'Respiratorni sistem': { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  'Nervous system': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'Nervni sistem': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'Endocrine system': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  'Endokrini sistem': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  'Injuries': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  'Povrede': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  'Burns': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  'Opekotine': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  'Poisoning': { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200' },
  'Trovanja': { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200' },
  'Symptoms': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  'Simptomi': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  'Digestive system': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Digestivni sistem': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Skin': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  'Koža': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  'Allergic reactions': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  'Alergijske reakcije': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  'Mental health': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Mentalno zdravlje': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Urinary system': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Urinarni sistem': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Obstetrics': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  'Akušerstvo': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  'Other': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  'Ostalo': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
};

const DiagnosesManager = ({ patient, language = 'sr', onUpdate }) => {
  const [patientDiagnoses, setPatientDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Fetch patient diagnoses from backend
  const fetchDiagnoses = useCallback(async () => {
    if (!patient?.id) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API}/patients/${patient.id}/diagnoses`);
      setPatientDiagnoses(response.data || []);
    } catch (error) {
      console.error('Error fetching diagnoses:', error);
      setPatientDiagnoses([]);
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    fetchDiagnoses();
  }, [fetchDiagnoses]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter diagnoses based on search query
  const filteredDiagnoses = searchQuery.length >= 2 
    ? searchDiagnoses(searchQuery, language)
    : diagnoses;

  // Check if diagnosis is already added
  const isDiagnosisAdded = (code) => {
    return patientDiagnoses.some(d => d.code === code);
  };

  // Get category colors
  const getCategoryColor = (category) => {
    return CATEGORY_COLORS[category] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
  };

  // Add diagnosis
  const handleAddDiagnosis = async (diagnosis) => {
    if (isDiagnosisAdded(diagnosis.code)) {
      toast.info(language === 'sr' ? 'Dijagnoza je već dodana' : 'Diagnosis already added');
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/patients/${patient.id}/diagnoses`, {
        code: diagnosis.code,
        name_en: diagnosis.name_en,
        name_sr: diagnosis.name_sr,
        category_en: diagnosis.category_en,
        category_sr: diagnosis.category_sr
      });
      
      toast.success(language === 'sr' ? 'Dijagnoza dodana' : 'Diagnosis added');
      setSearchQuery('');
      setShowSuggestions(false);
      fetchDiagnoses();
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri dodavanju' : 'Error adding diagnosis'));
    } finally {
      setSaving(false);
    }
  };

  // Remove diagnosis
  const handleRemoveDiagnosis = async (diagnosisId) => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/patients/${patient.id}/diagnoses/${diagnosisId}`);
      toast.success(language === 'sr' ? 'Dijagnoza uklonjena' : 'Diagnosis removed');
      setDeleteConfirmId(null);
      fetchDiagnoses();
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri uklanjanju' : 'Error removing diagnosis'));
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: sr });
    } catch {
      return dateString;
    }
  };

  if (!patient) return null;

  return (
    <div className="space-y-4" data-testid="diagnoses-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            {language === 'sr' ? 'Dijagnoze' : 'Diagnoses'}
          </h3>
          <p className="text-sm text-slate-500">
            {language === 'sr' ? `${patientDiagnoses.length} evidentiranih dijagnoza` : `${patientDiagnoses.length} recorded diagnoses`}
          </p>
        </div>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setShowAddForm(true)}
          data-testid="add-diagnosis-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          {language === 'sr' ? 'Dodaj dijagnozu' : 'Add Diagnosis'}
        </Button>
      </div>

      {/* Add Diagnosis Form */}
      {showAddForm && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              {language === 'sr' ? 'Pretraži ICD-10 dijagnoze' : 'Search ICD-10 Diagnoses'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="relative" ref={inputRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={language === 'sr' 
                    ? 'Unesite kod, naziv ili ključnu reč...' 
                    : 'Enter code, name, or keyword...'
                  }
                  className="pl-10 bg-white"
                  data-testid="diagnosis-search-input"
                  autoFocus
                />
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div 
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto"
                >
                  {filteredDiagnoses.length > 0 ? (
                    filteredDiagnoses.slice(0, 15).map((diagnosis) => {
                      const isAdded = isDiagnosisAdded(diagnosis.code);
                      const category = language === 'sr' ? diagnosis.category_sr : diagnosis.category_en;
                      const colors = getCategoryColor(category);
                      
                      return (
                        <button
                          key={diagnosis.code}
                          type="button"
                          disabled={isAdded || saving}
                          className={`w-full px-4 py-3 text-left hover:bg-indigo-50 flex flex-col gap-1 border-b border-slate-100 last:border-b-0 ${
                            isAdded ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
                          }`}
                          onClick={() => !isAdded && handleAddDiagnosis(diagnosis)}
                          data-testid={`diagnosis-option-${diagnosis.code}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {diagnosis.code}
                              </Badge>
                              <span className="font-medium text-slate-900">
                                {language === 'sr' ? diagnosis.name_sr : diagnosis.name_en}
                              </span>
                            </div>
                            {isAdded && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                {language === 'sr' ? 'Dodano' : 'Added'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${colors.bg} ${colors.text}`}>
                              <Tag className="w-3 h-3 mr-1" />
                              {category}
                            </Badge>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-6 text-center text-slate-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p>{language === 'sr' ? 'Nema rezultata' : 'No results found'}</p>
                      <p className="text-xs mt-1">
                        {language === 'sr' 
                          ? 'Pokušajte sa drugim terminom' 
                          : 'Try a different search term'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4 relative z-[60]">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
              >
                <X className="w-4 h-4 mr-1" />
                {language === 'sr' ? 'Zatvori' : 'Close'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnoses List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : patientDiagnoses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">
                {language === 'sr' ? 'Nema evidentiranih dijagnoza' : 'No diagnoses recorded'}
              </p>
            </CardContent>
          </Card>
        ) : (
          patientDiagnoses.map((diagnosis) => {
            const category = language === 'sr' ? diagnosis.category_sr : diagnosis.category_en;
            const colors = getCategoryColor(category);
            
            return (
              <Card key={diagnosis.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-sm">
                          {diagnosis.code}
                        </Badge>
                        <span className="font-medium">
                          {language === 'sr' ? diagnosis.name_sr : diagnosis.name_en}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                        <Badge className={`text-xs ${colors.bg} ${colors.text}`}>
                          <Tag className="w-3 h-3 mr-1" />
                          {category}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(diagnosis.added_at)}
                        </span>
                        {diagnosis.added_by_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {diagnosis.added_by_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirmId(diagnosis.id)}
                      data-testid={`remove-diagnosis-${diagnosis.code}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {language === 'sr' ? 'Potvrdi uklanjanje' : 'Confirm Removal'}
            </DialogTitle>
            <DialogDescription>
              {language === 'sr' 
                ? 'Da li ste sigurni da želite da uklonite ovu dijagnozu?' 
                : 'Are you sure you want to remove this diagnosis?'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {language === 'sr' ? 'Otkaži' : 'Cancel'}
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleRemoveDiagnosis(deleteConfirmId)}
              disabled={deleting}
            >
              {deleting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              {language === 'sr' ? 'Ukloni' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiagnosesManager;
