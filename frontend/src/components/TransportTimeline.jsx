import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Plus,
  Truck,
  MapPin,
  Navigation,
  Heart,
  ClipboardList,
  Clock,
  User,
  Ambulance,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Send,
  RefreshCw,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Icon mapping
const iconMap = {
  plus: Plus,
  truck: Truck,
  'map-pin': MapPin,
  navigation: Navigation,
  heart: Heart,
  clipboard: ClipboardList,
  ambulance: Ambulance,
  check: CheckCircle,
  cancel: XCircle,
  alert: AlertCircle
};

// Color mapping
const colorMap = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  emerald: 'bg-emerald-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  pink: 'bg-pink-500',
  slate: 'bg-slate-500',
  gray: 'bg-gray-500'
};

const TransportTimeline = ({ bookingId, isOpen, onClose, patientName }) => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchTimeline = async () => {
    if (!bookingId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/transport/timeline/${bookingId}`);
      setTimeline(response.data);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju' : 'Error loading timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchTimeline();
    }
  }, [isOpen, bookingId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setAddingNote(true);
    try {
      await axios.post(`${API}/api/transport/notes?booking_id=${bookingId}&content=${encodeURIComponent(newNote)}`);
      toast.success(language === 'sr' ? 'Napomena dodata' : 'Note added');
      setNewNote('');
      fetchTimeline();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    } finally {
      setAddingNote(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString(language === 'sr' ? 'sr-RS' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const getIcon = (iconName) => {
    const IconComponent = iconMap[iconName] || Activity;
    return IconComponent;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-slate-900 border-slate-700 text-white">
        <DialogHeader className="border-b border-slate-700 pb-4">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {language === 'sr' ? 'Vremenska linija transporta' : 'Transport Timeline'}
              </h2>
              <p className="text-sm text-slate-400 font-normal">
                {patientName || timeline?.patient_name}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : timeline?.events?.length > 0 ? (
            <div className="relative pl-8">
              {/* Timeline line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-700" />
              
              {/* Events */}
              <div className="space-y-4">
                {timeline.events.map((event, index) => {
                  const IconComponent = getIcon(event.icon);
                  const bgColor = colorMap[event.color] || 'bg-slate-500';
                  
                  return (
                    <div key={event.id || index} className="relative flex gap-4">
                      {/* Icon */}
                      <div className={`absolute -left-5 w-6 h-6 ${bgColor} rounded-full flex items-center justify-center ring-4 ring-slate-900`}>
                        <IconComponent className="w-3 h-3 text-white" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 bg-slate-800/50 rounded-lg p-3 ml-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-white">
                              {language === 'sr' ? event.title_sr : event.title}
                            </p>
                            <p className="text-sm text-slate-400">
                              {language === 'sr' ? event.description_sr : event.description}
                            </p>
                            {event.author && (
                              <p className="text-xs text-slate-500 mt-1">
                                <User className="w-3 h-3 inline mr-1" />
                                {event.author}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {formatTime(event.timestamp)}
                          </span>
                        </div>
                        
                        {/* Vitals data expansion */}
                        {event.type === 'vitals_recorded' && event.data && (
                          <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-3 gap-2 text-xs">
                            {event.data.heart_rate && (
                              <div className="bg-pink-900/30 rounded p-1.5 text-center">
                                <Heart className="w-3 h-3 mx-auto mb-0.5 text-pink-400" />
                                <span className="text-pink-300">{event.data.heart_rate} bpm</span>
                              </div>
                            )}
                            {event.data.oxygen_saturation && (
                              <div className="bg-blue-900/30 rounded p-1.5 text-center">
                                <Activity className="w-3 h-3 mx-auto mb-0.5 text-blue-400" />
                                <span className="text-blue-300">{event.data.oxygen_saturation}%</span>
                              </div>
                            )}
                            {event.data.temperature && (
                              <div className="bg-amber-900/30 rounded p-1.5 text-center">
                                <span className="text-amber-300">{event.data.temperature}°C</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Location data */}
                        {event.location && (
                          <div className="mt-2 text-xs text-slate-500">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {event.location.lat?.toFixed(4)}, {event.location.lng?.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{language === 'sr' ? 'Nema događaja' : 'No events yet'}</p>
            </div>
          )}
        </div>

        {/* Add Note Section */}
        <div className="border-t border-slate-700 pt-4">
          <div className="flex gap-2">
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={language === 'sr' ? 'Dodaj napomenu...' : 'Add a note...'}
              className="flex-1 bg-slate-800 border-slate-600"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <Button 
              onClick={handleAddNote}
              disabled={addingNote || !newNote.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {addingNote ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={fetchTimeline}
              className="border-slate-600"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransportTimeline;
