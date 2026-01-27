import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  Clock, 
  RefreshCw,
  Wifi,
  WifiOff,
  Navigation,
  Circle
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Custom driver marker icons based on status
const createDriverIcon = (status) => {
  const colors = {
    offline: '#64748b',
    available: '#22c55e',
    assigned: '#3b82f6',
    en_route: '#a855f7',
    on_site: '#f59e0b',
    transporting: '#ef4444'
  };
  
  const color = colors[status] || colors.offline;
  
  return L.divIcon({
    className: 'custom-driver-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

// Component to fit map bounds to markers
const FitBounds = ({ drivers }) => {
  const map = useMap();
  
  useEffect(() => {
    if (drivers.length > 0) {
      const validDrivers = drivers.filter(d => d.last_location?.latitude && d.last_location?.longitude);
      if (validDrivers.length > 0) {
        const bounds = L.latLngBounds(
          validDrivers.map(d => [d.last_location.latitude, d.last_location.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [drivers, map]);
  
  return null;
};

// Component to focus map on selected driver
const FocusOnDriver = ({ driver, onFocused }) => {
  const map = useMap();
  
  useEffect(() => {
    if (driver?.last_location?.latitude && driver?.last_location?.longitude) {
      map.flyTo(
        [driver.last_location.latitude, driver.last_location.longitude],
        16, // Zoom level
        { duration: 1 } // Animation duration in seconds
      );
      // Open the popup for this driver
      if (onFocused) {
        setTimeout(() => onFocused(), 1000);
      }
    }
  }, [driver, map, onFocused]);
  
  return null;
};

const AdminLiveMap = () => {
  const { language } = useLanguage();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const markerRefs = useRef({});

  // Status labels
  const statusLabels = {
    offline: { sr: 'Van mreže', en: 'Offline', color: 'bg-slate-500' },
    available: { sr: 'Dostupan', en: 'Available', color: 'bg-green-500' },
    assigned: { sr: 'Dodeljen', en: 'Assigned', color: 'bg-blue-500' },
    en_route: { sr: 'Na putu', en: 'En Route', color: 'bg-purple-500' },
    on_site: { sr: 'Na lokaciji', en: 'On Site', color: 'bg-amber-500' },
    transporting: { sr: 'U transportu', en: 'Transporting', color: 'bg-red-500' }
  };

  // Fetch all drivers
  const fetchDrivers = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/admin/drivers`);
      setDrivers(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect to WebSocket for real-time updates
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = API.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/ws/admin/live-map`);

    ws.onopen = () => {
      console.log('Admin Live Map WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'location_update') {
          setDrivers(prev => {
            const updated = [...prev];
            const index = updated.findIndex(d => d.id === data.driver_id);
            
            if (index >= 0) {
              updated[index] = {
                ...updated[index],
                last_location: data.location,
                driver_status: data.status,
                current_booking_id: data.booking_id
              };
            }
            return updated;
          });
          setLastUpdate(new Date());
        } else if (data.type === 'driver_status_update') {
          setDrivers(prev => {
            const updated = [...prev];
            const index = updated.findIndex(d => d.id === data.driver_id);
            
            if (index >= 0) {
              updated[index] = {
                ...updated[index],
                driver_status: data.status
              };
            }
            return updated;
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Admin Live Map WebSocket disconnected');
      setWsConnected(false);
      
      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, []);

  // Initial load
  useEffect(() => {
    fetchDrivers();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchDrivers, connectWebSocket]);

  // Handle driver card click - focus on driver's location
  const handleDriverClick = (driver) => {
    if (driver.last_location?.latitude && driver.last_location?.longitude) {
      setSelectedDriver(driver);
    }
  };

  // Open marker popup after map flies to driver
  const openDriverPopup = () => {
    if (selectedDriver && markerRefs.current[selectedDriver.id]) {
      markerRefs.current[selectedDriver.id].openPopup();
    }
  };

  // Get active drivers count
  const activeDrivers = drivers.filter(d => d.driver_status !== 'offline');
  const driversWithLocation = drivers.filter(d => d.last_location?.latitude);

  // Default center (Niš, Serbia)
  const defaultCenter = [43.3209, 21.8958];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-live-map">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {language === 'sr' ? 'Praćenje vozila uživo' : 'Live Vehicle Tracking'}
          </h2>
          <p className="text-sm text-slate-500">
            {language === 'sr' 
              ? `${activeDrivers.length} aktivnih vozača • ${driversWithLocation.length} sa GPS lokacijom`
              : `${activeDrivers.length} active drivers • ${driversWithLocation.length} with GPS location`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {wsConnected 
              ? (language === 'sr' ? 'Uživo' : 'Live')
              : (language === 'sr' ? 'Nije povezano' : 'Disconnected')}
          </div>
          
          {/* Refresh button */}
          <Button variant="outline" size="sm" onClick={fetchDrivers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'sr' ? 'Osveži' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: '500px' }}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {driversWithLocation.length > 0 && !selectedDriver && <FitBounds drivers={driversWithLocation} />}
          
          {selectedDriver && (
            <FocusOnDriver driver={selectedDriver} onFocused={openDriverPopup} />
          )}
          
          {driversWithLocation.map(driver => (
            <Marker
              key={driver.id}
              position={[driver.last_location.latitude, driver.last_location.longitude]}
              icon={createDriverIcon(driver.driver_status)}
              ref={(ref) => { markerRefs.current[driver.id] = ref; }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold">{driver.full_name}</span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Circle className={`w-3 h-3 ${statusLabels[driver.driver_status]?.color || 'bg-slate-500'}`} style={{ fill: 'currentColor' }} />
                      <span>{statusLabels[driver.driver_status]?.[language] || driver.driver_status}</span>
                    </div>
                    
                    {driver.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-3 h-3" />
                        <a href={`tel:${driver.phone}`} className="hover:text-sky-600">{driver.phone}</a>
                      </div>
                    )}
                    
                    {driver.last_location.speed && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Navigation className="w-3 h-3" />
                        <span>{Math.round(driver.last_location.speed)} km/h</span>
                      </div>
                    )}
                    
                    {driver.last_location.timestamp && (
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(driver.last_location.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Driver List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map(driver => (
          <div
            key={driver.id}
            className={`p-4 rounded-xl border ${
              driver.driver_status === 'offline' 
                ? 'bg-slate-50 border-slate-200' 
                : 'bg-white border-slate-200 shadow-sm'
            }`}
            data-testid={`driver-card-${driver.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  statusLabels[driver.driver_status]?.color || 'bg-slate-500'
                } text-white`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{driver.full_name}</h3>
                  <p className="text-sm text-slate-500">{driver.phone}</p>
                </div>
              </div>
              
              <Badge className={`${statusLabels[driver.driver_status]?.color || 'bg-slate-500'} text-white`}>
                {statusLabels[driver.driver_status]?.[language] || driver.driver_status}
              </Badge>
            </div>
            
            {driver.last_location && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>
                    {driver.last_location.latitude?.toFixed(4)}, {driver.last_location.longitude?.toFixed(4)}
                  </span>
                </div>
                {driver.last_location.speed && (
                  <div className="flex items-center gap-2 mt-1">
                    <Navigation className="w-4 h-4 text-slate-400" />
                    <span>{Math.round(driver.last_location.speed)} km/h</span>
                  </div>
                )}
              </div>
            )}
            
            {!driver.last_location && driver.driver_status !== 'offline' && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-400 italic">
                {language === 'sr' ? 'Čeka se GPS signal...' : 'Waiting for GPS signal...'}
              </div>
            )}
          </div>
        ))}
        
        {drivers.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>{language === 'sr' ? 'Nema registrovanih vozača' : 'No registered drivers'}</p>
          </div>
        )}
      </div>

      {/* Last update timestamp */}
      {lastUpdate && (
        <p className="text-xs text-slate-400 text-center">
          {language === 'sr' ? 'Poslednje ažuriranje:' : 'Last update:'} {lastUpdate.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

export default AdminLiveMap;
