import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FileText, 
  Plus, 
  Download, 
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  DollarSign,
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const InvoiceManager = () => {
  const { language } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [bookingsForInvoice, setBookingsForInvoice] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newInvoice, setNewInvoice] = useState({
    amount: '',
    service_description: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchBookingsForInvoice();
  }, []);

  const fetchInvoices = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await axios.get(`${API}/admin/invoices`);
      setInvoices(response.data);
      if (isRefresh) {
        toast.success(language === 'sr' ? 'Fakture osvežene' : 'Invoices refreshed');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju faktura' : 'Error loading invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBookingsForInvoice = async () => {
    try {
      const response = await axios.get(`${API}/admin/bookings-for-invoice`);
      setBookingsForInvoice(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const createInvoice = async () => {
    if (!selectedBooking || !newInvoice.amount || !newInvoice.service_description) {
      toast.error(language === 'sr' ? 'Popunite sva polja' : 'Fill in all fields');
      return;
    }

    setCreating(true);
    try {
      await axios.post(`${API}/admin/invoices`, null, {
        params: {
          booking_id: selectedBooking.id,
          amount: parseFloat(newInvoice.amount),
          service_description: newInvoice.service_description
        }
      });
      
      toast.success(language === 'sr' ? 'Faktura kreirana!' : 'Invoice created!');
      setShowCreateDialog(false);
      setSelectedBooking(null);
      setNewInvoice({ amount: '', service_description: '' });
      fetchInvoices();
      fetchBookingsForInvoice();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška' : 'Error'));
    } finally {
      setCreating(false);
    }
  };

  const updateInvoiceStatus = async (invoiceId, status) => {
    try {
      await axios.put(`${API}/admin/invoices/${invoiceId}/status?payment_status=${status}`);
      toast.success(language === 'sr' ? 'Status ažuriran' : 'Status updated');
      fetchInvoices();
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška' : 'Error');
    }
  };

  const downloadPDF = async (invoice) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoice.id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(language === 'sr' ? 'PDF preuzet' : 'PDF downloaded');
    } catch (error) {
      toast.error(language === 'sr' ? 'Greška pri preuzimanju' : 'Download error');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
      case 'cancelled': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      paid: { sr: 'Plaćeno', en: 'Paid' },
      pending: { sr: 'Na čekanju', en: 'Pending' },
      overdue: { sr: 'Zakasnelo', en: 'Overdue' },
      cancelled: { sr: 'Otkazano', en: 'Cancelled' }
    };
    return labels[status]?.[language] || status;
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (filter !== 'all' && invoice.payment_status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        invoice.invoice_number?.toLowerCase().includes(query) ||
        invoice.patient_name?.toLowerCase().includes(query) ||
        invoice.patient_email?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.payment_status === 'pending').length,
    paid: invoices.filter(i => i.payment_status === 'paid').length,
    totalAmount: invoices.filter(i => i.payment_status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0),
    pendingAmount: invoices.filter(i => i.payment_status === 'pending').reduce((sum, i) => sum + (i.total || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="invoice-manager">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {language === 'sr' ? 'Fakture' : 'Invoices'}
          </h1>
          <p className="text-slate-500 text-sm">
            {language === 'sr' ? 'Upravljajte fakturama i praćenjem plaćanja' : 'Manage invoices and payment tracking'}
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-sky-600 hover:bg-sky-700">
              <Plus className="w-4 h-4" />
              {language === 'sr' ? 'Nova faktura' : 'New Invoice'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{language === 'sr' ? 'Kreiraj novu fakturu' : 'Create New Invoice'}</DialogTitle>
              <DialogDescription>
                {language === 'sr' 
                  ? 'Izaberite završenu rezervaciju i unesite detalje fakture'
                  : 'Select a completed booking and enter invoice details'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Booking Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'sr' ? 'Izaberite rezervaciju' : 'Select Booking'}
                </label>
                {bookingsForInvoice.length === 0 ? (
                  <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-lg">
                    {language === 'sr' 
                      ? 'Nema završenih rezervacija bez fakture'
                      : 'No completed bookings without invoice'}
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {bookingsForInvoice.map(booking => (
                      <div
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedBooking?.id === booking.id
                            ? 'border-sky-500 bg-sky-50'
                            : 'border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{booking.patient_name}</span>
                          </div>
                          <span className="text-sm text-slate-500">{booking.preferred_date}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 truncate">
                          {booking.pickup_address} → {booking.destination_address}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedBooking && (
                <>
                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'sr' ? 'Iznos (RSD)' : 'Amount (RSD)'}
                    </label>
                    <Input
                      type="number"
                      value={newInvoice.amount}
                      onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                      placeholder="5000"
                    />
                    {newInvoice.amount && (
                      <p className="text-xs text-slate-500">
                        PDV (20%): {(parseFloat(newInvoice.amount) * 0.2).toFixed(2)} RSD | 
                        Ukupno: {(parseFloat(newInvoice.amount) * 1.2).toFixed(2)} RSD
                      </p>
                    )}
                  </div>
                  
                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {language === 'sr' ? 'Opis usluge' : 'Service Description'}
                    </label>
                    <Textarea
                      value={newInvoice.service_description}
                      onChange={(e) => setNewInvoice({ ...newInvoice, service_description: e.target.value })}
                      placeholder={language === 'sr' ? 'Medicinski transport pacijenta...' : 'Medical patient transport...'}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
              <Button 
                onClick={createInvoice} 
                disabled={creating || !selectedBooking}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {language === 'sr' ? 'Kreiraj fakturu' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">{language === 'sr' ? 'Ukupno' : 'Total'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
              <p className="text-xs text-slate-500">{language === 'sr' ? 'Na čekanju' : 'Pending'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.paid}</p>
              <p className="text-xs text-slate-500">{language === 'sr' ? 'Plaćeno' : 'Paid'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalAmount.toLocaleString()}</p>
              <p className="text-xs text-slate-500">RSD {language === 'sr' ? 'naplaćeno' : 'collected'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'sr' ? 'Pretraži fakture...' : 'Search invoices...'}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'sr' ? 'Sve' : 'All'}</SelectItem>
            <SelectItem value="pending">{language === 'sr' ? 'Na čekanju' : 'Pending'}</SelectItem>
            <SelectItem value="paid">{language === 'sr' ? 'Plaćeno' : 'Paid'}</SelectItem>
            <SelectItem value="overdue">{language === 'sr' ? 'Zakasnelo' : 'Overdue'}</SelectItem>
            <SelectItem value="cancelled">{language === 'sr' ? 'Otkazano' : 'Cancelled'}</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          onClick={() => fetchInvoices(true)} 
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {language === 'sr' ? 'Osveži' : 'Refresh'}
        </Button>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>{language === 'sr' ? 'Nema faktura' : 'No invoices found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    {language === 'sr' ? 'Br. fakture' : 'Invoice #'}
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    {language === 'sr' ? 'Kupac' : 'Customer'}
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    {language === 'sr' ? 'Datum' : 'Date'}
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    {language === 'sr' ? 'Dospeće' : 'Due Date'}
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    {language === 'sr' ? 'Iznos' : 'Amount'}
                  </th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    {language === 'sr' ? 'Akcije' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map(invoice => {
                  // Check if invoice is overdue
                  const isOverdue = invoice.due_date && 
                    new Date(invoice.due_date) < new Date() && 
                    invoice.payment_status !== 'paid' && 
                    invoice.payment_status !== 'cancelled';
                  const effectiveStatus = isOverdue ? 'overdue' : invoice.payment_status;
                  
                  return (
                  <tr key={invoice.id} className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-slate-900">
                        {invoice.invoice_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{invoice.patient_name}</p>
                        <p className="text-xs text-slate-500">{invoice.patient_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900">{invoice.created_at?.slice(0, 10)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-900'}`}>
                        <p className="text-sm">{invoice.due_date?.slice(0, 10) || '-'}</p>
                        {isOverdue && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {language === 'sr' ? 'Isteklo' : 'Overdue'}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {invoice.total?.toLocaleString()} RSD
                      </p>
                      <p className="text-xs text-slate-500">
                        {language === 'sr' ? 'PDV' : 'VAT'}: {invoice.tax?.toLocaleString()} RSD
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Select
                        value={effectiveStatus}
                        onValueChange={(value) => updateInvoiceStatus(invoice.id, value)}
                      >
                        <SelectTrigger className={`w-32 h-8 ${getStatusColor(effectiveStatus)} border`}>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(effectiveStatus)}
                            <span className="text-xs">{getStatusLabel(effectiveStatus)}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{language === 'sr' ? 'Na čekanju' : 'Pending'}</SelectItem>
                          <SelectItem value="paid">{language === 'sr' ? 'Plaćeno' : 'Paid'}</SelectItem>
                          <SelectItem value="overdue">{language === 'sr' ? 'Zakasnelo' : 'Overdue'}</SelectItem>
                          <SelectItem value="cancelled">{language === 'sr' ? 'Otkazano' : 'Cancelled'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPDF(invoice)}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceManager;
