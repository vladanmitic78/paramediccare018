import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  User,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  UserCircle,
  Globe,
  Heart,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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

const PatientProfile = () => {
  const { language, setLanguage } = useLanguage();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    saved_addresses: [],
    emergency_contact: {
      name: '',
      phone: '',
      relationship: ''
    },
    preferred_language: 'sr'
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/api/patient/profile`);
      setProfile({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        date_of_birth: response.data.date_of_birth || '',
        saved_addresses: response.data.saved_addresses || [],
        emergency_contact: response.data.emergency_contact || {
          name: '',
          phone: '',
          relationship: ''
        },
        preferred_language: response.data.preferred_language || language
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      emergency_contact: { ...prev.emergency_contact, [name]: value }
    }));
  };

  const handleAddressChange = (index, field, value) => {
    setProfile(prev => ({
      ...prev,
      saved_addresses: prev.saved_addresses.map((addr, i) => 
        i === index ? { ...addr, [field]: value } : addr
      )
    }));
  };

  const addAddress = () => {
    setProfile(prev => ({
      ...prev,
      saved_addresses: [...prev.saved_addresses, { label: '', address: '' }]
    }));
  };

  const removeAddress = (index) => {
    setProfile(prev => ({
      ...prev,
      saved_addresses: prev.saved_addresses.filter((_, i) => i !== index)
    }));
  };

  const handleLanguageChange = (value) => {
    setProfile(prev => ({ ...prev, preferred_language: value }));
    setLanguage(value);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/api/patient/profile`, profile);
      setUser(prev => ({ ...prev, ...response.data }));
      toast.success(language === 'sr' ? 'Profil uspešno sačuvan' : 'Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(language === 'sr' ? 'Greška pri čuvanju profila' : 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="patient-profile">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
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
              {language === 'sr' ? 'Podešavanja profila' : 'Profile Settings'}
            </h1>
            <Button 
              onClick={saveProfile}
              disabled={saving}
              className="gap-2 bg-sky-600 hover:bg-sky-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {language === 'sr' ? 'Sačuvaj' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-sky-600" />
            {language === 'sr' ? 'Lični podaci' : 'Personal Information'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {language === 'sr' ? 'Puno ime' : 'Full Name'}
              </label>
              <Input
                name="full_name"
                value={profile.full_name}
                onChange={handleInputChange}
                placeholder={language === 'sr' ? 'Ime i prezime' : 'First and last name'}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input
                name="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {language === 'sr' ? 'Telefon' : 'Phone'}
              </label>
              <Input
                name="phone"
                type="tel"
                value={profile.phone}
                onChange={handleInputChange}
                placeholder="+381..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {language === 'sr' ? 'Datum rođenja' : 'Date of Birth'}
              </label>
              <Input
                name="date_of_birth"
                type="date"
                value={profile.date_of_birth}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* Saved Addresses */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-600" />
              {language === 'sr' ? 'Sačuvane adrese' : 'Saved Addresses'}
            </h2>
            <Button variant="outline" size="sm" onClick={addAddress} className="gap-2">
              <Plus className="w-4 h-4" />
              {language === 'sr' ? 'Dodaj' : 'Add'}
            </Button>
          </div>
          
          {profile.saved_addresses.length === 0 ? (
            <p className="text-slate-500 text-sm">
              {language === 'sr' 
                ? 'Nemate sačuvane adrese. Dodajte adresu za brže popunjavanje rezervacija.' 
                : 'You have no saved addresses. Add an address for faster booking.'}
            </p>
          ) : (
            <div className="space-y-3">
              {profile.saved_addresses.map((address, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      value={address.label}
                      onChange={(e) => handleAddressChange(index, 'label', e.target.value)}
                      placeholder={language === 'sr' ? 'Oznaka (npr. Kuća)' : 'Label (e.g. Home)'}
                      className="bg-white"
                    />
                    <Input
                      value={address.address}
                      onChange={(e) => handleAddressChange(index, 'address', e.target.value)}
                      placeholder={language === 'sr' ? 'Adresa' : 'Address'}
                      className="bg-white"
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeAddress(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            {language === 'sr' ? 'Kontakt za hitne slučajeve' : 'Emergency Contact'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {language === 'sr' ? 'Ime i prezime' : 'Full Name'}
              </label>
              <Input
                name="name"
                value={profile.emergency_contact.name}
                onChange={handleEmergencyContactChange}
                placeholder={language === 'sr' ? 'Ime kontakta' : 'Contact name'}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {language === 'sr' ? 'Telefon' : 'Phone'}
              </label>
              <Input
                name="phone"
                type="tel"
                value={profile.emergency_contact.phone}
                onChange={handleEmergencyContactChange}
                placeholder="+381..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {language === 'sr' ? 'Odnos' : 'Relationship'}
              </label>
              <Select 
                value={profile.emergency_contact.relationship} 
                onValueChange={(v) => handleEmergencyContactChange({ target: { name: 'relationship', value: v } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'sr' ? 'Izaberite' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">{language === 'sr' ? 'Supružnik' : 'Spouse'}</SelectItem>
                  <SelectItem value="parent">{language === 'sr' ? 'Roditelj' : 'Parent'}</SelectItem>
                  <SelectItem value="child">{language === 'sr' ? 'Dete' : 'Child'}</SelectItem>
                  <SelectItem value="sibling">{language === 'sr' ? 'Brat/Sestra' : 'Sibling'}</SelectItem>
                  <SelectItem value="friend">{language === 'sr' ? 'Prijatelj' : 'Friend'}</SelectItem>
                  <SelectItem value="other">{language === 'sr' ? 'Ostalo' : 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-600" />
            {language === 'sr' ? 'Podešavanja' : 'Preferences'}
          </h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              {language === 'sr' ? 'Jezik' : 'Language'}
            </label>
            <Select value={profile.preferred_language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sr">🇷🇸 Srpski</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
