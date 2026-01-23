import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  XCircle,
  CheckCircle,
  Truck,
  Package,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const PatientBookings = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await axios.get(`${API}/api/patient/bookings${params}`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'requested': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'en_route': return <Truck className="w-4 h-4" />;
      case 'picked_up': return <Package className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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
      case 'requested': return 'bg-amber-100 text-amber-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'en_route': return 'bg-purple-100 text-purple-700';
      case 'picked_up': return 'bg-indigo-100 text-indigo-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filterOptions = [
    { value: 'all', label: language === 'sr' ? 'Sve rezervacije' : 'All Bookings' },
    { value: 'requested', label: language === 'sr' ? 'Na čekanju' : 'Pending' },
    { value: 'confirmed', label: language === 'sr' ? 'Potvrđene' : 'Confirmed' },
    { value: 'completed', label: language === 'sr' ? 'Završene' : 'Completed' },
    { value: 'cancelled', label: language === 'sr' ? 'Otkazane' : 'Cancelled' }
  ];

  return (
    <div className="min-h-screen bg-slate-50" data-testid="patient-bookings">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
              {language === 'sr' ? 'Moje rezervacije' : 'My Bookings'}
            </h1>
            <Link to="/patient/book">
              <Button size="sm" className="bg-sky-600 hover:bg-sky-700">
                + {language === 'sr' ? 'Nova' : 'New'}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter */}
        <div className="mb-6">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-64 bg-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {language === 'sr' ? 'Nema rezervacija' : 'No bookings'}
            </h3>
            <p className="text-slate-500 mb-6">
              {language === 'sr' 
                ? 'Nemate još nijednu rezervaciju' 
                : 'You don\'t have any bookings yet'}
            </p>
            <Link to="/patient/book">
              <Button className="bg-sky-600 hover:bg-sky-700">
                {language === 'sr' ? 'Zakažite transport' : 'Book Transport'}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <Link 
                key={booking.id} 
                to={`/patient/bookings/${booking.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-sky-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      ID: {booking.id.substring(0, 8)}...
                    </p>
                    <Badge className={`${getStatusColor(booking.status)} gap-1`}>
                      {getStatusIcon(booking.status)}
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{booking.preferred_date}</p>
                    <p className="text-xs text-slate-500">{booking.preferred_time}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-700 line-clamp-1">{booking.pickup_address}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-700 line-clamp-1">{booking.destination_address}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-100">
                  <span className="text-sm text-sky-600 flex items-center gap-1">
                    {language === 'sr' ? 'Detalji' : 'Details'}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientBookings;
