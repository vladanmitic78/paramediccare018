import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Loader2,
  CheckCircle,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Contact = () => {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/contact`, formData);
      setSuccess(true);
      toast.success(t('contact_success'));
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Contact error:', error);
      toast.error(language === 'sr' ? 'Greška pri slanju poruke' : 'Error sending message');
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: t('contact_address'),
      lines: ['Žarka Zrenjanina 50A', '18103 Niš (Pantelej), Serbia']
    },
    {
      icon: Phone,
      title: language === 'sr' ? 'Telefon' : 'Phone',
      lines: ['+381 18 123 456'],
      link: 'tel:+38118123456'
    },
    {
      icon: Mail,
      title: 'Email',
      lines: ['transport@paramedic-care018.rs'],
      link: 'mailto:transport@paramedic-care018.rs'
    },
    {
      icon: Clock,
      title: language === 'sr' ? 'Radno Vreme' : 'Working Hours',
      lines: ['24/7']
    }
  ];

  return (
    <div className="min-h-screen" data-testid="contact-page">
      {/* Hero */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-slate-50 to-white">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Mail className="w-4 h-4" />
              {t('contact_title')}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t('contact_subtitle')}
            </h1>
            <p className="text-lg text-slate-600">
              {language === 'sr'
                ? 'Imate pitanja? Kontaktirajte nas putem forme ili direktno.'
                : 'Have questions? Contact us via form or directly.'}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="section-spacing">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">
                {language === 'sr' ? 'Kontakt Informacije' : 'Contact Information'}
              </h2>
              
              {contactInfo.map((item, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  data-testid={`contact-info-${i}`}
                >
                  <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 mb-1">{item.title}</p>
                    {item.lines.map((line, j) => (
                      item.link ? (
                        <a 
                          key={j}
                          href={item.link}
                          className="block text-slate-600 hover:text-sky-600 transition-colors"
                        >
                          {line}
                        </a>
                      ) : (
                        <p key={j} className="text-slate-600">{line}</p>
                      )
                    ))}
                  </div>
                </div>
              ))}

              {/* Map */}
              <div className="rounded-xl overflow-hidden border border-slate-200 h-48">
                <iframe
                  src="https://www.openstreetmap.org/export/embed.html?bbox=21.885%2C43.315%2C21.905%2C43.325&layer=mapnik&marker=43.32%2C21.895"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  title="Office location"
                ></iframe>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              {success ? (
                <div className="card-base text-center py-12" data-testid="contact-success">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {t('contact_success')}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {language === 'sr'
                      ? 'Vaša poruka je uspešno poslata. Odgovorićemo vam uskoro.'
                      : 'Your message has been sent successfully. We will respond soon.'}
                  </p>
                  <Button onClick={() => setSuccess(false)} className="btn-primary">
                    {language === 'sr' ? 'Pošalji novu poruku' : 'Send another message'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="card-base">
                  <h2 className="text-xl font-semibold text-slate-900 mb-6">
                    {language === 'sr' ? 'Pošaljite nam poruku' : 'Send us a message'}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        {t('contact_name')} *
                      </label>
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder={language === 'sr' ? 'Vaše ime' : 'Your name'}
                        required
                        data-testid="contact-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        {t('contact_email')} *
                      </label>
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="email@example.com"
                        required
                        data-testid="contact-email-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <label className="text-sm font-medium text-slate-700">
                      {t('contact_phone')}
                    </label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+381..."
                      data-testid="contact-phone-input"
                    />
                  </div>

                  <div className="space-y-2 mb-6">
                    <label className="text-sm font-medium text-slate-700">
                      {t('contact_message')} *
                    </label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder={language === 'sr' ? 'Vaša poruka...' : 'Your message...'}
                      rows={5}
                      required
                      data-testid="contact-message-input"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="btn-primary w-full md:w-auto"
                    disabled={loading}
                    data-testid="contact-submit-btn"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {language === 'sr' ? 'Slanje...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {t('contact_submit')}
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="py-12 bg-red-600">
        <div className="section-container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-white mb-2">
                {language === 'sr' ? 'Hitni Slučaj?' : 'Emergency?'}
              </h3>
              <p className="text-red-100">
                {language === 'sr'
                  ? 'Pozovite nas odmah za hitne situacije'
                  : 'Call us immediately for emergencies'}
              </p>
            </div>
            <a href="tel:+38118123456">
              <Button className="bg-white text-red-600 hover:bg-red-50 rounded-full px-8 py-6 text-lg font-semibold">
                <Phone className="w-5 h-5 mr-2" />
                +381 18 123 456
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
