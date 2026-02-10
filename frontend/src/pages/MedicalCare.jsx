import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Stethoscope, 
  HeartPulse, 
  Siren,
  UserCheck,
  Clock,
  Shield,
  CheckCircle,
  Phone
} from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';
import { formatContent } from '../utils/formatContent';

const API = process.env.REACT_APP_BACKEND_URL;

const MedicalCare = () => {
  const { language } = useLanguage();
  const [pageContent, setPageContent] = useState(null);

  // Fetch medical care page content from CMS
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/api/pages/medical-care`);
        const content = {};
        response.data.forEach(item => {
          content[item.section] = item;
        });
        setPageContent(content);
      } catch (error) {
        console.log('Using default medical care content');
      }
    };
    fetchContent();
  }, []);

  // Get content from CMS or use defaults
  const heroTitle = pageContent?.hero?.[language === 'sr' ? 'title_sr' : 'title_en'] || 
    (language === 'sr' ? 'Profesionalna Medicinska Pomoć' : 'Professional Medical Assistance');
  
  const heroSubtitle = pageContent?.hero?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr'
      ? 'Pružamo vrhunsku medicinsku negu sa fokusom na bezbednost i udobnost pacijenata. Naš tim je dostupan 24 sata dnevno, 7 dana u nedelji.'
      : 'We provide top-quality medical care with a focus on patient safety and comfort. Our team is available 24 hours a day, 7 days a week.');
  
  const heroImage = pageContent?.hero?.image_url || null;

  const servicesTitle = pageContent?.['services-title']?.[language === 'sr' ? 'title_sr' : 'title_en'] || 
    (language === 'sr' ? 'Naše Usluge' : 'Our Services');
  
  const servicesSubtitle = pageContent?.['services-title']?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr' ? 'Pružamo kompletnu medicinsku negu prilagođenu vašim potrebama' : 'We provide complete medical care tailored to your needs');

  const teamTitle = pageContent?.team?.[language === 'sr' ? 'title_sr' : 'title_en'] || 
    (language === 'sr' ? 'Naš Tim Profesionalaca' : 'Our Team of Professionals');
  
  const teamContent = pageContent?.team?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr'
      ? 'Naš medicinski tim čine iskusni profesionalci koji su posvećeni pružanju najbolje moguće nege. Svaki član tima prolazi redovne obuke kako bi bio u toku sa najnovijim medicinskim praksama.'
      : 'Our medical team consists of experienced professionals dedicated to providing the best possible care. Each team member undergoes regular training to stay up-to-date with the latest medical practices.');
  
  const teamImage = pageContent?.team?.image_url || null;

  const ctaTitle = pageContent?.cta?.[language === 'sr' ? 'title_sr' : 'title_en'] || 
    (language === 'sr' ? 'Potrebna vam je pomoć?' : 'Need Assistance?');
  
  const ctaContent = pageContent?.cta?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr' ? 'Naš tim je spreman da vam pomogne. Kontaktirajte nas danas.' : 'Our team is ready to help you. Contact us today.');

  const services = [
    {
      icon: Siren,
      title: language === 'sr' ? 'Hitna medicinska pomoć' : 'Emergency Medical Assistance',
      description: language === 'sr' 
        ? 'Brza i profesionalna hitna medicinska pomoć dostupna 24/7. Naš tim je obučen za sve vrste hitnih situacija.'
        : 'Fast and professional emergency medical assistance available 24/7. Our team is trained for all types of emergencies.',
      features: language === 'sr' 
        ? ['Brzi odziv', 'Profesionalna oprema', 'Obučeno osoblje']
        : ['Fast response', 'Professional equipment', 'Trained staff']
    },
    {
      icon: HeartPulse,
      title: language === 'sr' ? 'Medicinska stabilizacija' : 'On-site Medical Stabilization',
      description: language === 'sr'
        ? 'Stručna medicinska stabilizacija na licu mesta pre transporta. Osiguravamo da su pacijenti stabilni pre pomeranja.'
        : 'Expert on-site medical stabilization before transport. We ensure patients are stable before moving.',
      features: language === 'sr'
        ? ['Monitoring vitalnih funkcija', 'Hitne intervencije', 'Priprema za transport']
        : ['Vital signs monitoring', 'Emergency interventions', 'Transport preparation']
    },
    {
      icon: UserCheck,
      title: language === 'sr' ? 'Profesionalno medicinsko osoblje' : 'Professional Medical Staff',
      description: language === 'sr'
        ? 'Tim stručnih lekara i medicinskih sestara sa višegodišnjim iskustvom u hitnoj medicini.'
        : 'Team of professional doctors and nurses with years of experience in emergency medicine.',
      features: language === 'sr'
        ? ['Licencirani lekari', 'Iskusne medicinske sestre', 'Kontinuirana edukacija']
        : ['Licensed doctors', 'Experienced nurses', 'Continuous education']
    }
  ];

  const stats = [
    { value: '24/7', label: language === 'sr' ? 'Dostupnost' : 'Availability' },
    { value: '15+', label: language === 'sr' ? 'Godina iskustva' : 'Years Experience' },
    { value: '1000+', label: language === 'sr' ? 'Pacijenata' : 'Patients' },
    { value: '100%', label: language === 'sr' ? 'Posvećenost' : 'Dedication' },
  ];

  return (
    <div className="min-h-screen" data-testid="medical-care-page">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-white -z-10" />
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Stethoscope className="w-4 h-4" />
                {language === 'sr' ? 'Medicinska Nega' : 'Medical Care'}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
                {heroTitle}
              </h1>
              
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                {heroSubtitle}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/booking">
                  <Button className="btn-primary gap-2" data-testid="medical-booking-btn">
                    {language === 'sr' ? 'Zakažite' : 'Book Now'}
                  </Button>
                </Link>
                <a href="tel:+381668101007">
                  <Button variant="outline" className="btn-outline gap-2">
                    <Phone className="w-4 h-4" />
                    +381 66 81 01 007
                  </Button>
                </a>
              </div>
            </div>

            <div className="relative">
              <img
                src={heroImage}
                alt="Doctor"
                className="rounded-2xl shadow-2xl w-full h-[400px] object-cover"
              />
              <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      {language === 'sr' ? 'Poverenje' : 'Trust'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {language === 'sr' ? '15+ godina' : '15+ years'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-sky-600">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sky-100 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-spacing">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {servicesTitle}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {servicesSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, i) => (
              <div 
                key={i} 
                className="card-base service-medical hover:shadow-lg transition-shadow"
                data-testid={`service-card-${i}`}
              >
                <div className="w-14 h-14 bg-sky-100 rounded-xl flex items-center justify-center mb-6">
                  <service.icon className="w-7 h-7 text-sky-600" />
                </div>
                
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {service.title}
                </h3>
                
                <p className="text-slate-600 mb-6">
                  {service.description}
                </p>
                
                <ul className="space-y-2">
                  {service.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-sky-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Image */}
      <section className="section-spacing bg-slate-50">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src={teamImage}
                alt="Medical team"
                className="rounded-2xl shadow-xl w-full h-[400px] object-cover"
              />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                {teamTitle}
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                {teamContent}
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-600" />
                  <span className="text-slate-700">
                    {language === 'sr' ? 'Licencirani lekari' : 'Licensed doctors'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-600" />
                  <span className="text-slate-700">
                    {language === 'sr' ? 'Iskusne medicinske sestre' : 'Experienced nurses'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-600" />
                  <span className="text-slate-700">
                    {language === 'sr' ? 'Kontinuirana edukacija' : 'Continuous education'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-sky-600">
        <div className="section-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {ctaTitle}
          </h2>
          <p className="text-lg text-sky-100 mb-8 max-w-xl mx-auto">
            {ctaContent}
          </p>
          <Link to="/contact">
            <Button className="bg-white text-sky-600 hover:bg-sky-50 rounded-full px-8 py-3 font-medium">
              {language === 'sr' ? 'Kontaktirajte Nas' : 'Contact Us'}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default MedicalCare;
