import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  Settings,
  Send,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Phone,
  Key,
  Globe,
  Server,
  ChevronDown,
  History,
  TestTube,
  Shield
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
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

const SMSSettings = ({ language = 'sr' }) => {
  const [settings, setSettings] = useState({
    provider: 'textbelt',
    api_key: 'textbelt',
    api_secret: '',
    sender_id: '',
    custom_endpoint: '',
    custom_headers: '',
    custom_payload_template: '',
    enabled: true
  });
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testPhone, setTestPhone] = useState('');
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
      const response = await axios.get(`${API}/api/settings/sms`);
      const data = response.data;
      setSettings({
        provider: data.provider || 'textbelt',
        api_key: data.api_key || 'textbelt',
        api_secret: data.api_secret || '',
        sender_id: data.sender_id || '',
        custom_endpoint: data.custom_endpoint || '',
        custom_headers: data.custom_headers ? JSON.stringify(data.custom_headers, null, 2) : '',
        custom_payload_template: data.custom_payload_template || '',
        enabled: data.enabled !== false
      });
      setProviders(data.providers_available || []);
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri učitavanju podešavanja' : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let customHeaders = null;
      if (settings.custom_headers) {
        try {
          customHeaders = JSON.parse(settings.custom_headers);
        } catch {
          toast.error(language === 'sr' ? 'Neispravan JSON format za headers' : 'Invalid JSON format for headers');
          setSaving(false);
          return;
        }
      }

      await axios.put(`${API}/api/settings/sms`, {
        provider: settings.provider,
        api_key: settings.api_key,
        api_secret: settings.api_secret || null,
        sender_id: settings.sender_id || null,
        custom_endpoint: settings.custom_endpoint || null,
        custom_headers: customHeaders,
        custom_payload_template: settings.custom_payload_template || null,
        enabled: settings.enabled
      });
      toast.success(language === 'sr' ? 'Podešavanja sačuvana' : 'Settings saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri čuvanju' : 'Error saving'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone) {
      toast.error(language === 'sr' ? 'Unesite broj telefona' : 'Enter phone number');
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    try {
      const response = await axios.post(`${API}/api/settings/sms/test`, {
        phone: testPhone,
        message: testMessage || `Test SMS - Paramedic Care 018 - ${new Date().toLocaleTimeString()}`
      });
      setTestResult(response.data);
      if (response.data.success) {
        toast.success(language === 'sr' ? 'SMS uspešno poslat!' : 'SMS sent successfully!');
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: error.response?.data?.detail || 'Unknown error' 
      });
      toast.error(language === 'sr' ? 'Greška pri slanju' : 'Error sending');
    } finally {
      setTesting(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await axios.get(`${API}/api/settings/sms/logs?limit=50`);
      setLogs(response.data);
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri učitavanju logova' : 'Error loading logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const getProviderFields = () => {
    switch (settings.provider) {
      case 'textbelt':
        return (
          <div className="space-y-4">
            <div>
              <Label>{language === 'sr' ? 'API Ključ' : 'API Key'}</Label>
              <Input
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                placeholder="textbelt (free) or your paid key"
              />
              <p className="text-xs text-slate-500 mt-1">
                {language === 'sr' 
                  ? 'Koristite "textbelt" za besplatni nivo (1 SMS/dan po broju)' 
                  : 'Use "textbelt" for free tier (1 SMS/day per number)'}
              </p>
            </div>
          </div>
        );
      case 'twilio':
        return (
          <div className="space-y-4">
            <div>
              <Label>Account SID</Label>
              <Input
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <Label>Auth Token</Label>
              <Input
                type="password"
                value={settings.api_secret}
                onChange={(e) => setSettings({ ...settings, api_secret: e.target.value })}
                placeholder="Your Twilio Auth Token"
              />
            </div>
            <div>
              <Label>{language === 'sr' ? 'Broj pošiljaoca' : 'From Number'}</Label>
              <Input
                value={settings.sender_id}
                onChange={(e) => setSettings({ ...settings, sender_id: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
          </div>
        );
      case 'infobip':
        return (
          <div className="space-y-4">
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                placeholder="Your Infobip API Key"
              />
            </div>
            <div>
              <Label>{language === 'sr' ? 'ID pošiljaoca (opciono)' : 'Sender ID (optional)'}</Label>
              <Input
                value={settings.sender_id}
                onChange={(e) => setSettings({ ...settings, sender_id: e.target.value })}
                placeholder="ParaCare"
              />
            </div>
          </div>
        );
      case 'custom':
        return (
          <div className="space-y-4">
            <div>
              <Label>{language === 'sr' ? 'HTTP Endpoint' : 'HTTP Endpoint'}</Label>
              <Input
                value={settings.custom_endpoint}
                onChange={(e) => setSettings({ ...settings, custom_endpoint: e.target.value })}
                placeholder="https://api.example.com/sms/send"
              />
            </div>
            <div>
              <Label>{language === 'sr' ? 'API Ključ (Bearer token)' : 'API Key (Bearer token)'}</Label>
              <Input
                type="password"
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                placeholder="Your API key"
              />
            </div>
            <div>
              <Label>{language === 'sr' ? 'Custom Headers (JSON)' : 'Custom Headers (JSON)'}</Label>
              <Textarea
                value={settings.custom_headers}
                onChange={(e) => setSettings({ ...settings, custom_headers: e.target.value })}
                placeholder='{"X-Custom-Header": "value"}'
                rows={3}
              />
            </div>
            <div>
              <Label>{language === 'sr' ? 'Payload Template (JSON)' : 'Payload Template (JSON)'}</Label>
              <Textarea
                value={settings.custom_payload_template}
                onChange={(e) => setSettings({ ...settings, custom_payload_template: e.target.value })}
                placeholder='{"to": "{phone}", "body": "{message}"}'
                rows={3}
              />
              <p className="text-xs text-slate-500 mt-1">
                {language === 'sr' 
                  ? 'Koristite {phone} i {message} kao placeholder-e' 
                  : 'Use {phone} and {message} as placeholders'}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sms-settings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {language === 'sr' ? 'SMS Gateway Podešavanja' : 'SMS Gateway Settings'}
            </h2>
            <p className="text-sm text-slate-500">
              {language === 'sr' 
                ? 'Konfiguriši SMS provajdera za slanje obaveštenja' 
                : 'Configure SMS provider for sending notifications'}
            </p>
          </div>
        </div>
        <Badge variant={settings.enabled ? 'default' : 'secondary'} className={settings.enabled ? 'bg-green-600' : ''}>
          {settings.enabled 
            ? (language === 'sr' ? 'Aktivno' : 'Active') 
            : (language === 'sr' ? 'Neaktivno' : 'Inactive')}
        </Badge>
      </div>

      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {language === 'sr' ? 'Konfiguracija provajdera' : 'Provider Configuration'}
          </CardTitle>
          <CardDescription>
            {language === 'sr' 
              ? 'Izaberite SMS provajdera i unesite potrebne kredencijale' 
              : 'Select SMS provider and enter required credentials'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-medium">{language === 'sr' ? 'SMS Servis' : 'SMS Service'}</p>
                <p className="text-sm text-slate-500">
                  {language === 'sr' ? 'Uključi/isključi slanje SMS poruka' : 'Enable/disable SMS sending'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>{language === 'sr' ? 'SMS Provajder' : 'SMS Provider'}</Label>
            <Select
              value={settings.provider}
              onValueChange={(value) => setSettings({ ...settings, provider: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{provider.name}</span>
                      <span className="text-xs text-slate-500">{provider.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider-specific fields */}
          {getProviderFields()}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {language === 'sr' ? 'Sačuvaj podešavanja' : 'Save Settings'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { setShowTestDialog(true); setTestResult(null); }}
              className="gap-2"
            >
              <TestTube className="w-4 h-4" />
              {language === 'sr' ? 'Test SMS' : 'Test SMS'}
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
        </CardContent>
      </Card>

      {/* Provider Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={settings.provider === 'textbelt' ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Textbelt (Free)</h4>
                <p className="text-sm text-slate-500">
                  {language === 'sr' 
                    ? '1 SMS dnevno po broju telefona. Idealno za testiranje.' 
                    : '1 SMS per day per phone number. Ideal for testing.'}
                </p>
                <a 
                  href="https://textbelt.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                >
                  textbelt.com →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={settings.provider === 'twilio' ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Phone className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium">Twilio</h4>
                <p className="text-sm text-slate-500">
                  {language === 'sr' 
                    ? 'Profesionalno rešenje sa globalnim dosegom.' 
                    : 'Professional solution with global reach.'}
                </p>
                <a 
                  href="https://www.twilio.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                >
                  twilio.com →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test SMS Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              {language === 'sr' ? 'Test SMS' : 'Test SMS'}
            </DialogTitle>
            <DialogDescription>
              {language === 'sr' 
                ? 'Pošaljite test poruku da proverite konfiguraciju' 
                : 'Send a test message to verify configuration'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>{language === 'sr' ? 'Broj telefona' : 'Phone Number'}</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+381641234567"
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
                      ? (language === 'sr' ? 'SMS uspešno poslat!' : 'SMS sent successfully!') 
                      : testResult.error}
                  </span>
                </div>
                {testResult.message_id && (
                  <p className="text-xs text-slate-500 mt-2">
                    Message ID: {testResult.message_id}
                  </p>
                )}
                {testResult.quota_remaining !== undefined && (
                  <p className="text-xs text-slate-500">
                    {language === 'sr' ? 'Preostala kvota:' : 'Quota remaining:'} {testResult.quota_remaining}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                {language === 'sr' ? 'Zatvori' : 'Close'}
              </Button>
              <Button onClick={handleTest} disabled={testing} className="gap-2">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {language === 'sr' ? 'Pošalji' : 'Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {language === 'sr' ? 'SMS Logovi' : 'SMS Logs'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-4">
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
                      <span className="font-mono text-sm">{log.phone}</span>
                      {log.is_test && (
                        <Badge variant="outline" className="text-xs">TEST</Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(log.sent_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 truncate">{log.message}</p>
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

export default SMSSettings;
