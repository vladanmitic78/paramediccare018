import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { MapPicker } from '../components/MapPicker';
import { Calendar } from '../components/ui/calendar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { 
  Ambulance, 
  CalendarIcon, 
  Upload, 
  Loader2,
  CheckCircle,
  Phone,
  Mail,
  User,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Booking = () => {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [date, setDate] = useState(null);
  const [startLocation, setStartLocation] = useState({ address: '', lat: null, lng: null });
  const [endLocation, setEndLocation] = useState({ address: '', lat: null, lng: null });
  const [formData, setFormData] = useState({
    patient_name: '',
    contact_phone: '',
    contact_email: '',
    notes: ''
  });
  const [files, setFiles] = useState([]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!startLocation.address || !endLocation.address || !date) {
      toast.error(language === 'sr' ? 'Molimo popunite sva obavezna polja' : 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Upload files first if any
      const uploadedFileIds = [];
      for (const file of files) {
        const formDataFile = new FormData();
        formDataFile.append('file', file);
        const uploadRes = await axios.post(`${API}/upload`, formDataFile);
        uploadedFileIds.push(uploadRes.data.file_id);
      }

      // Create booking
      const bookingData = {
        start_point: startLocation.address,
        start_lat: startLocation.lat,
        start_lng: startLocation.lng,
        end_point: endLocation.address,
        end_lat: endLocation.lat,
        end_lng: endLocation.lng,
        booking_date: format(date, 'yyyy-MM-dd'),
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        patient_name: formData.patient_name,
        notes: formData.notes,
        documents: uploadedFileIds
      };

      await axios.post(`${API}/bookings`, bookingData);
      
      setSuccess(true);
      toast.success(t('booking_success'));
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(language === 'sr' ? 'Greška pri slanju rezervacije' : 'Error submitting booking');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16" data-testid="booking-success">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            {t('booking_success')}
          </h1>
          <p className="text-slate-600 mb-8">
            {language === 'sr' 
              ? 'Vaša rezervacija je uspešno poslata. Kontaktiraćemo vas uskoro.'
              : 'Your booking has been successfully submitted. We will contact you soon.'}
          </p>
          <Button onClick={() => setSuccess(false)} className="btn-primary">
            {language === 'sr' ? 'Nova Rezervacija' : 'New Booking'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="booking-page">
      {/* Hero */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-slate-50 to-white">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Ambulance className="w-4 h-4" />
              {language === 'sr' ? 'Rezervacija' : 'Booking'}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t('booking_title')}
            </h1>
            <p className="text-lg text-slate-600">
              {t('booking_subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="section-container">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="card-base">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Location */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {language === 'sr' ? 'Lokacija' : 'Location'}
                  </h3>
                  
                  {/* Start Point */}
                  <MapPicker
                    label={t('booking_start')}
                    value={startLocation}
                    onChange={setStartLocation}
                    markerColor="green"
                    placeholder={language === 'sr' ? 'Pretraži polaznu lokaciju...' : 'Search start location...'}
                  />

                  {/* End Point */}
                  <MapPicker
                    label={t('booking_end')}
                    value={endLocation}
                    onChange={setEndLocation}
                    markerColor="red"
                    placeholder={language === 'sr' ? 'Pretraži destinaciju...' : 'Search destination...'}
                  />
                </div>

                {/* Right Column - Details */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {language === 'sr' ? 'Detalji' : 'Details'}
                  </h3>

                  {/* Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-slate-500" />
                      {t('booking_date')} *
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="date-picker-btn"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, 'PPP') : (language === 'sr' ? 'Izaberite datum' : 'Select date')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Patient Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      {t('booking_patient')} *
                    </label>
                    <Input
                      name="patient_name"
                      value={formData.patient_name}
                      onChange={handleInputChange}
                      placeholder={language === 'sr' ? 'Ime i prezime pacijenta' : 'Patient full name'}
                      required
                      data-testid="patient-name-input"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      {t('booking_phone')} *
                    </label>
                    <Input
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleInputChange}
                      placeholder="+381..."
                      required
                      data-testid="phone-input"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      {t('booking_email')} *
                    </label>
                    <Input
                      name="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                      required
                      data-testid="email-input"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      {t('booking_notes')}
                    </label>
                    <Textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder={language === 'sr' ? 'Dodatne napomene...' : 'Additional notes...'}
                      rows={3}
                      data-testid="notes-input"
                    />
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-slate-500" />
                      {t('booking_documents')}
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-sky-300 transition-colors">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        data-testid="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">
                          {language === 'sr' ? 'Kliknite za upload dokumenata' : 'Click to upload documents'}
                        </p>
                        {files.length > 0 && (
                          <p className="text-xs text-sky-600 mt-2">
                            {files.length} {language === 'sr' ? 'fajl(ova) izabrano' : 'file(s) selected'}
                          </p>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <Button
                  type="submit"
                  className="btn-urgent w-full md:w-auto"
                  disabled={loading}
                  data-testid="submit-booking-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'sr' ? 'Slanje...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <Ambulance className="w-4 h-4 mr-2" />
                      {t('booking_submit')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-12 bg-slate-50">
        <div className="section-container">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              {language === 'sr' ? 'Hitno?' : 'Emergency?'}
            </h3>
            <p className="text-slate-600 mb-6">
              {language === 'sr' 
                ? 'Za hitne slučajeve pozovite nas direktno'
                : 'For emergencies call us directly'}
            </p>
            <a href="tel:+38118123456">
              <Button variant="outline" className="gap-2 text-lg">
                <Phone className="w-5 h-5" />
                +381 18 123 456
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Booking;
