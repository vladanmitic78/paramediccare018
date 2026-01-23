import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  AlertTriangle,
  Bell,
  Check,
  Heart,
  Activity,
  Wind,
  Thermometer,
  Brain,
  Clock,
  User,
  Ambulance,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SEVERITY_CONFIG = {
  life_threatening: {
    bg: 'bg-red-600',
    text: 'text-white',
    border: 'border-red-700',
    label_sr: 'ŽIVOTNO UGROŽEN',
    label_en: 'LIFE THREATENING',
    pulse: true
  },
  critical: {
    bg: 'bg-orange-500',
    text: 'text-white',
    border: 'border-orange-600',
    label_sr: 'KRITIČNO',
    label_en: 'CRITICAL',
    pulse: true
  },
  warning: {
    bg: 'bg-amber-500',
    text: 'text-white',
    border: 'border-amber-600',
    label_sr: 'UPOZORENJE',
    label_en: 'WARNING',
    pulse: false
  }
};

const CriticalAlertsPanel = ({ language = 'sr', darkMode = false }) => {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/critical-alerts`);
      setAlerts(response.data.alerts || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    // Poll for new alerts every 10 seconds
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId) => {
    try {
      await axios.put(`${API}/admin/critical-alerts/${alertId}/acknowledge`);
      toast.success(language === 'sr' ? 'Upozorenje potvrđeno' : 'Alert acknowledged');
      fetchAlerts();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  if (loading) return null;
  if (alerts.length === 0) return null;

  const unacknowledgedAlerts = alerts.filter(a => !a.is_acknowledged);

  return (
    <div className={`fixed top-4 right-4 z-50 w-96 max-h-[80vh] overflow-hidden rounded-xl shadow-2xl border-2 ${
      darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
    }`}>
      {/* Header */}
      <div 
        className={`p-3 flex items-center justify-between cursor-pointer ${
          unacknowledgedAlerts.length > 0 ? 'bg-red-600' : darkMode ? 'bg-slate-700' : 'bg-slate-100'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className={`relative ${unacknowledgedAlerts.length > 0 ? 'animate-pulse' : ''}`}>
            <Bell className={`w-5 h-5 ${unacknowledgedAlerts.length > 0 ? 'text-white' : darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-red-600 text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <span className={`font-semibold ${unacknowledgedAlerts.length > 0 ? 'text-white' : darkMode ? 'text-white' : 'text-slate-800'}`}>
            {language === 'sr' ? 'Kritična upozorenja' : 'Critical Alerts'}
          </span>
        </div>
        <Button variant="ghost" size="sm" className={unacknowledgedAlerts.length > 0 ? 'text-white hover:bg-red-700' : ''}>
          {expanded ? '−' : '+'}
        </Button>
      </div>

      {/* Alerts List */}
      {expanded && (
        <div className="max-h-96 overflow-y-auto">
          {unacknowledgedAlerts.length === 0 ? (
            <div className={`p-4 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {language === 'sr' ? 'Nema aktivnih upozorenja' : 'No active alerts'}
            </div>
          ) : (
            unacknowledgedAlerts.map(alert => {
              const severityConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.warning;
              
              return (
                <div 
                  key={alert.id} 
                  className={`p-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} ${
                    severityConfig.pulse ? 'animate-pulse-slow' : ''
                  }`}
                >
                  {/* Severity Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`${severityConfig.bg} ${severityConfig.text}`}>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {severityConfig[`label_${language}`]}
                    </Badge>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Patient Info */}
                  <div className="flex items-center gap-2 mb-2">
                    <Ambulance className={`w-4 h-4 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`} />
                    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {alert.patient_name}
                    </span>
                  </div>

                  {/* Alert Details */}
                  <div className="space-y-1 mb-3">
                    {alert.alerts?.map((a, idx) => (
                      <div 
                        key={idx} 
                        className={`text-sm flex items-center gap-2 p-1.5 rounded ${
                          a.level === 'life_threatening' ? 'bg-red-100 text-red-800' :
                          a.level === 'critical' ? 'bg-orange-100 text-orange-800' :
                          'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {a.type.includes('BP') && <Activity className="w-3 h-3" />}
                        {a.type.includes('HR') && <Heart className="w-3 h-3" />}
                        {a.type.includes('SPO2') && <Wind className="w-3 h-3" />}
                        {a.type.includes('TEMP') && <Thermometer className="w-3 h-3" />}
                        {a.type.includes('GCS') && <Brain className="w-3 h-3" />}
                        <span>{a.message}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recorded by */}
                  <div className={`text-xs mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <User className="w-3 h-3 inline mr-1" />
                    {language === 'sr' ? 'Zabeležio' : 'Recorded by'}: {alert.recorded_by}
                  </div>

                  {/* Acknowledge Button */}
                  <Button 
                    size="sm" 
                    onClick={() => handleAcknowledge(alert.id)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {language === 'sr' ? 'Potvrdi' : 'Acknowledge'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CriticalAlertsPanel;
