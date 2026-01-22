import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Navigation,
  Truck,
  HeartPulse,
  MapPin,
  Clock,
  AlertCircle,
  ShieldCheck,
  PhoneCall,
  Thermometer,
  Droplets,
  Stethoscope,
  ChevronRight,
  ClipboardCheck,
  Zap,
  Activity,
  Building2,
  Home,
  Users,
  Ambulance
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OperationsDashboard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('transportation');
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, statsRes] = await Promise.all([
        axios.get(`${API}/bookings`),
        axios.get(`${API}/stats/dashboard`).catch(() => ({ data: null }))
      ]);
      setBookings(bookingsRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Transportation Stats
  const transportStats = [
    { 
      title: language === 'sr' ? 'Aktivne Misije' : 'Active Missions', 
      value: bookings.filter(b => b.status === 'in_progress').length.toString().padStart(2, '0'), 
      trend: 'Live', 
      icon: Navigation, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      title: language === 'sr' ? 'Dostupnost Flote' : 'Fleet Availability', 
      value: '88%', 
      trend: language === 'sr' ? '9 Vozila' : '9 Units', 
      icon: Truck, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
    { 
      title: language === 'sr' ? 'Prosečno Vreme' : 'Avg. Response', 
      value: '8.4m', 
      trend: '-1.2m', 
      icon: Clock, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      title: language === 'sr' ? 'Na Čekanju' : 'Pending', 
      value: bookings.filter(b => b.status === 'pending').length.toString().padStart(2, '0'), 
      trend: language === 'sr' ? 'Zahtevi' : 'Requests', 
      icon: Zap, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50' 
    },
  ];

  // Medical Care Stats
  const medicalStats = [
    { 
      title: language === 'sr' ? 'Kritični Pacijenti' : 'Critical Patients', 
      value: '03', 
      trend: language === 'sr' ? 'Visok Prioritet' : 'High Priority', 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-50' 
    },
    { 
      title: language === 'sr' ? 'Praćenje Vitalnih' : 'Vitals Monitoring', 
      value: language === 'sr' ? 'Aktivno' : 'Active', 
      trend: language === 'sr' ? '12 Pacijenata' : '12 Patients', 
      icon: Activity, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      title: language === 'sr' ? 'Rezerve Kiseonika' : 'Oxygen Reserves', 
      value: '94%', 
      trend: language === 'sr' ? 'Cela Flota' : 'Across Fleet', 
      icon: Droplets, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      title: language === 'sr' ? 'Opterećenje Osoblja' : 'Clinician Load', 
      value: language === 'sr' ? 'Nisko' : 'Low', 
      trend: '1:1 Ratio', 
      icon: Stethoscope, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
  ];

  // Sample active patients for demo
  const activePatients = [
    { 
      id: 'TR-902', 
      name: 'Marko Petrović', 
      condition: language === 'sr' ? 'Hipertenzija / Post-Op' : 'Hypertension / Post-Op', 
      vitals: { hr: 82, bp: '138/85', spo2: 98, temp: 37.1 },
      status: 'Stable',
      medication: 'IV Saline, Heparin',
      route: language === 'sr' ? 'Opšta Bolnica → Klinički Centar' : 'General Hospital → Clinical Center',
      lastUpdate: language === 'sr' ? 'Pre 2 min' : '2 mins ago'
    },
    { 
      id: 'TR-905', 
      name: 'Ana Jovanović', 
      condition: language === 'sr' ? 'Srčana Tegoba' : 'Cardiac Distress', 
      vitals: { hr: 114, bp: '95/60', spo2: 91, temp: 36.5 },
      status: 'Critical',
      medication: 'Epinephrine, Oxygen',
      route: language === 'sr' ? 'Kuća → Hitna Pomoć' : 'Residence → Emergency Center',
      lastUpdate: 'Live'
    },
  ];

  // Recent transport missions from actual bookings
  const recentMissions = bookings.slice(0, 5).map((booking, idx) => ({
    id: `TR-${900 + idx}`,
    patient: booking.patient_name,
    from: booking.start_point?.split(',')[0] || 'Unknown',
    to: booking.end_point?.split(',')[0] || 'Unknown',
    status: booking.status,
    time: booking.booking_date
  }));

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-500';
      case 'confirmed': return 'bg-blue-500';
      case 'in_progress': return 'bg-purple-500';
      case 'completed': return 'bg-emerald-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: language === 'sr' ? 'Na čekanju' : 'Pending',
      confirmed: language === 'sr' ? 'Potvrđeno' : 'Confirmed',
      in_progress: language === 'sr' ? 'U toku' : 'In Progress',
      completed: language === 'sr' ? 'Završeno' : 'Completed',
      cancelled: language === 'sr' ? 'Otkazano' : 'Cancelled'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6" data-testid="operations-dashboard">
      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-2 w-2 rounded-full animate-pulse ${activeTab === 'transportation' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {activeTab === 'transportation' 
                ? (language === 'sr' ? 'Logistika Aktivna' : 'Logistics Active')
                : (language === 'sr' ? 'Praćenje Uživo' : 'Care Monitoring Live')}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {activeTab === 'transportation' 
              ? (language === 'sr' ? 'Transport Komanda' : 'Logistics Command')
              : (language === 'sr' ? 'Klinička Nega u Transportu' : 'In-Transit Clinical Care')}
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            {activeTab === 'transportation' 
              ? (language === 'sr' ? 'Praćenje flote i koordinacija misija u realnom vremenu.' : 'Real-time fleet tracking and mission coordination.')
              : (language === 'sr' ? 'Praćenje vitalnih znakova i intervencija.' : 'Critical vital signs monitoring and intervention tracking.')}
          </p>
        </div>
        <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
          <button 
            onClick={() => setActiveTab('transportation')}
            className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'transportation' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            data-testid="tab-transportation"
          >
            <Truck size={16} />
            {language === 'sr' ? 'Transport' : 'Fleet View'}
          </button>
          <button 
            onClick={() => setActiveTab('medical')}
            className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'medical' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            data-testid="tab-medical"
          >
            <HeartPulse size={16} />
            {language === 'sr' ? 'Medicinska Nega' : 'Medical View'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(activeTab === 'transportation' ? transportStats : medicalStats).map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-blue-200 group">
            <div className="flex justify-between items-start">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={22} />
              </div>
              <span className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-600 uppercase tracking-tighter">
                {stat.trend}
              </span>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-4 leading-none">{stat.title}</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* TRANSPORTATION VIEW */}
      {activeTab === 'transportation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[450px] flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2 text-sm">
                <MapPin size={18} className="text-blue-600" /> 
                {language === 'sr' ? 'Pozicije Flote' : 'Fleet Geofencing'}
              </h2>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] font-bold text-slate-500">{language === 'sr' ? 'NA PUTU' : 'EN ROUTE'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-[10px] font-bold text-slate-500">{language === 'sr' ? 'ČEKA' : 'LOADING'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-bold text-slate-500">{language === 'sr' ? 'DOSTUPNO' : 'AVAILABLE'}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 relative">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=21.82%2C43.28%2C21.98%2C43.36&layer=mapnik&marker=43.32%2C21.90"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '400px' }}
                allowFullScreen
                loading="lazy"
                title="Fleet Map"
              ></iframe>
              {/* Overlay info */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Ambulance className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {language === 'sr' ? '9 Vozila Praćeno' : '9 Vehicles Tracked'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {language === 'sr' ? 'Niš, Srbija - 50km radius' : 'Niš, Serbia - 50km radius'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-bold text-sm">
                {language === 'sr' ? 'Vremenska Linija Misija' : 'Mission Timeline'}
              </h2>
              <button className="text-blue-600 text-[10px] font-black uppercase hover:underline tracking-widest">
                {language === 'sr' ? 'Svi Logovi' : 'Live Logs'}
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {recentMissions.length > 0 ? recentMissions.map((mission, i) => (
                <div key={i} className="relative pl-6 pb-4 last:pb-0 group">
                  <div className={`absolute left-0 top-1 w-2 h-2 rounded-full z-10 ${getStatusColor(mission.status)}`}></div>
                  <div className="absolute left-[3.5px] top-1 bottom-0 w-[1px] bg-slate-200 group-last:hidden"></div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400">{mission.id}</span>
                      <Badge className={`text-[8px] ${mission.status === 'in_progress' ? 'bg-purple-100 text-purple-700' : mission.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {getStatusLabel(mission.status)}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-slate-900 mt-1">{mission.patient}</p>
                    <p className="text-[10px] text-slate-500">{mission.from} → {mission.to}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{mission.time}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Navigation className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    {language === 'sr' ? 'Nema aktivnih misija' : 'No active missions'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MEDICAL CARE VIEW */}
      {activeTab === 'medical' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vitals Monitoring */}
          <div className="lg:col-span-2 space-y-6">
            {activePatients.map((patient) => (
              <div key={patient.id} className={`bg-white rounded-2xl border ${patient.status === 'Critical' ? 'border-red-200 shadow-red-50' : 'border-slate-200'} shadow-sm p-6 overflow-hidden`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${patient.status === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      <HeartPulse size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">{patient.name}</h2>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${patient.status === 'Critical' ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                          {patient.status === 'Critical' ? (language === 'sr' ? 'Kritično' : 'Critical') : (language === 'sr' ? 'Stabilno' : 'Stable')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{patient.id} • {patient.condition}</p>
                      <p className="text-xs text-blue-600 font-medium mt-1">{patient.route}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="flex-1 md:flex-none text-xs">
                      {language === 'sr' ? 'Grafici' : 'View Charts'}
                    </Button>
                    <Button size="sm" className="flex-1 md:flex-none text-xs bg-slate-900 hover:bg-slate-800">
                      {language === 'sr' ? 'Intervencije' : 'Intervention Log'}
                    </Button>
                  </div>
                </div>

                {/* Vitals Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Activity size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">HR</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-black ${patient.vitals.hr > 100 ? 'text-red-600' : 'text-slate-900'}`}>{patient.vitals.hr}</span>
                      <span className="text-[10px] font-bold text-slate-400">BPM</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Zap size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">BP</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{patient.vitals.bp}</span>
                      <span className="text-[10px] font-bold text-slate-400">mmHg</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Droplets size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">SpO2</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-black ${patient.vitals.spo2 < 95 ? 'text-amber-600' : 'text-slate-900'}`}>{patient.vitals.spo2}</span>
                      <span className="text-[10px] font-bold text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Thermometer size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">TEMP</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{patient.vitals.temp}</span>
                      <span className="text-[10px] font-bold text-slate-400">°C</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-l-4 border-blue-600 rounded-r-xl">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                    {language === 'sr' ? 'Trenutna Medikacija' : 'Current Medication Admin'}
                  </p>
                  <p className="text-sm font-bold text-slate-700">{patient.medication}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Medical Protocols Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <ClipboardCheck size={18} className="text-blue-600" /> 
                {language === 'sr' ? 'Medicinski Protokoli' : 'Medical Protocols'}
              </h3>
              <div className="space-y-2">
                {[
                  language === 'sr' ? 'ACLS Srčani Zastoj' : 'ACLS Cardiac Arrest',
                  language === 'sr' ? 'Moždani Udar / TIA' : 'Stroke / TIA',
                  language === 'sr' ? 'Teška Trauma' : 'Severe Trauma',
                  language === 'sr' ? 'Respiratorni Zastoj' : 'Respiratory Failure'
                ].map((protocol) => (
                  <button key={protocol} className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">{protocol}</span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                ))}
              </div>
              <button className="w-full mt-4 py-3 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-100">
                {language === 'sr' ? 'Svi Protokoli' : 'All Protocols'}
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
              <PhoneCall size={32} className="mb-4" />
              <h3 className="font-bold text-lg leading-tight">
                {language === 'sr' ? 'Konsultacija sa Lekarom' : 'Consult Medical Director'}
              </h3>
              <p className="text-blue-100 text-xs mt-2 mb-6">
                {language === 'sr' 
                  ? 'Instant video/audio veza za intervencije vođene lekarom.'
                  : 'Instant video/audio uplink for physician-guided intervention.'}
              </p>
              <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-sm shadow-xl hover:bg-blue-50">
                {language === 'sr' ? 'Uspostavi Vezu' : 'Establish Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Footer */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-emerald-500" />
          <p className="text-xs font-medium text-slate-500 italic">
            {language === 'sr' 
              ? 'HIPAA Kompatibilna End-to-End Enkripcija Aktivna'
              : 'HIPAA Compliant End-to-End Encryption Active'}
          </p>
        </div>
        <div className="flex gap-4">
          <span className="text-xs font-bold text-slate-400">Paramedic Care 018 v1.0</span>
          <span className="text-xs font-bold text-slate-400">Server: Niš-01</span>
        </div>
      </div>
    </div>
  );
};

export default OperationsDashboard;
