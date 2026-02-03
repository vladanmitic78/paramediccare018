/**
 * DriverRejectionModal - Modal for drivers to reject/decline a booking assignment
 * with reason selection and optional notes
 */
import { useState } from 'react';
import axios from 'axios';
import {
  XCircle,
  AlertTriangle,
  MessageSquare,
  Send,
  Loader2,
  Car,
  Clock,
  MapPin,
  Wrench,
  UserX,
  HelpCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Predefined rejection reasons
const rejectionReasons = [
  {
    id: 'vehicle_issue',
    icon: Car,
    label: { sr: 'Problem sa vozilom', en: 'Vehicle Issue' },
    description: { sr: 'Vozilo ima kvar ili nije dostupno', en: 'Vehicle has a breakdown or is not available' }
  },
  {
    id: 'schedule_conflict',
    icon: Clock,
    label: { sr: 'Konflikt u rasporedu', en: 'Schedule Conflict' },
    description: { sr: 'Već imam drugu vožnju u tom terminu', en: 'Already have another trip at that time' }
  },
  {
    id: 'location_issue',
    icon: MapPin,
    label: { sr: 'Problem sa lokacijom', en: 'Location Issue' },
    description: { sr: 'Lokacija je nedostupna ili predaleko', en: 'Location is inaccessible or too far' }
  },
  {
    id: 'medical_reason',
    icon: UserX,
    label: { sr: 'Zdravstveni razlog', en: 'Medical Reason' },
    description: { sr: 'Nisam u mogućnosti zbog zdravstvenih razloga', en: 'Unable due to health reasons' }
  },
  {
    id: 'equipment_missing',
    icon: Wrench,
    label: { sr: 'Nedostaje oprema', en: 'Missing Equipment' },
    description: { sr: 'Potrebna oprema nije dostupna', en: 'Required equipment is not available' }
  },
  {
    id: 'other',
    icon: HelpCircle,
    label: { sr: 'Drugi razlog', en: 'Other Reason' },
    description: { sr: 'Navedi razlog u napomeni', en: 'Specify reason in notes' }
  }
];

const DriverRejectionModal = ({ 
  open, 
  onOpenChange, 
  booking, 
  language = 'sr',
  onRejected = null 
}) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error(language === 'sr' ? 'Izaberite razlog' : 'Select a reason');
      return;
    }

    if (selectedReason === 'other' && !notes.trim()) {
      toast.error(language === 'sr' ? 'Unesite razlog u napomenu' : 'Enter reason in notes');
      return;
    }

    setSubmitting(true);
    try {
      const reason = rejectionReasons.find(r => r.id === selectedReason);
      
      await axios.post(`${API}/api/bookings/${booking.id}/reject`, {
        reason_code: selectedReason,
        reason_label: reason?.label[language] || selectedReason,
        notes: notes.trim() || null
      });

      toast.success(language === 'sr' ? 'Vožnja odbijena' : 'Trip rejected');
      
      // Reset state
      setSelectedReason(null);
      setNotes('');
      onOpenChange(false);
      
      if (onRejected) {
        onRejected(booking.id);
      }
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri odbijanju' : 'Error rejecting'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setNotes('');
    onOpenChange(false);
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="driver-rejection-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            {language === 'sr' ? 'Odbij vožnju' : 'Reject Trip'}
          </DialogTitle>
          <DialogDescription>
            {language === 'sr' 
              ? 'Izaberite razlog za odbijanje ove vožnje' 
              : 'Select a reason for rejecting this trip'}
          </DialogDescription>
        </DialogHeader>

        {/* Booking Info */}
        <div className="p-3 bg-slate-50 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{booking.patient_name}</span>
            <Badge variant="outline">{booking.booking_date} {booking.pickup_time}</Badge>
          </div>
          <div className="text-sm text-slate-600 space-y-1">
            <p className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-500" />
              {booking.start_point || booking.pickup_address}
            </p>
            <p className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-500" />
              {booking.end_point || booking.destination_address}
            </p>
          </div>
        </div>

        {/* Reason Selection */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            {language === 'sr' ? 'Razlog odbijanja:' : 'Rejection reason:'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {rejectionReasons.map(reason => {
              const Icon = reason.icon;
              const isSelected = selectedReason === reason.id;
              
              return (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  data-testid={`reason-${reason.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-red-600' : 'text-slate-500'}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-red-700' : 'text-slate-700'}`}>
                      {reason.label[language]}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {reason.description[language]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            {language === 'sr' ? 'Dodatna napomena' : 'Additional notes'}
            {selectedReason === 'other' && <span className="text-red-500">*</span>}
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'sr' ? 'Unesite dodatne detalje...' : 'Enter additional details...'}
            rows={3}
            className={selectedReason === 'other' && !notes.trim() ? 'border-red-300' : ''}
          />
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg mt-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">
              {language === 'sr' ? 'Važno:' : 'Important:'}
            </p>
            <p className="text-xs mt-1">
              {language === 'sr' 
                ? 'Ova vožnja će biti vraćena na listu nedodeljenih rezervacija i dodeljena drugom vozaču.'
                : 'This trip will be returned to the unassigned bookings list and assigned to another driver.'}
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            {language === 'sr' ? 'Otkaži' : 'Cancel'}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={submitting || !selectedReason}
            data-testid="confirm-rejection-btn"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            {language === 'sr' ? 'Odbij vožnju' : 'Reject Trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriverRejectionModal;
