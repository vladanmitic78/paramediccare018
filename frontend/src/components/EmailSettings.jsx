import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Mail,
  Settings,
  Send,
  Check,
  X,
  Loader2,
  Server,
  Key,
  History,
  TestTube,
  Shield,
  Bell,
  RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const EmailSettings = ({ language = 'sr' }) => {
  const [settings, setSettings] = useState({
    smtp_host: '',
    smtp_port: 465,
    sender_email: '',
    sender_password: '',
    sender_name: 'Paramedic Care 018',
    enabled: true,
    notify_booking_created: true,
    notify_driver_assigned: true,
    notify_driver_arriving: true,
    notify_transport_completed: true,
    notify_pickup_reminder: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/settings/email`);
      const data = response.data;
      setSettings({
        smtp_host: data.smtp_host || '',
        smtp_port: data.smtp_port || 465,
        sender_email: data.sender_email || '',
        sender_password: data.sender_password || '',
        sender_name: data.sender_name || 'Paramedic Care 018',
        enabled: data.enabled !== false,
        notify_booking_created: data.notify_booking_created !== false,
        notify_driver_assigned: data.notify_driver_assigned !== false,
        notify_driver_arriving: data.notify_driver_arriving !== false,
        notify_transport_completed: data.notify_transport_completed !== false,
        notify_pickup_reminder: data.notify_pickup_reminder !== false
      });
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri učitavanju podešavanja' : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/email`, settings);
      toast.success(language === 'sr' ? 'Podešavanja sačuvana' : 'Settings saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri čuvanju' : 'Error saving'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error(language === 'sr' ? 'Unesite email adresu' : 'Enter email address');
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    try {
      const response = await axios.post(`${API}/api/settings/email/test`, {
        to_email: testEmail,
        subject: testSubject || `Test Email - Paramedic Care 018 - ${new Date().toLocaleTimeString()}`,
        message: testMessage || null
      });
      setTestResult(response.data);
      if (response.data.success) {
        toast.success(language === 'sr' ? 'Email uspešno poslat!' : 'Email sent successfully!');
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: error.response?.data?.detail || error.response?.data?.error || 'Unknown error' 
      });
      toast.error(language === 'sr' ? 'Greška pri slanju' : 'Error sending');
    } finally {
      setTesting(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await axios.get(`${API}/api/settings/email/logs?limit=50`);
      setLogs(response.data);
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri učitavanju logova' : 'Error loading logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const notificationTriggers = [
    {
      key: 'notify_booking_created',
      label: language === 'sr' ? 'Kreiranje rezervacije' : 'Booking Created',
      description: language === 'sr' ? 'Email kada se kreira nova rezervacija' : 'Email when new booking is created'
    },
    {
      key: 'notify_driver_assigned',
      label: language === 'sr' ? 'Dodeljivanje vozača' : 'Driver Assigned',
      description: language === 'sr' ? 'Email kada se dodeli vozač' : 'Email when driver is assigned'
    },
    {
      key: 'notify_driver_arriving',
      label: language === 'sr' ? 'Vozač na putu' : 'Driver Arriving',
      description: language === 'sr' ? 'Email kada je vozač na putu' : 'Email when driver is on the way'
    },
    {
      key: 'notify_transport_completed',
      label: language === 'sr' ? 'Transport završen' : 'Transport Completed',
      description: language === 'sr' ? 'Email kada je transport završen' : 'Email when transport is completed'
    },
    {
      key: 'notify_pickup_reminder',
      label: language === 'sr' ? 'Podsetnik' : 'Pickup Reminder',
      description: language === 'sr' ? 'Email podsetnik pre preuzimanja' : 'Reminder email before pickup'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="email-settings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <Mail className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {language === 'sr' ? 'Email Podešavanja' : 'Email Settings'}
            </h2>
            <p className="text-sm text-slate-500">
              {language === 'sr' 
                ? 'Konfiguriši email server i obaveštenja' 
                : 'Configure email server and notifications'}
            </p>
          </div>
        </div>
        <Badge variant={settings.enabled ? 'default' : 'secondary'} className={settings.enabled ? 'bg-green-600' : ''}>
          {settings.enabled 
            ? (language === 'sr' ? 'Aktivno' : 'Active') 
            : (language === 'sr' ? 'Neaktivno' : 'Inactive')}
        </Badge>
      </div>

      {/* SMTP Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            {language === 'sr' ? 'SMTP Konfiguracija' : 'SMTP Configuration'}
          </CardTitle>
          <CardDescription>
            {language === 'sr' 
              ? 'Podešavanja SMTP servera za slanje emailova' 
              : 'SMTP server settings for sending emails'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-medium">{language === 'sr' ? 'Email Servis' : 'Email Service'}</p>
                <p className="text-sm text-slate-500">
                  {language === 'sr' ? 'Uključi/isključi slanje emailova' : 'Enable/disable email sending'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>

          {/* SMTP Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{language === 'sr' ? 'SMTP Server' : 'SMTP Host'}</Label>
              <Input
                value={settings.smtp_host}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                placeholder="mailcluster.loopia.se"
              />
            </div>
            <div>
              <Label>{language === 'sr' ? 'Port' : 'Port'}</Label>
              <Input
                type="number"
                value={settings.smtp_port}
                onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 465 })}
                placeholder="465"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{language === 'sr' ? 'Email adresa pošiljaoca' : 'Sender Email'}</Label>
              <Input
                type="email"
                value={settings.sender_email}
                onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                placeholder="info@paramedic-care018.rs"
              />
            </div>
            <div>
              <Label>{language === 'sr' ? 'Lozinka' : 'Password'}</Label>
              <Input
                type="password"
                value={settings.sender_password}
                onChange={(e) => setSettings({ ...settings, sender_password: e.target.value })}
                placeholder="••••••••"
              />
              <p className="text-xs text-slate-500 mt-1">
                {language === 'sr' 
                  ? 'Ostavite prazno ako ne želite da menjate' 
                  : 'Leave empty to keep existing password'}
              </p>
            </div>
          </div>

          <div>
            <Label>{language === 'sr' ? 'Ime pošiljaoca' : 'Sender Name'}</Label>
            <Input
              value={settings.sender_name}
              onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
              placeholder="Paramedic Care 018"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Triggers Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {language === 'sr' ? 'Email Obaveštenja' : 'Email Notifications'}
          </CardTitle>
          <CardDescription>
            {language === 'sr' 
              ? 'Izaberite koje email obaveštenja želite da šaljete pacijentima' 
              : 'Choose which email notifications to send to patients'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationTriggers.map((trigger) => (
            <div key={trigger.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">{trigger.label}</p>
                <p className="text-sm text-slate-500">{trigger.description}</p>
              </div>
              <Switch
                checked={settings[trigger.key]}
                onCheckedChange={(checked) => setSettings({ ...settings, [trigger.key]: checked })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-sky-600 hover:bg-sky-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {language === 'sr' ? 'Sačuvaj podešavanja' : 'Save Settings'}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => { setShowTestDialog(true); setTestResult(null); }}
          className="gap-2"
        >
          <TestTube className="w-4 h-4" />
          {language === 'sr' ? 'Test Email' : 'Test Email'}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => { setShowLogs(true); fetchLogs(); }}
          className="gap-2"
        >
          <History className="w-4 h-4" />
          {language === 'sr' ? 'Logovi' : 'Logs'}
        </Button>
      </div>

      {/* Test Email Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              {language === 'sr' ? 'Test Email' : 'Test Email'}
            </DialogTitle>
            <DialogDescription>
              {language === 'sr' 
                ? 'Pošaljite test email da proverite konfiguraciju' 
                : 'Send a test email to verify configuration'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>{language === 'sr' ? 'Email adresa primaoca' : 'Recipient Email'}</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label>{language === 'sr' ? 'Naslov (opciono)' : 'Subject (optional)'}</Label>
              <Input
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                placeholder="Test Email - Paramedic Care 018"
              />
            </div>
            <div>
              <Label>{language === 'sr' ? 'Poruka (opciono)' : 'Message (optional)'}</Label>
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder={language === 'sr' ? 'Test poruka...' : 'Test message...'}
                rows={3}
              />
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                  <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                    {testResult.success 
                      ? (language === 'sr' ? 'Email uspešno poslat!' : 'Email sent successfully!') 
                      : testResult.error}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                {language === 'sr' ? 'Zatvori' : 'Close'}
              </Button>
              <Button onClick={handleTest} disabled={testing} className="gap-2 bg-sky-600 hover:bg-sky-700">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {language === 'sr' ? 'Pošalji' : 'Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {language === 'sr' ? 'Email Logovi' : 'Email Logs'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loadingLogs}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingLogs ? 'animate-spin' : ''}`} />
              {language === 'sr' ? 'Osveži' : 'Refresh'}
            </Button>
          </div>
          <div className="space-y-2 pt-2">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                {language === 'sr' ? 'Nema logova' : 'No logs'}
              </p>
            ) : (
              logs.map((log, idx) => (
                <div 
                  key={log.id || idx} 
                  className={`p-3 rounded-lg border ${log.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-mono text-sm">{log.to_email}</span>
                      {log.is_test && (
                        <Badge variant="outline" className="text-xs">TEST</Badge>
                      )}
                      {log.notification_type && (
                        <Badge variant="secondary" className="text-xs">{log.notification_type}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(log.sent_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 truncate">{log.subject}</p>
                  {log.error && (
                    <p className="text-xs text-red-600 mt-1">{log.error}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailSettings;
