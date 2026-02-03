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

const CriticalAlertsPanel = ({ language = 'sr', darkMode = false, embedded = false }) => {
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
  
  // For embedded mode (in Alerts tab), show even if no alerts
  if (!embedded && alerts.length === 0) return null;

  const unacknowledgedAlerts = alerts.filter(a => !a.is_acknowledged);
  const acknowledgedAlerts = alerts.filter(a => a.is_acknowledged);

  // Embedded mode - full width panel for Alerts tab
  if (embedded) {
    return (
      <div className="space-y-6" data-testid="critical-alerts-embedded">
        {/* Unacknowledged Alerts */}
        <div>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            <AlertTriangle className="w-5 h-5 text-red-500" />
            {language === 'sr' ? 'Aktivna upozorenja' : 'Active Alerts'} ({unacknowledgedAlerts.length})
          </h3>
          
          {unacknowledgedAlerts.length === 0 ? (
            <div className={`p-8 text-center rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <Check className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
              <p className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                {language === 'sr' ? 'Nema aktivnih kritičnih upozorenja' : 'No active critical alerts'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {unacknowledgedAlerts.map(alert => {
                const severityConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.warning;
                
                return (
                  <div 
                    key={alert.id} 
                    className={`p-4 rounded-xl border-2 ${severityConfig.border} ${
                      darkMode ? 'bg-slate-800' : 'bg-white'
                    } ${severityConfig.pulse ? 'animate-pulse-slow' : ''}`}
                    data-testid={`alert-card-${alert.id}`}
                  >
                    {/* Severity Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={`${severityConfig.bg} ${severityConfig.text} text-sm px-3 py-1`}>
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        {severityConfig[`label_${language}`]}
                      </Badge>
                      <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Clock className="w-4 h-4 inline mr-1" />
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Patient Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-sky-900' : 'bg-sky-100'}`}>
                        <Ambulance className={`w-5 h-5 ${darkMode ? 'text-sky-400' : 'text-sky-600'}`} />
                      </div>
                      <div>
                        <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {alert.patient_name}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {language === 'sr' ? 'Transport' : 'Transport'}: {alert.booking_id?.slice(0, 8)}...
                        </p>
                      </div>
                    </div>

                    {/* Alert Details */}
                    <div className="space-y-2 mb-4">
                      {alert.alerts?.map((a, idx) => (
                        <div 
                          key={idx} 
                          className={`text-sm flex items-center gap-2 p-2 rounded-lg ${
                            a.level === 'life_threatening' ? 'bg-red-100 text-red-800' :
                            a.level === 'critical' ? 'bg-orange-100 text-orange-800' :
                            'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {a.type.includes('BP') && <Activity className="w-4 h-4" />}
                          {a.type.includes('HR') && <Heart className="w-4 h-4" />}
                          {a.type.includes('SPO2') && <Wind className="w-4 h-4" />}
                          {a.type.includes('TEMP') && <Thermometer className="w-4 h-4" />}
                          {a.type.includes('GCS') && <Brain className="w-4 h-4" />}
                          <span className="font-medium">{a.message}</span>
                        </div>
                      ))}
                    </div>

                    {/* Recorded by */}
                    <div className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <User className="w-4 h-4 inline mr-1" />
                      {language === 'sr' ? 'Zabeležio' : 'Recorded by'}: {alert.recorded_by}
                    </div>

                    {/* Acknowledge Button */}
                    <Button 
                      size="lg" 
                      onClick={() => handleAcknowledge(alert.id)}
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid={`acknowledge-btn-${alert.id}`}
                    >
                      <Check className="w-5 h-5 mr-2" />
                      {language === 'sr' ? 'Potvrdi upozorenje' : 'Acknowledge Alert'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Acknowledged Alerts History */}
        {acknowledgedAlerts.length > 0 && (
          <div>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              <Check className="w-5 h-5 text-green-500" />
              {language === 'sr' ? 'Potvrđena upozorenja' : 'Acknowledged Alerts'} ({acknowledgedAlerts.length})
            </h3>
            
            <div className={`rounded-xl overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'} border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              {acknowledgedAlerts.slice(0, 10).map((alert, idx) => (
                <div 
                  key={alert.id} 
                  className={`p-3 flex items-center justify-between ${idx > 0 ? (darkMode ? 'border-t border-slate-700' : 'border-t border-slate-100') : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{alert.patient_name}</p>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {alert.alerts?.map(a => a.type).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {new Date(alert.created_at).toLocaleDateString()}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {language === 'sr' ? 'Potvrdio' : 'By'}: {alert.acknowledged_by}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Floating mode - only show if there are unacknowledged alerts (original behavior but repositioned)
  if (unacknowledgedAlerts.length === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-40 w-96 max-h-[60vh] overflow-hidden rounded-xl shadow-2xl border-2 ${
      darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
    }`} data-testid="critical-alerts-floating">
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
    </div>
  );
};

export default CriticalAlertsPanel;
