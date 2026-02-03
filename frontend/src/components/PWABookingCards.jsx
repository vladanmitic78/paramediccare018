/**
 * PWA Booking Cards - Shared card components for PWA bookings
 * Extracted from UnifiedPWA.jsx for better maintainability
 */
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Phone, 
  Heart, 
  Truck 
} from 'lucide-react';

// Status configuration for booking cards
export const statusConfig = {
  pending: { color: 'bg-amber-600', border: 'border-amber-500', label: { sr: 'Čeka', en: 'Pending' }, pulse: false },
  confirmed: { color: 'bg-blue-600', border: 'border-blue-500', label: { sr: 'Potvrđeno', en: 'Confirmed' }, pulse: false },
  assigned: { color: 'bg-purple-600', border: 'border-purple-500', label: { sr: 'Dodeljeno', en: 'Assigned' }, pulse: true },
  en_route: { color: 'bg-sky-600', border: 'border-sky-500', label: { sr: 'Na putu', en: 'En Route' }, pulse: true },
  arrived: { color: 'bg-cyan-600', border: 'border-cyan-500', label: { sr: 'Stigao', en: 'Arrived' }, pulse: true },
  picked_up: { color: 'bg-indigo-600', border: 'border-indigo-500', label: { sr: 'Preuzet', en: 'Picked Up' }, pulse: true },
  in_transit: { color: 'bg-violet-600', border: 'border-violet-500', label: { sr: 'U transportu', en: 'In Transit' }, pulse: true },
  completed: { color: 'bg-emerald-600', border: 'border-emerald-500', label: { sr: 'Završeno', en: 'Completed' }, pulse: false },
  cancelled: { color: 'bg-red-600', border: 'border-red-500', label: { sr: 'Otkazano', en: 'Cancelled' }, pulse: false }
};

/**
 * Medical Booking Card Component - For doctors/nurses
 * Shows booking with vitals entry button
 */
export const MedicalBookingCard = ({ booking, language, onVitals }) => {
  const status = statusConfig[booking.status] || statusConfig.pending;
  
  return (
    <div 
      className={`rounded-xl p-4 mb-3 bg-gradient-to-r from-slate-800 to-slate-800/80 border-l-4 ${status.border}`}
      data-testid={`medical-booking-card-${booking.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-white text-lg">{booking.patient_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-[10px] ${status.color} text-white flex items-center gap-1`}>
              {status.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              {status.label[language]}
            </Badge>
            {booking.assigned_driver_name && (
              <span className="text-xs text-slate-400">
                • <Truck className="w-3 h-3 inline" /> {booking.assigned_driver_name}
              </span>
            )}
          </div>
        </div>
        <Button 
          size="sm" 
          className="bg-purple-600 hover:bg-purple-700 h-10 px-4 gap-2"
          onClick={onVitals}
          data-testid={`vitals-btn-${booking.id}`}
        >
          <Heart className="w-4 h-4" />
          {language === 'sr' ? 'Vitali' : 'Vitals'}
        </Button>
      </div>
      <div className="space-y-2 text-sm text-slate-300">
        <p className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{booking.start_point || booking.pickup_address}</span>
        </p>
        <p className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="truncate">{booking.end_point || booking.destination_address}</span>
        </p>
        <div className="flex items-center gap-4 pt-2 text-xs text-slate-500 border-t border-slate-700 mt-2">
          <span><Clock className="w-3 h-3 inline mr-1" />{booking.booking_time}</span>
          {booking.contact_phone && (
            <a href={`tel:${booking.contact_phone}`} className="text-sky-400 hover:text-sky-300">
              <Phone className="w-3 h-3 inline mr-1" />{booking.contact_phone}
            </a>
          )}
          {booking.mobility_status && (
            <span className="text-amber-400">{booking.mobility_status}</span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Standard Booking Card Component - For admins/dispatchers
 * Shows booking with optional assign button
 */
export const BookingCard = ({ booking, language, onAssign }) => {
  const status = statusConfig[booking.status] || statusConfig.pending;
  
  return (
    <div 
      className={`rounded-xl p-4 mb-3 bg-slate-800 border-l-4 ${status.border}`}
      data-testid={`booking-card-${booking.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-white">{booking.patient_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-[10px] ${status.color} text-white flex items-center gap-1`}>
              {status.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              {status.label[language]}
            </Badge>
            {booking.assigned_driver_name && (
              <span className="text-xs text-slate-400">• {booking.assigned_driver_name}</span>
            )}
          </div>
        </div>
        {booking.status === 'pending' && onAssign && (
          <Button 
            size="sm" 
            className="bg-emerald-600 hover:bg-emerald-700 h-8"
            onClick={onAssign}
            data-testid={`assign-btn-${booking.id}`}
          >
            {language === 'sr' ? 'Dodeli' : 'Assign'}
          </Button>
        )}
      </div>
      <div className="space-y-1 text-sm text-slate-300">
        <p className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-emerald-400" />
          <span className="truncate">{booking.start_point || booking.pickup_address}</span>
        </p>
        <p className="flex items-center gap-2">
          <Navigation className="w-3 h-3 text-red-400" />
          <span className="truncate">{booking.end_point || booking.destination_address}</span>
        </p>
        <div className="flex items-center gap-4 pt-1 text-xs text-slate-500">
          <span><Clock className="w-3 h-3 inline mr-1" />{booking.booking_time}</span>
          {booking.contact_phone && (
            <a href={`tel:${booking.contact_phone}`} className="text-sky-400">
              <Phone className="w-3 h-3 inline mr-1" />{booking.contact_phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default { MedicalBookingCard, BookingCard, statusConfig };
