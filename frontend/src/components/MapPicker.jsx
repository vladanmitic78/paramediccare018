import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Loader2, MapPinned } from 'lucide-react';
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
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const icon = markerColor === 'green' ? startIcon : endIcon;

  // Debounced search for autocomplete
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    
    setLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=rs&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSuggestions(data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce the API call (300ms)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    const { lat, lon, display_name } = suggestion;
    const newPosition = { lat: parseFloat(lat), lng: parseFloat(lon) };
    
    setPosition(newPosition);
    setMapCenter([parseFloat(lat), parseFloat(lon)]);
    setSearchQuery(display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    
    onChange({
      address: display_name,
      lat: parseFloat(lat),
      lng: parseFloat(lon)
    });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setShowSuggestions(false);
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
    setShowSuggestions(false);
    
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

  // Format suggestion display
  const formatSuggestion = (suggestion) => {
    const parts = suggestion.display_name.split(', ');
    const mainPart = parts.slice(0, 2).join(', ');
    const secondaryPart = parts.slice(2, 4).join(', ');
    return { main: mainPart, secondary: secondaryPart };
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
        <MapPin className={`w-4 h-4 ${markerColor === 'green' ? 'text-emerald-500' : 'text-red-500'}`} />
        {label}
      </label>
      
      {/* Search Input with Autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1" ref={inputRef}>
            <Input
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={placeholder}
              className="w-full pr-8"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              data-testid={`map-search-${markerColor}`}
            />
            {loadingSuggestions && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>
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
        
        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-60 overflow-y-auto"
            data-testid={`suggestions-${markerColor}`}
          >
            {suggestions.map((suggestion, index) => {
              const { main, secondary } = formatSuggestion(suggestion);
              return (
                <button
                  key={index}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-sky-50 transition-colors flex items-start gap-3 border-b border-slate-100 last:border-0"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  data-testid={`suggestion-${markerColor}-${index}`}
                >
                  <MapPinned className={`w-5 h-5 mt-0.5 flex-shrink-0 ${markerColor === 'green' ? 'text-emerald-500' : 'text-red-500'}`} />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{main}</p>
                    <p className="text-xs text-slate-500">{secondary}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
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
        {searchQuery ? 'Type to search or click on map' : 'Start typing to see address suggestions'}
      </p>
    </div>
  );
};
