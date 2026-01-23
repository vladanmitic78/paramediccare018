import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Area,
  ComposedChart
} from 'recharts';
import { Button } from './ui/button';
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
  TrendingUp,
  Calendar,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';

// Vital signs configuration with normal ranges
const VITAL_CONFIG = {
  blood_pressure: {
    id: 'blood_pressure',
    label_sr: 'Krvni pritisak',
    label_en: 'Blood Pressure',
    unit: 'mmHg',
    icon: Activity,
    color: '#ef4444',
    secondaryColor: '#f97316',
    normalRange: { systolic: { min: 90, max: 120 }, diastolic: { min: 60, max: 80 } },
    warningRange: { systolic: { min: 120, max: 140 }, diastolic: { min: 80, max: 90 } },
    criticalHigh: { systolic: 180, diastolic: 120 },
    criticalLow: { systolic: 90, diastolic: 60 }
  },
  heart_rate: {
    id: 'heart_rate',
    label_sr: 'Puls',
    label_en: 'Heart Rate',
    unit: 'bpm',
    icon: Heart,
    color: '#ec4899',
    normalRange: { min: 60, max: 100 },
    warningRange: { min: 50, max: 110 },
    criticalHigh: 150,
    criticalLow: 40
  },
  oxygen_saturation: {
    id: 'oxygen_saturation',
    label_sr: 'Saturacija kiseonikom',
    label_en: 'Oxygen Saturation',
    unit: '%',
    icon: Wind,
    color: '#3b82f6',
    normalRange: { min: 95, max: 100 },
    warningRange: { min: 90, max: 95 },
    criticalLow: 90
  },
  temperature: {
    id: 'temperature',
    label_sr: 'Temperatura',
    label_en: 'Temperature',
    unit: '°C',
    icon: Thermometer,
    color: '#f59e0b',
    normalRange: { min: 36.1, max: 37.2 },
    warningRange: { min: 37.2, max: 38.0 },
    criticalHigh: 39.5,
    criticalLow: 35.0
  },
  respiratory_rate: {
    id: 'respiratory_rate',
    label_sr: 'Disanje',
    label_en: 'Respiratory Rate',
    unit: '/min',
    icon: Wind,
    color: '#10b981',
    normalRange: { min: 12, max: 20 },
    warningRange: { min: 20, max: 25 },
    criticalHigh: 30,
    criticalLow: 8
  },
  blood_glucose: {
    id: 'blood_glucose',
    label_sr: 'Glukoza u krvi',
    label_en: 'Blood Glucose',
    unit: 'mg/dL',
    icon: Droplets,
    color: '#8b5cf6',
    normalRange: { min: 70, max: 100 },
    warningRange: { min: 100, max: 126 },
    criticalHigh: 200,
    criticalLow: 54
  }
};

// Time range options
const TIME_RANGES = [
  { value: '24h', label_sr: 'Poslednja 24h', label_en: 'Last 24h' },
  { value: '7d', label_sr: 'Poslednjih 7 dana', label_en: 'Last 7 days' },
  { value: '30d', label_sr: 'Poslednjih 30 dana', label_en: 'Last 30 days' },
  { value: 'all', label_sr: 'Svi podaci', label_en: 'All data' }
];

const VitalSignsGraph = ({ 
  vitals = [], 
  patientName = '', 
  language = 'sr',
  darkMode = false 
}) => {
  const [selectedVital, setSelectedVital] = useState('blood_pressure');
  const [timeRange, setTimeRange] = useState('7d');
  const [showNormalRange, setShowNormalRange] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Process vitals data for the chart
  const chartData = useMemo(() => {
    if (!vitals || vitals.length === 0) return [];

    // Filter by time range
    const now = new Date();
    let filteredVitals = [...vitals];
    
    if (timeRange !== 'all') {
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
      filteredVitals = vitals.filter(v => new Date(v.recorded_at) >= cutoff);
    }

    // Sort by date ascending
    filteredVitals.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

    // Format data for chart
    return filteredVitals.map(v => ({
      timestamp: v.recorded_at,
      date: new Date(v.recorded_at).toLocaleDateString(),
      time: new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      datetime: `${new Date(v.recorded_at).toLocaleDateString()} ${new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      systolic_bp: v.systolic_bp,
      diastolic_bp: v.diastolic_bp,
      heart_rate: v.heart_rate,
      oxygen_saturation: v.oxygen_saturation,
      temperature: v.temperature,
      respiratory_rate: v.respiratory_rate,
      blood_glucose: v.blood_glucose,
      notes: v.notes,
      flags: v.flags || [],
      recorded_by: v.recorded_by_name
    }));
  }, [vitals, timeRange]);

  // Get current vital config
  const vitalConfig = VITAL_CONFIG[selectedVital];

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    let values = [];
    if (selectedVital === 'blood_pressure') {
      values = chartData.map(d => d.systolic_bp).filter(v => v != null);
    } else {
      values = chartData.map(d => d[selectedVital]).filter(v => v != null);
    }

    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];

    return { avg: avg.toFixed(1), min, max, latest, count: values.length };
  }, [chartData, selectedVital]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    
    return (
      <div className={`p-3 rounded-lg shadow-lg border ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <p className="font-semibold mb-2">{data.datetime}</p>
        {selectedVital === 'blood_pressure' ? (
          <div className="space-y-1">
            <p className="text-red-500">
              Sistolni: <span className="font-bold">{data.systolic_bp}</span> mmHg
            </p>
            <p className="text-orange-500">
              Dijastolni: <span className="font-bold">{data.diastolic_bp}</span> mmHg
            </p>
          </div>
        ) : (
          <p style={{ color: vitalConfig.color }}>
            {vitalConfig[`label_${language}`]}: <span className="font-bold">{data[selectedVital]}</span> {vitalConfig.unit}
          </p>
        )}
        {data.notes && (
          <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            📝 {data.notes}
          </p>
        )}
        {data.flags && data.flags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.flags.map((flag, idx) => (
              <span key={idx} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                ⚠️ {flag}
              </span>
            ))}
          </div>
        )}
        {data.recorded_by && (
          <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {language === 'sr' ? 'Zabeležio' : 'Recorded by'}: {data.recorded_by}
          </p>
        )}
      </div>
    );
  };

  // Get Y-axis domain based on vital type
  const getYAxisDomain = () => {
    if (selectedVital === 'blood_pressure') {
      return [40, 200];
    }
    if (selectedVital === 'oxygen_saturation') {
      return [80, 100];
    }
    if (selectedVital === 'temperature') {
      return [34, 42];
    }
    if (selectedVital === 'heart_rate') {
      return [30, 180];
    }
    if (selectedVital === 'respiratory_rate') {
      return [0, 40];
    }
    if (selectedVital === 'blood_glucose') {
      return [40, 300];
    }
    return ['auto', 'auto'];
  };

  const textColor = darkMode ? '#e2e8f0' : '#1e293b';
  const gridColor = darkMode ? '#475569' : '#e2e8f0';
  const bgColor = darkMode ? '#1e293b' : '#ffffff';

  return (
    <div className={`rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-sky-900' : 'bg-sky-100'}`}>
            <TrendingUp className={`w-6 h-6 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {language === 'sr' ? 'Grafikon vitalnih parametara' : 'Vital Signs Chart'}
            </h3>
            {patientName && (
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {patientName}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Vital selector */}
          <Select value={selectedVital} onValueChange={setSelectedVital}>
            <SelectTrigger className={`w-48 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VITAL_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }}></div>
                    {config[`label_${language}`]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Time range selector */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className={`w-40 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range[`label_${language}`]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Show normal range toggle */}
          <Button
            variant={showNormalRange ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowNormalRange(!showNormalRange)}
            className={!showNormalRange && darkMode ? 'border-slate-600 text-slate-300' : ''}
          >
            {language === 'sr' ? 'Normalne vrednosti' : 'Normal Range'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {language === 'sr' ? 'Poslednja' : 'Latest'}
            </p>
            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ color: vitalConfig.color }}>
              {stats.latest} <span className="text-sm font-normal">{vitalConfig.unit}</span>
            </p>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {language === 'sr' ? 'Prosek' : 'Average'}
            </p>
            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {stats.avg} <span className="text-sm font-normal">{vitalConfig.unit}</span>
            </p>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {language === 'sr' ? 'Minimum' : 'Min'}
            </p>
            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {stats.min} <span className="text-sm font-normal">{vitalConfig.unit}</span>
            </p>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {language === 'sr' ? 'Maksimum' : 'Max'}
            </p>
            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {stats.max} <span className="text-sm font-normal">{vitalConfig.unit}</span>
            </p>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {language === 'sr' ? 'Merenja' : 'Readings'}
            </p>
            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {stats.count}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="datetime" 
                tick={{ fill: textColor, fontSize: 11 }}
                tickLine={{ stroke: textColor }}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis 
                domain={getYAxisDomain()}
                tick={{ fill: textColor, fontSize: 12 }}
                tickLine={{ stroke: textColor }}
                label={{ 
                  value: vitalConfig.unit, 
                  angle: -90, 
                  position: 'insideLeft',
                  fill: textColor,
                  fontSize: 12
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span style={{ color: textColor }}>{value}</span>}
              />

              {/* Normal range background */}
              {showNormalRange && selectedVital !== 'blood_pressure' && vitalConfig.normalRange && (
                <ReferenceArea
                  y1={vitalConfig.normalRange.min}
                  y2={vitalConfig.normalRange.max}
                  fill="#22c55e"
                  fillOpacity={0.1}
                  stroke="#22c55e"
                  strokeOpacity={0.3}
                />
              )}

              {/* Blood pressure normal ranges */}
              {showNormalRange && selectedVital === 'blood_pressure' && (
                <>
                  <ReferenceArea
                    y1={vitalConfig.normalRange.systolic.min}
                    y2={vitalConfig.normalRange.systolic.max}
                    fill="#22c55e"
                    fillOpacity={0.1}
                  />
                  <ReferenceArea
                    y1={vitalConfig.normalRange.diastolic.min}
                    y2={vitalConfig.normalRange.diastolic.max}
                    fill="#22c55e"
                    fillOpacity={0.1}
                  />
                </>
              )}

              {/* Critical thresholds */}
              {vitalConfig.criticalHigh && selectedVital !== 'blood_pressure' && (
                <ReferenceLine 
                  y={vitalConfig.criticalHigh} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5"
                  label={{ value: language === 'sr' ? 'Kritično visoko' : 'Critical High', fill: '#ef4444', fontSize: 10 }}
                />
              )}
              {vitalConfig.criticalLow && selectedVital !== 'blood_pressure' && (
                <ReferenceLine 
                  y={vitalConfig.criticalLow} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5"
                  label={{ value: language === 'sr' ? 'Kritično nisko' : 'Critical Low', fill: '#ef4444', fontSize: 10 }}
                />
              )}

              {/* Data lines */}
              {selectedVital === 'blood_pressure' ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="systolic_bp"
                    name={language === 'sr' ? 'Sistolni' : 'Systolic'}
                    stroke={vitalConfig.color}
                    strokeWidth={2}
                    dot={{ fill: vitalConfig.color, r: 4 }}
                    activeDot={{ r: 6, fill: vitalConfig.color }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic_bp"
                    name={language === 'sr' ? 'Dijastolni' : 'Diastolic'}
                    stroke={vitalConfig.secondaryColor}
                    strokeWidth={2}
                    dot={{ fill: vitalConfig.secondaryColor, r: 4 }}
                    activeDot={{ r: 6, fill: vitalConfig.secondaryColor }}
                    connectNulls
                  />
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey={selectedVital}
                  name={vitalConfig[`label_${language}`]}
                  stroke={vitalConfig.color}
                  strokeWidth={2}
                  dot={{ fill: vitalConfig.color, r: 4 }}
                  activeDot={{ r: 6, fill: vitalConfig.color }}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className={`h-80 flex items-center justify-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">
              {language === 'sr' ? 'Nema podataka za prikaz' : 'No data to display'}
            </p>
            <p className="text-sm mt-1">
              {language === 'sr' 
                ? 'Zabeležite vitalne parametre da biste videli grafikon' 
                : 'Record vital signs to see the chart'}
            </p>
          </div>
        </div>
      )}

      {/* Legend for normal ranges */}
      {showNormalRange && chartData.length > 0 && (
        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {language === 'sr' ? 'Legenda' : 'Legend'}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500 opacity-20 border border-green-500"></div>
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                {language === 'sr' ? 'Normalan opseg' : 'Normal range'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-red-500" style={{ borderTop: '2px dashed #ef4444' }}></div>
              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                {language === 'sr' ? 'Kritična granica' : 'Critical threshold'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalSignsGraph;
