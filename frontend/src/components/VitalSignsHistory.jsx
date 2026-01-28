import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { sr } from 'date-fns/locale';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Activity,
  Heart,
  Wind,
  Thermometer,
  Droplets,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// Vital signs configuration
const VITAL_CONFIG = {
  systolic_bp: { label_en: 'Systolic BP', label_sr: 'Sistolni', unit: 'mmHg', icon: Activity, color: 'text-red-500' },
  diastolic_bp: { label_en: 'Diastolic BP', label_sr: 'Dijastolni', unit: 'mmHg', icon: Activity, color: 'text-orange-500' },
  heart_rate: { label_en: 'Heart Rate', label_sr: 'Puls', unit: 'bpm', icon: Heart, color: 'text-pink-500' },
  oxygen_saturation: { label_en: 'SpO2', label_sr: 'SpO2', unit: '%', icon: Wind, color: 'text-blue-500' },
  temperature: { label_en: 'Temp', label_sr: 'Temp', unit: '°C', icon: Thermometer, color: 'text-amber-500' },
  respiratory_rate: { label_en: 'RR', label_sr: 'Disanje', unit: '/min', icon: Wind, color: 'text-green-500' },
  blood_glucose: { label_en: 'Glucose', label_sr: 'Glukoza', unit: 'mg/dL', icon: Droplets, color: 'text-purple-500' },
};

const INITIAL_VISIBLE_COUNT = 4;

const VitalSignsHistory = ({ 
  vitals = [], 
  language = 'sr',
  darkMode = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter vitals based on search query
  const filteredVitals = useMemo(() => {
    if (!searchQuery.trim()) return vitals;
    
    const query = searchQuery.toLowerCase();
    return vitals.filter(vital => {
      // Search by date
      const dateStr = vital.recorded_at ? format(new Date(vital.recorded_at), 'dd.MM.yyyy HH:mm') : '';
      if (dateStr.toLowerCase().includes(query)) return true;
      
      // Search by recorded by name
      if (vital.recorded_by_name?.toLowerCase().includes(query)) return true;
      
      // Search by notes
      if (vital.notes?.toLowerCase().includes(query)) return true;
      
      // Search by vital values (e.g., "120" for BP)
      const values = [
        vital.systolic_bp,
        vital.diastolic_bp,
        vital.heart_rate,
        vital.oxygen_saturation,
        vital.temperature,
        vital.respiratory_rate,
        vital.blood_glucose
      ].filter(v => v != null).map(v => String(v));
      
      return values.some(v => v.includes(query));
    });
  }, [vitals, searchQuery]);

  // Get visible vitals based on expand state
  const visibleVitals = isExpanded 
    ? filteredVitals 
    : filteredVitals.slice(0, INITIAL_VISIBLE_COUNT);

  const hasMore = filteredVitals.length > INITIAL_VISIBLE_COUNT;
  const hiddenCount = filteredVitals.length - INITIAL_VISIBLE_COUNT;

  // Format vital value with unit
  const formatVital = (key, value) => {
    if (value == null || value === '') return '-';
    const config = VITAL_CONFIG[key];
    return `${value}${config?.unit || ''}`;
  };

  // Get status color based on value
  const getVitalStatus = (key, value) => {
    if (value == null) return 'normal';
    
    // Define normal ranges
    const ranges = {
      systolic_bp: { low: 90, high: 140 },
      diastolic_bp: { low: 60, high: 90 },
      heart_rate: { low: 60, high: 100 },
      oxygen_saturation: { low: 95, high: 100 },
      temperature: { low: 36.0, high: 37.5 },
      respiratory_rate: { low: 12, high: 20 },
      blood_glucose: { low: 70, high: 140 },
    };
    
    const range = ranges[key];
    if (!range) return 'normal';
    
    if (value < range.low || value > range.high) {
      return value < range.low * 0.8 || value > range.high * 1.3 ? 'critical' : 'warning';
    }
    return 'normal';
  };

  const statusColors = {
    normal: darkMode ? 'bg-slate-700' : 'bg-slate-50',
    warning: darkMode ? 'bg-amber-900/30' : 'bg-amber-50',
    critical: darkMode ? 'bg-red-900/30' : 'bg-red-50',
  };

  const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textClass = darkMode ? 'text-slate-100' : 'text-slate-900';
  const mutedClass = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`rounded-xl border ${cardClass} p-4`} data-testid="vitals-history">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-900' : 'bg-emerald-100'}`}>
            <Activity className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${textClass}`}>
              {language === 'sr' ? 'Istorija vitalnih parametara' : 'Vital Signs History'}
            </h3>
            <p className={`text-sm ${mutedClass}`}>
              {language === 'sr' 
                ? `${filteredVitals.length} merenja` 
                : `${filteredVitals.length} readings`}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedClass}`} />
          <Input
            placeholder={language === 'sr' ? 'Pretraži...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-10 ${darkMode ? 'bg-slate-700 border-slate-600' : ''}`}
            data-testid="vitals-search-input"
          />
        </div>
      </div>

      {/* Vitals List */}
      {filteredVitals.length === 0 ? (
        <div className={`py-8 text-center ${mutedClass}`}>
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">
            {searchQuery 
              ? (language === 'sr' ? 'Nema rezultata pretrage' : 'No search results')
              : (language === 'sr' ? 'Nema evidentiranih merenja' : 'No recorded readings')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleVitals.map((vital, index) => (
            <div
              key={vital.id || index}
              className={`p-4 rounded-lg border ${darkMode ? 'border-slate-600' : 'border-slate-200'} ${
                statusColors[getVitalStatus('systolic_bp', vital.systolic_bp)]
              }`}
            >
              {/* Date and User Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${mutedClass}`} />
                  <span className={`font-medium ${textClass}`}>
                    {vital.recorded_at 
                      ? format(new Date(vital.recorded_at), 'dd.MM.yyyy HH:mm', { locale: sr })
                      : '-'}
                  </span>
                </div>
                {vital.recorded_by_name && (
                  <div className="flex items-center gap-1.5">
                    <User className={`w-3.5 h-3.5 ${mutedClass}`} />
                    <span className={`text-sm ${mutedClass}`}>{vital.recorded_by_name}</span>
                  </div>
                )}
              </div>

              {/* Vitals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {Object.entries(VITAL_CONFIG).map(([key, config]) => {
                  const value = vital[key];
                  const status = getVitalStatus(key, value);
                  const Icon = config.icon;
                  
                  return (
                    <div 
                      key={key}
                      className={`p-2 rounded-md ${darkMode ? 'bg-slate-900/50' : 'bg-white'} ${
                        status === 'warning' ? 'ring-1 ring-amber-400' : 
                        status === 'critical' ? 'ring-1 ring-red-400' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Icon className={`w-3 h-3 ${config.color}`} />
                        <span className={`text-xs ${mutedClass}`}>
                          {config[`label_${language}`]}
                        </span>
                      </div>
                      <p className={`font-semibold ${textClass} ${
                        status === 'warning' ? 'text-amber-500' :
                        status === 'critical' ? 'text-red-500' : ''
                      }`}>
                        {formatVital(key, value)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              {vital.notes && (
                <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                  <p className={`text-sm ${mutedClass}`}>
                    <span className="font-medium">{language === 'sr' ? 'Napomena:' : 'Notes:'}</span> {vital.notes}
                  </p>
                </div>
              )}

              {/* Flags */}
              {vital.flags && vital.flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {vital.flags.map((flag, idx) => (
                    <Badge key={idx} variant="destructive" className="text-xs">
                      ⚠️ {flag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expand/Collapse Button */}
      {hasMore && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full gap-2 ${darkMode ? 'text-slate-300 hover:text-white' : ''}`}
            data-testid="vitals-expand-btn"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {language === 'sr' ? 'Prikaži manje' : 'Show less'}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {language === 'sr' 
                  ? `Prikaži još ${hiddenCount} merenja` 
                  : `Show ${hiddenCount} more readings`}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VitalSignsHistory;
