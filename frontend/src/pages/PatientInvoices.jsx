import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FileText,
  Download,
  ChevronLeft,
  CheckCircle,
  Clock,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const PatientInvoices = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/api/patient/invoices`);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD' }).format(amount);
  };

  const downloadInvoice = (invoice) => {
    // Generate a simple invoice HTML and open in new window for printing
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${language === 'sr' ? 'Faktura' : 'Invoice'} ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .company { font-size: 24px; font-weight: bold; color: #0ea5e9; }
          .invoice-title { font-size: 32px; color: #333; }
          .invoice-number { color: #666; margin-top: 10px; }
          .section { margin-bottom: 30px; }
          .section-title { font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 2px solid #0ea5e9; padding-bottom: 5px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { color: #666; }
          .value { font-weight: 500; }
          .total-row { font-size: 18px; font-weight: bold; background: #f8fafc; padding: 15px; margin-top: 20px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">Paramedic Care 018</div>
            <div>Žarka Zrenjanina 50A</div>
            <div>18103 Niš, Serbia</div>
            <div>PIB: 115243796</div>
          </div>
          <div style="text-align: right;">
            <div class="invoice-title">${language === 'sr' ? 'FAKTURA' : 'INVOICE'}</div>
            <div class="invoice-number">${invoice.invoice_number}</div>
            <div style="margin-top: 10px;">${new Date(invoice.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">${language === 'sr' ? 'Podaci o pacijentu' : 'Patient Information'}</div>
          <div class="row"><span class="label">${language === 'sr' ? 'Ime' : 'Name'}:</span> <span class="value">${invoice.patient_name}</span></div>
          <div class="row"><span class="label">Email:</span> <span class="value">${invoice.patient_email}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">${language === 'sr' ? 'Detalji usluge' : 'Service Details'}</div>
          <div class="row"><span class="label">${language === 'sr' ? 'Datum usluge' : 'Service Date'}:</span> <span class="value">${invoice.service_date}</span></div>
          <div class="row"><span class="label">${language === 'sr' ? 'Opis' : 'Description'}:</span> <span class="value">${invoice.service_description}</span></div>
          <div class="row"><span class="label">${language === 'sr' ? 'Polazište' : 'Pickup'}:</span> <span class="value">${invoice.pickup_address}</span></div>
          <div class="row"><span class="label">${language === 'sr' ? 'Odredište' : 'Destination'}:</span> <span class="value">${invoice.destination_address}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">${language === 'sr' ? 'Iznos' : 'Amount'}</div>
          <div class="row"><span class="label">${language === 'sr' ? 'Osnovica' : 'Subtotal'}:</span> <span class="value">${formatCurrency(invoice.amount)}</span></div>
          <div class="row"><span class="label">${language === 'sr' ? 'PDV (20%)' : 'VAT (20%)'}:</span> <span class="value">${formatCurrency(invoice.tax)}</span></div>
          <div class="total-row"><span>${language === 'sr' ? 'UKUPNO' : 'TOTAL'}:</span> <span>${formatCurrency(invoice.total)}</span></div>
        </div>
        
        <div class="section">
          <div class="row"><span class="label">${language === 'sr' ? 'Status plaćanja' : 'Payment Status'}:</span> <span class="value">${invoice.payment_status === 'paid' ? (language === 'sr' ? 'Plaćeno' : 'Paid') : (language === 'sr' ? 'Na čekanju' : 'Pending')}</span></div>
          <div class="row"><span class="label">${language === 'sr' ? 'Rok plaćanja' : 'Due Date'}:</span> <span class="value">${new Date(invoice.due_date).toLocaleDateString()}</span></div>
        </div>
        
        <div class="footer">
          <p>Paramedic Care 018 | info@paramedic-care018.rs | +381 66 81 01 007</p>
        </div>
        
        <script>window.print();</script>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="patient-invoices">
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
              {language === 'sr' ? 'Fakture i plaćanja' : 'Invoices & Payments'}
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {language === 'sr' ? 'Nema faktura' : 'No invoices'}
            </h3>
            <p className="text-slate-500">
              {language === 'sr' 
                ? 'Nemate još nijednu fakturu' 
                : 'You don\'t have any invoices yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map(invoice => (
              <div 
                key={invoice.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-slate-500">{invoice.service_description}</p>
                  </div>
                  <Badge className={invoice.payment_status === 'paid' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                  }>
                    {invoice.payment_status === 'paid' ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> {language === 'sr' ? 'Plaćeno' : 'Paid'}</>
                    ) : (
                      <><Clock className="w-3 h-3 mr-1" /> {language === 'sr' ? 'Na čekanju' : 'Pending'}</>
                    )}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{invoice.service_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-900">{formatCurrency(invoice.total)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    {language === 'sr' ? 'Rok' : 'Due'}: {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => downloadInvoice(invoice)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientInvoices;
