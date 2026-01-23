import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Bell,
  ChevronLeft,
  Check,
  CheckCheck,
  Calendar,
  Truck,
  FileText,
  MessageSquare
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const PatientNotifications = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/api/patient/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/api/patient/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API}/api/patient/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success(language === 'sr' ? 'Sva obaveštenja označena kao pročitana' : 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_confirmation': return <Calendar className="w-5 h-5 text-sky-600" />;
      case 'status_update': return <Truck className="w-5 h-5 text-purple-600" />;
      case 'admin_message': return <MessageSquare className="w-5 h-5 text-amber-600" />;
      default: return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) {
      return language === 'sr' ? `pre ${minutes} min` : `${minutes}m ago`;
    } else if (hours < 24) {
      return language === 'sr' ? `pre ${hours}h` : `${hours}h ago`;
    } else {
      return language === 'sr' ? `pre ${days}d` : `${days}d ago`;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="patient-notifications">
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
              {language === 'sr' ? 'Obaveštenja' : 'Notifications'}
            </h1>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={markAllAsRead}
                className="gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                {language === 'sr' ? 'Pročitaj sve' : 'Read all'}
              </Button>
            )}
            {unreadCount === 0 && <div className="w-24" />}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {language === 'sr' ? 'Nema obaveštenja' : 'No notifications'}
            </h3>
            <p className="text-slate-500">
              {language === 'sr' 
                ? 'Kada budete imali nova obaveštenja, pojaviće se ovde' 
                : 'When you have new notifications, they will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notification => (
              <div 
                key={notification.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  notification.is_read 
                    ? 'border-slate-200' 
                    : 'border-sky-200 bg-sky-50/50'
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.is_read ? 'bg-slate-100' : 'bg-white'
                  }`}>
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-medium ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                        {language === 'sr' ? notification.title_sr : notification.title_en}
                      </h3>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {getTimeAgo(notification.created_at)}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${notification.is_read ? 'text-slate-500' : 'text-slate-600'}`}>
                      {language === 'sr' ? notification.message_sr : notification.message_en}
                    </p>
                    
                    {notification.booking_id && (
                      <Link 
                        to={`/patient/bookings/${notification.booking_id}`}
                        className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 mt-2"
                      >
                        {language === 'sr' ? 'Pogledaj rezervaciju' : 'View booking'}
                        <ChevronLeft className="w-3 h-3 rotate-180" />
                      </Link>
                    )}
                  </div>

                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-sky-600 rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientNotifications;
