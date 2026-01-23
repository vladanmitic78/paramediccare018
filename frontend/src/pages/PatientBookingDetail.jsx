import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  User,
  Phone,
  Mail,
  Accessibility,
  FileText,
  XCircle,
  CheckCircle,
  Truck,
  Package,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const PatientBookingDetail = () => {
  const { id } = useParams();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const response = await axios.get(`${API}/api/patient/bookings/${id}`);
      setBooking(response.data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju rezervacije' : 'Error loading booking');
      navigate('/patient/bookings');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async () => {
    setCancelling(true);
    try {
      await axios.post(`${API}/api/patient/bookings/${id}/cancel`);
      toast.success(language === 'sr' ? 'Rezervacija je otkazana' : 'Booking cancelled');
      navigate('/patient/bookings');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri otkazivanju' : 'Error cancelling'));
    } finally {
      setCancelling(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'requested': return <Clock className="w-5 h-5" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5" />;
      case 'en_route': return <Truck className="w-5 h-5" />;
      case 'picked_up': return <Package className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      requested: { sr: 'Zahtev poslat', en: 'Requested' },
      confirmed: { sr: 'Potvrđeno', en: 'Confirmed' },
      en_route: { sr: 'Na putu', en: 'En Route' },
      picked_up: { sr: 'Preuzeto', en: 'Picked Up' },
      completed: { sr: 'Završeno', en: 'Completed' },
      cancelled: { sr: 'Otkazano', en: 'Cancelled' }
    };
    return labels[status]?.[language] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'requested': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'en_route': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'picked_up': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
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
      transfer: { sr: 'Premeštaj u drugu ustanovu', en: 'Facility Transfer' },
      emergency: { sr: 'Hitna pomoć', en: 'Emergency' },
      other: { sr: 'Ostalo', en: 'Other' }
    };
    return labels[reason]?.[language] || reason;
  };

  const canCancel = booking && ['requested', 'confirmed'].includes(booking.status);

  const statusSteps = [
    { key: 'requested', label: language === 'sr' ? 'Zahtev poslat' : 'Requested' },
    { key: 'confirmed', label: language === 'sr' ? 'Potvrđeno' : 'Confirmed' },
    { key: 'en_route', label: language === 'sr' ? 'Na putu' : 'En Route' },
    { key: 'picked_up', label: language === 'sr' ? 'Preuzeto' : 'Picked Up' },
    { key: 'completed', label: language === 'sr' ? 'Završeno' : 'Completed' }
  ];

  const getStepIndex = (status) => {
    if (status === 'cancelled') return -1;
    return statusSteps.findIndex(s => s.key === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="booking-detail">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/patient/bookings')}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {language === 'sr' ? 'Nazad' : 'Back'}
            </Button>
            <h1 className="text-lg font-semibold text-slate-900">
              {language === 'sr' ? 'Detalji rezervacije' : 'Booking Details'}
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-slate-500 mb-1">ID: {booking.id.substring(0, 8)}...</p>
              <Badge className={`${getStatusColor(booking.status)} border px-3 py-1 gap-2`}>
                {getStatusIcon(booking.status)}
                {getStatusLabel(booking.status)}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{booking.preferred_date}</p>
              <p className="text-sm text-slate-500">{booking.preferred_time}</p>
            </div>
          </div>

          {/* Status Progress (only if not cancelled) */}
          {booking.status !== 'cancelled' && (
            <div className="mb-6">
              <div className="flex items-center justify-between">
                {statusSteps.map((step, index) => {
                  const currentIndex = getStepIndex(booking.status);
                  const isActive = index <= currentIndex;
                  const isCurrent = index === currentIndex;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isActive 
                          ? isCurrent 
                            ? 'bg-sky-600 text-white ring-4 ring-sky-100' 
                            : 'bg-sky-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className={`text-xs mt-2 text-center hidden sm:block ${isActive ? 'text-sky-600 font-medium' : 'text-slate-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="h-1 bg-slate-200 rounded-full mt-4 relative">
                <div 
                  className="h-full bg-sky-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(0, (getStepIndex(booking.status) / (statusSteps.length - 1)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Location Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {language === 'sr' ? 'Lokacije' : 'Locations'}
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
              <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-600 uppercase tracking-wide font-medium mb-1">
                  {language === 'sr' ? 'Polazište' : 'Pickup'}
                </p>
                <p className="text-slate-900">{booking.pickup_address}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <MapPin className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-red-600 uppercase tracking-wide font-medium mb-1">
                  {language === 'sr' ? 'Odredište' : 'Destination'}
                </p>
                <p className="text-slate-900">{booking.destination_address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Patient & Transport Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {language === 'sr' ? 'Podaci o pacijentu' : 'Patient Information'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">{language === 'sr' ? 'Ime' : 'Name'}</p>
                <p className="font-medium text-slate-900">{booking.patient_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">{language === 'sr' ? 'Starost' : 'Age'}</p>
                <p className="font-medium text-slate-900">{booking.patient_age} {language === 'sr' ? 'god.' : 'y.o.'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">{language === 'sr' ? 'Telefon' : 'Phone'}</p>
                <p className="font-medium text-slate-900">{booking.contact_phone}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-medium text-slate-900">{booking.contact_email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">{language === 'sr' ? 'Razlog' : 'Reason'}</p>
                <p className="font-medium text-slate-900">{getReasonLabel(booking.transport_reason)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Accessibility className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">{language === 'sr' ? 'Mobilnost' : 'Mobility'}</p>
                <p className="font-medium text-slate-900">{getMobilityLabel(booking.mobility_status)}</p>
              </div>
            </div>
          </div>

          {booking.transport_reason_details && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">{language === 'sr' ? 'Dodatne napomene' : 'Additional Notes'}</p>
              <p className="text-slate-700">{booking.transport_reason_details}</p>
            </div>
          )}
        </div>

        {/* Cancel Button (if allowed) */}
        {canCancel && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  {language === 'sr' ? 'Otkaži rezervaciju' : 'Cancel Booking'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {language === 'sr' ? 'Potvrdite otkazivanje' : 'Confirm Cancellation'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {language === 'sr' 
                      ? 'Da li ste sigurni da želite da otkažete ovu rezervaciju? Ova akcija se ne može poništiti.'
                      : 'Are you sure you want to cancel this booking? This action cannot be undone.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {language === 'sr' ? 'Ne, zadrži' : 'No, keep it'}
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={cancelBooking}
                    disabled={cancelling}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {cancelling ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {language === 'sr' ? 'Da, otkaži' : 'Yes, cancel'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Booking Metadata */}
        <div className="text-center text-xs text-slate-400">
          <p>{language === 'sr' ? 'Kreirano' : 'Created'}: {new Date(booking.created_at).toLocaleString()}</p>
          {booking.updated_at && (
            <p>{language === 'sr' ? 'Ažurirano' : 'Updated'}: {new Date(booking.updated_at).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientBookingDetail;
