import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Ambulance, 
  User,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Accessibility,
  FileText
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const PatientBookingWizard = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [transportReasons, setTransportReasons] = useState([]);
  const [formData, setFormData] = useState({
    // Step 1: Patient Information
    patient_name: user?.full_name || '',
    patient_age: '',
    contact_phone: user?.phone || '',
    contact_email: user?.email || '',
    
    // Step 2: Transport Need
    transport_reason: '',
    transport_reason_details: '',
    mobility_status: 'walking',
    
    // Step 3: Transport Details
    pickup_address: '',
    pickup_lat: null,
    pickup_lng: null,
    destination_address: '',
    destination_lat: null,
    destination_lng: null,
    preferred_date: '',
    preferred_time: '',
    
    // Step 4: Confirmation
    consent_given: false
  });

  useEffect(() => {
    fetchTransportReasons();
  }, [language]);

  const fetchTransportReasons = async () => {
    try {
      const response = await axios.get(`${API}/api/patient/transport-reasons?language=${language}`);
      setTransportReasons(response.data);
    } catch (error) {
      console.error('Error fetching transport reasons:', error);
    }
  };

  const steps = [
    { 
      number: 1, 
      title: language === 'sr' ? 'Podaci o pacijentu' : 'Patient Information',
      icon: User
    },
    { 
      number: 2, 
      title: language === 'sr' ? 'Potreba za transportom' : 'Transport Need',
      icon: Accessibility
    },
    { 
      number: 3, 
      title: language === 'sr' ? 'Detalji transporta' : 'Transport Details',
      icon: MapPin
    },
    { 
      number: 4, 
      title: language === 'sr' ? 'Potvrda' : 'Confirmation',
      icon: CheckCircle
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.patient_name || !formData.patient_age || !formData.contact_phone || !formData.contact_email) {
          toast.error(language === 'sr' ? 'Molimo popunite sva obavezna polja' : 'Please fill in all required fields');
          return false;
        }
        if (formData.patient_age < 0 || formData.patient_age > 150) {
          toast.error(language === 'sr' ? 'Unesite validnu starost' : 'Please enter a valid age');
          return false;
        }
        return true;
      case 2:
        if (!formData.transport_reason) {
          toast.error(language === 'sr' ? 'Molimo izaberite razlog transporta' : 'Please select a transport reason');
          return false;
        }
        return true;
      case 3:
        if (!formData.pickup_address || !formData.destination_address || !formData.preferred_date || !formData.preferred_time) {
          toast.error(language === 'sr' ? 'Molimo popunite sve detalje transporta' : 'Please fill in all transport details');
          return false;
        }
        return true;
      case 4:
        if (!formData.consent_given) {
          toast.error(language === 'sr' ? 'Morate dati saglasnost za nastavak' : 'You must give consent to proceed');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/patient/bookings`, {
        ...formData,
        patient_age: parseInt(formData.patient_age),
        language
      });
      
      toast.success(language === 'sr' ? 'Rezervacija uspešno kreirana!' : 'Booking successfully created!');
      navigate('/patient/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(language === 'sr' ? 'Greška pri kreiranju rezervacije' : 'Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  const mobilityOptions = [
    { value: 'walking', label: language === 'sr' ? 'Može da hoda' : 'Can walk' },
    { value: 'wheelchair', label: language === 'sr' ? 'Invalidska kolica' : 'Wheelchair' },
    { value: 'stretcher', label: language === 'sr' ? 'Nosila' : 'Stretcher' }
  ];

  const getReasonLabel = (value) => {
    const reason = transportReasons.find(r => r.value === value);
    return reason?.label || value;
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="booking-wizard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/patient')}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {language === 'sr' ? 'Nazad' : 'Back'}
            </Button>
            <h1 className="text-lg font-semibold text-slate-900">
              {language === 'sr' ? 'Nova rezervacija' : 'New Booking'}
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className={`flex flex-col items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    currentStep >= step.number 
                      ? 'bg-sky-600 text-white' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 text-center hidden sm:block ${
                    currentStep >= step.number ? 'text-sky-600 font-medium' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 rounded ${
                    currentStep > step.number ? 'bg-sky-600' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
          {/* Step 1: Patient Information */}
          {currentStep === 1 && (
            <div className="space-y-6" data-testid="step-1">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {language === 'sr' ? 'Podaci o pacijentu' : 'Patient Information'}
                </h2>
                <p className="text-slate-600">
                  {language === 'sr' ? 'Unesite osnovne podatke o pacijentu' : 'Enter basic patient information'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Puno ime' : 'Full Name'} *
                  </label>
                  <Input
                    name="patient_name"
                    value={formData.patient_name}
                    onChange={handleInputChange}
                    placeholder={language === 'sr' ? 'Ime i prezime' : 'First and last name'}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Starost' : 'Age'} *
                  </label>
                  <Input
                    name="patient_age"
                    type="number"
                    value={formData.patient_age}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    max="150"
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Kontakt telefon' : 'Contact Phone'} *
                  </label>
                  <Input
                    name="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={handleInputChange}
                    placeholder="+381..."
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Email adresa' : 'Email Address'} *
                  </label>
                  <Input
                    name="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={handleInputChange}
                    placeholder="email@example.com"
                    className="text-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Transport Need */}
          {currentStep === 2 && (
            <div className="space-y-6" data-testid="step-2">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {language === 'sr' ? 'Potreba za transportom' : 'Transport Need'}
                </h2>
                <p className="text-slate-600">
                  {language === 'sr' ? 'Opišite razlog i potrebe za transport' : 'Describe the reason and needs for transport'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Razlog transporta' : 'Transport Reason'} *
                  </label>
                  <Select value={formData.transport_reason} onValueChange={(v) => handleSelectChange('transport_reason', v)}>
                    <SelectTrigger className="text-lg">
                      <SelectValue placeholder={language === 'sr' ? 'Izaberite razlog' : 'Select reason'} />
                    </SelectTrigger>
                    <SelectContent>
                      {transportReasons.map(reason => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Dodatne napomene (opciono)' : 'Additional Notes (optional)'}
                  </label>
                  <Textarea
                    name="transport_reason_details"
                    value={formData.transport_reason_details}
                    onChange={handleInputChange}
                    placeholder={language === 'sr' ? 'Unesite dodatne informacije...' : 'Enter additional information...'}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {language === 'sr' ? 'Mobilnost pacijenta' : 'Patient Mobility'} *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {mobilityOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectChange('mobility_status', option.value)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.mobility_status === option.value
                            ? 'border-sky-600 bg-sky-50 text-sky-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Transport Details */}
          {currentStep === 3 && (
            <div className="space-y-6" data-testid="step-3">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {language === 'sr' ? 'Detalji transporta' : 'Transport Details'}
                </h2>
                <p className="text-slate-600">
                  {language === 'sr' ? 'Unesite lokacije i željeni termin' : 'Enter locations and preferred schedule'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    {language === 'sr' ? 'Adresa polaska' : 'Pickup Address'} *
                  </label>
                  <Input
                    name="pickup_address"
                    value={formData.pickup_address}
                    onChange={handleInputChange}
                    placeholder={language === 'sr' ? 'Unesite adresu polaska' : 'Enter pickup address'}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-600" />
                    {language === 'sr' ? 'Adresa odredišta' : 'Destination Address'} *
                  </label>
                  <Input
                    name="destination_address"
                    value={formData.destination_address}
                    onChange={handleInputChange}
                    placeholder={language === 'sr' ? 'Unesite adresu odredišta' : 'Enter destination address'}
                    className="text-lg"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-600" />
                      {language === 'sr' ? 'Željeni datum' : 'Preferred Date'} *
                    </label>
                    <Input
                      name="preferred_date"
                      type="date"
                      value={formData.preferred_date}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-600" />
                      {language === 'sr' ? 'Željeno vreme' : 'Preferred Time'} *
                    </label>
                    <Input
                      name="preferred_time"
                      type="time"
                      value={formData.preferred_time}
                      onChange={handleInputChange}
                      className="text-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-6" data-testid="step-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {language === 'sr' ? 'Potvrda rezervacije' : 'Booking Confirmation'}
                </h2>
                <p className="text-slate-600">
                  {language === 'sr' ? 'Proverite podatke i potvrdite rezervaciju' : 'Review details and confirm booking'}
                </p>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-slate-900 border-b pb-2">
                  {language === 'sr' ? 'Rezime rezervacije' : 'Booking Summary'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">{language === 'sr' ? 'Pacijent' : 'Patient'}</p>
                    <p className="font-medium text-slate-900">{formData.patient_name}, {formData.patient_age} {language === 'sr' ? 'god.' : 'y.o.'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{language === 'sr' ? 'Kontakt' : 'Contact'}</p>
                    <p className="font-medium text-slate-900">{formData.contact_phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{language === 'sr' ? 'Razlog' : 'Reason'}</p>
                    <p className="font-medium text-slate-900">{getReasonLabel(formData.transport_reason)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{language === 'sr' ? 'Mobilnost' : 'Mobility'}</p>
                    <p className="font-medium text-slate-900">
                      {mobilityOptions.find(o => o.value === formData.mobility_status)?.label}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-slate-500">{language === 'sr' ? 'Polazište' : 'Pickup'}</p>
                    <p className="font-medium text-slate-900">{formData.pickup_address}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-slate-500">{language === 'sr' ? 'Odredište' : 'Destination'}</p>
                    <p className="font-medium text-slate-900">{formData.destination_address}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{language === 'sr' ? 'Datum' : 'Date'}</p>
                    <p className="font-medium text-slate-900">{formData.preferred_date}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{language === 'sr' ? 'Vreme' : 'Time'}</p>
                    <p className="font-medium text-slate-900">{formData.preferred_time}</p>
                  </div>
                </div>
              </div>

              {/* Consent */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={formData.consent_given}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consent_given: checked }))}
                    className="mt-1"
                  />
                  <label htmlFor="consent" className="text-sm text-slate-700 cursor-pointer">
                    {language === 'sr' 
                      ? 'Potvrđujem da su svi navedeni podaci tačni i saglasan/saglasna sam sa uslovima korišćenja usluge medicinskog transporta. Razumem da će moji podaci biti obrađeni u skladu sa pravilima o zaštiti podataka.'
                      : 'I confirm that all provided information is accurate and I agree to the terms of service for medical transport. I understand that my data will be processed in accordance with data protection regulations.'}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {language === 'sr' ? 'Nazad' : 'Back'}
            </Button>

            {currentStep < 4 ? (
              <Button onClick={nextStep} className="gap-2 bg-sky-600 hover:bg-sky-700">
                {language === 'sr' ? 'Dalje' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !formData.consent_given}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {language === 'sr' ? 'Pošalji rezervaciju' : 'Submit Booking'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientBookingWizard;
