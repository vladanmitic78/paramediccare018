import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const startIcon = createIcon('green');
const endIcon = createIcon('red');

const LocationMarker = ({ position, setPosition, icon }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} icon={icon} /> : null;
};

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
};

export const MapPicker = ({ 
  label, 
  value, 
  onChange, 
  markerColor = 'green',
  placeholder = 'Search location...' 
}) => {
  const [position, setPosition] = useState(value?.lat && value?.lng ? { lat: value.lat, lng: value.lng } : null);
  const [searchQuery, setSearchQuery] = useState(value?.address || '');
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState([43.3209, 21.8958]); // Niš, Serbia

  const icon = markerColor === 'green' ? startIcon : endIcon;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=rs`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPosition = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setPosition(newPosition);
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        setSearchQuery(display_name);
        onChange({
          address: display_name,
          lat: parseFloat(lat),
          lng: parseFloat(lon)
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleMapClick = async (newPosition) => {
    setPosition(newPosition);
    
    // Reverse geocode
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPosition.lat}&lon=${newPosition.lng}`
      );
      const data = await response.json();
      const address = data.display_name || `${newPosition.lat.toFixed(5)}, ${newPosition.lng.toFixed(5)}`;
      setSearchQuery(address);
      onChange({
        address,
        lat: newPosition.lat,
        lng: newPosition.lng
      });
    } catch (error) {
      onChange({
        address: `${newPosition.lat.toFixed(5)}, ${newPosition.lng.toFixed(5)}`,
        lat: newPosition.lat,
        lng: newPosition.lng
      });
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
        <MapPin className={`w-4 h-4 ${markerColor === 'green' ? 'text-emerald-500' : 'text-red-500'}`} />
        {label}
      </label>
      
      {/* Search Input */}
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          data-testid={`map-search-${markerColor}`}
        />
        <Button 
          type="button"
          variant="outline" 
          onClick={handleSearch}
          disabled={searching}
          data-testid={`map-search-btn-${markerColor}`}
        >
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Map */}
      <div className="h-48 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <MapContainer
          center={mapCenter}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={mapCenter} />
          <LocationMarker 
            position={position} 
            setPosition={handleMapClick}
            icon={icon}
          />
        </MapContainer>
      </div>
      
      <p className="text-xs text-slate-500">
        Click on map or search to select location
      </p>
    </div>
  );
};
