import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Ambulance, 
  Bell,
  X,
  MapPin,
  Clock,
  User,
  Phone,
  CheckCircle,
  XCircle,
  ChevronRight,
  Volume2
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Polling interval for admin (5 seconds for faster response)
const ADMIN_POLLING_INTERVAL = 5000;

const AdminBookingNotifications = ({ onViewBooking }) => {
  const { language } = useLanguage();
  const [newBookings, setNewBookings] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [seenBookingIds, setSeenBookingIds] = useState(new Set());
  const pollingRef = useRef(null);
  const audioRef = useRef(null);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 200);
      
      // Second beep
      setTimeout(() => {
        const audioContext2 = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator2 = audioContext2.createOscillator();
        const gainNode2 = audioContext2.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext2.destination);
        
        oscillator2.frequency.value = 1000;
        oscillator2.type = 'sine';
        gainNode2.gain.value = 0.3;
        
        oscillator2.start();
        setTimeout(() => {
          oscillator2.stop();
          audioContext2.close();
        }, 200);
      }, 250);
    } catch (e) {
      console.log('Audio notification not supported');
    }
  };

  const checkNewBookings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/patient-bookings?status=requested`);
      const requestedBookings = response.data;
      
      // Find new bookings we haven't seen
      const newOnes = requestedBookings.filter(b => !seenBookingIds.has(b.id));
      
      if (newOnes.length > 0) {
        // Update seen IDs
        const newSeenIds = new Set(seenBookingIds);
        newOnes.forEach(b => newSeenIds.add(b.id));
        setSeenBookingIds(newSeenIds);
        
        // Show popup for the latest new booking
        const latestNew = newOnes[0];
        setCurrentBooking(latestNew);
        setShowPopup(true);
        setNewBookings(requestedBookings);
        
        // Play sound
        playNotificationSound();
        
        // Also show toast
        toast.info(
          language === 'sr' 
            ? `Nova rezervacija od ${latestNew.patient_name}!` 
            : `New booking from ${latestNew.patient_name}!`,
          { duration: 10000 }
        );
      } else {
        setNewBookings(requestedBookings);
      }
      
      setLastCheckTime(new Date().toISOString());
    } catch (error) {
      console.error('Error checking new bookings:', error);
    }
  }, [language, seenBookingIds]);

  // Initial load - show popup immediately if there are pending bookings
  useEffect(() => {
    const loadInitialBookings = async () => {
      try {
        const response = await axios.get(`${API}/admin/patient-bookings?status=requested`);
        const requestedBookings = response.data;
        
        setNewBookings(requestedBookings);
        setLastCheckTime(new Date().toISOString());
        
        // If there are pending bookings on login, show popup for the first one
        if (requestedBookings.length > 0) {
          setCurrentBooking(requestedBookings[0]);
          setShowPopup(true);
          playNotificationSound();
          
          // Mark all as seen after showing
          const initialIds = new Set(requestedBookings.map(b => b.id));
          setSeenBookingIds(initialIds);
        }
      } catch (error) {
        console.error('Error loading initial bookings:', error);
      }
    };
    loadInitialBookings();
  }, []);
        console.error('Error loading initial bookings:', error);
      }
    };
    loadInitialBookings();
  }, []);

  // Polling for new bookings
  useEffect(() => {
    pollingRef.current = setInterval(checkNewBookings, ADMIN_POLLING_INTERVAL);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [checkNewBookings]);

  const handleConfirm = async () => {
    if (!currentBooking) return;
    
    try {
      await axios.put(`${API}/admin/patient-bookings/${currentBooking.id}/status?status=confirmed`);
      toast.success(language === 'sr' ? 'Rezervacija potvrđena!' : 'Booking confirmed!');
      setShowPopup(false);
      setCurrentBooking(null);
      
      // Remove from new bookings list
      setNewBookings(prev => prev.filter(b => b.id !== currentBooking.id));
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri potvrdi' : 'Error confirming');
    }
  };

  const handleReject = async () => {
    if (!currentBooking) return;
    
    try {
      await axios.put(`${API}/admin/patient-bookings/${currentBooking.id}/status?status=cancelled`);
      toast.success(language === 'sr' ? 'Rezervacija odbijena' : 'Booking rejected');
      setShowPopup(false);
      setCurrentBooking(null);
      
      // Remove from new bookings list
      setNewBookings(prev => prev.filter(b => b.id !== currentBooking.id));
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  const handleViewDetails = () => {
    if (onViewBooking && currentBooking) {
      onViewBooking(currentBooking);
    }
    setShowPopup(false);
  };

  const handleDismiss = () => {
    setShowPopup(false);
    setCurrentBooking(null);
  };

  const getMobilityLabel = (mobility) => {
    const labels = {
      walking: { sr: 'Može da hoda', en: 'Can walk' },
      wheelchair: { sr: 'Invalidska kolica', en: 'Wheelchair' },
      stretcher: { sr: 'Nosila', en: 'Stretcher' }
    };
    return labels[mobility]?.[language] || mobility;
  };

  const getReasonLabel = (reason) => {
    const labels = {
      hospital_appointment: { sr: 'Pregled u bolnici', en: 'Hospital Appointment' },
      dialysis: { sr: 'Dijaliza', en: 'Dialysis' },
      rehabilitation: { sr: 'Rehabilitacija', en: 'Rehabilitation' },
      discharge: { sr: 'Otpust iz bolnice', en: 'Hospital Discharge' },
      transfer: { sr: 'Premeštaj', en: 'Facility Transfer' },
      emergency: { sr: 'Hitna pomoć', en: 'Emergency' },
      other: { sr: 'Ostalo', en: 'Other' }
    };
    return labels[reason]?.[language] || reason;
  };

  return (
    <>
      {/* Notification Badge - shows count of pending bookings */}
      {newBookings.length > 0 && (
        <div className="fixed top-4 right-4 z-40">
          <Button
            onClick={() => {
              if (newBookings.length > 0) {
                setCurrentBooking(newBookings[0]);
                setShowPopup(true);
              }
            }}
            className="relative bg-red-500 hover:bg-red-600 text-white gap-2 shadow-lg animate-pulse"
          >
            <Ambulance className="w-5 h-5" />
            <span>{language === 'sr' ? 'Nove rezervacije' : 'New Bookings'}</span>
            <Badge className="absolute -top-2 -right-2 bg-white text-red-600 border-2 border-red-500">
              {newBookings.length}
            </Badge>
          </Button>
        </div>
      )}

      {/* Popup Modal */}
      {showPopup && currentBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Ambulance className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">
                      {language === 'sr' ? 'NOVA REZERVACIJA!' : 'NEW BOOKING!'}
                    </h2>
                    <p className="text-red-100 text-sm">
                      {language === 'sr' ? 'Potrebna je vaša reakcija' : 'Action required'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Patient Info */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <User className="w-10 h-10 text-slate-400 p-2 bg-white rounded-full" />
                <div>
                  <p className="font-semibold text-slate-900">{currentBooking.patient_name}</p>
                  <p className="text-sm text-slate-500">
                    {currentBooking.patient_age} {language === 'sr' ? 'god.' : 'y.o.'} • {getMobilityLabel(currentBooking.mobility_status)}
                  </p>
                </div>
              </div>

              {/* Contact */}
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-slate-400" />
                <a href={`tel:${currentBooking.contact_phone}`} className="text-sky-600 hover:underline">
                  {currentBooking.contact_phone}
                </a>
              </div>

              {/* Reason */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-600 uppercase font-medium mb-1">
                  {language === 'sr' ? 'Razlog' : 'Reason'}
                </p>
                <p className="font-medium text-amber-900">{getReasonLabel(currentBooking.transport_reason)}</p>
                {currentBooking.transport_reason_details && (
                  <p className="text-sm text-amber-700 mt-1">{currentBooking.transport_reason_details}</p>
                )}
              </div>

              {/* Locations */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase">{language === 'sr' ? 'Polazište' : 'Pickup'}</p>
                    <p className="text-sm font-medium">{currentBooking.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase">{language === 'sr' ? 'Odredište' : 'Destination'}</p>
                    <p className="text-sm font-medium">{currentBooking.destination_address}</p>
                  </div>
                </div>
              </div>

              {/* Date/Time */}
              <div className="flex items-center gap-4 p-3 bg-sky-50 rounded-xl">
                <Clock className="w-5 h-5 text-sky-600" />
                <div>
                  <p className="font-semibold text-sky-900">{currentBooking.preferred_date}</p>
                  <p className="text-sm text-sky-700">{currentBooking.preferred_time}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 space-y-2">
              <div className="flex gap-2">
                <Button 
                  onClick={handleConfirm}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {language === 'sr' ? 'Potvrdi' : 'Confirm'}
                </Button>
                <Button 
                  onClick={handleReject}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  {language === 'sr' ? 'Odbij' : 'Reject'}
                </Button>
              </div>
              <Button 
                onClick={handleViewDetails}
                variant="outline"
                className="w-full gap-2"
              >
                {language === 'sr' ? 'Prikaži detalje' : 'View Details'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminBookingNotifications;
