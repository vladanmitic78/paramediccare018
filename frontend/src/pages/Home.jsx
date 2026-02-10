import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Ambulance, 
  Stethoscope, 
  HeartPulse, 
  Building2, 
  Home as HomeIcon,
  Phone,
  Clock,
  Shield,
  ArrowRight,
  Siren
} from 'lucide-react';
import { Button } from '../components/ui/button';
import PWAInstallBanner from '../components/PWAInstallBanner';
import axios from 'axios';
import { formatContent } from '../utils/formatContent';

const API = process.env.REACT_APP_BACKEND_URL;

const Home = () => {
  const { t, language } = useLanguage();
  const [homeContent, setHomeContent] = useState(null);

  // Fetch home page content from CMS
  useEffect(() => {
    const fetchHomeContent = async () => {
      try {
        const response = await axios.get(`${API}/api/pages/home`);
        const content = {};
        response.data.forEach(item => {
          content[item.section] = item;
        });
        setHomeContent(content);
      } catch (error) {
        console.log('Using default home content');
      }
    };
    fetchHomeContent();
  }, []);

  // Get content from CMS or use defaults
  const heroTitle = homeContent?.hero?.[language === 'sr' ? 'title_sr' : 'title_en'] || t('hero_title');
  const heroSubtitle = homeContent?.hero?.[language === 'sr' ? 'content_sr' : 'content_en'] || t('hero_subtitle');
  const heroImage = homeContent?.hero?.image_url || null; // No fallback - use gradient if no image
  
  const servicesTitle = homeContent?.['services-title']?.[language === 'sr' ? 'title_sr' : 'title_en'] || t('services_title');
  const servicesSubtitle = homeContent?.['services-title']?.[language === 'sr' ? 'content_sr' : 'content_en'] || t('services_subtitle');
  
  const ctaTitle = homeContent?.cta?.[language === 'sr' ? 'title_sr' : 'title_en'] || 
    (language === 'sr' ? 'Potreban vam je transport?' : 'Need Transport?');
  const ctaText = homeContent?.cta?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr' 
      ? 'Zakažite medicinski transport brzo i jednostavno. Naš tim je spreman da vam pomogne.'
      : 'Book medical transport quickly and easily. Our team is ready to help you.');
  
  const emergencyPhone = homeContent?.['emergency-phone']?.[language === 'sr' ? 'content_sr' : 'content_en'] || '+381 66 81 01 007';

  // Gallery section title from CMS
  const galleryTitle = homeContent?.['gallery-title']?.[language === 'sr' ? 'title_sr' : 'title_en'] || 
    (language === 'sr' ? 'Galerija' : 'Gallery');

  // Gallery images from CMS (gallery-1, gallery-2, gallery-3, gallery-4) - only show if loaded
  const galleryImages = [
    {
      src: homeContent?.['gallery-1']?.image_url || null,
      alt: homeContent?.['gallery-1']?.[language === 'sr' ? 'title_sr' : 'title_en'] || 'Paramedic team',
      className: 'col-span-2 row-span-2',
      imgClassName: 'w-full h-full object-cover'
    },
    {
      src: homeContent?.['gallery-2']?.image_url || null,
      alt: homeContent?.['gallery-2']?.[language === 'sr' ? 'title_sr' : 'title_en'] || 'Doctor',
      className: '',
      imgClassName: 'w-full h-48 object-cover'
    },
    {
      src: homeContent?.['gallery-3']?.image_url || null,
      alt: homeContent?.['gallery-3']?.[language === 'sr' ? 'title_sr' : 'title_en'] || 'Nurse',
      className: '',
      imgClassName: 'w-full h-48 object-cover'
    },
    {
      src: homeContent?.['gallery-4']?.image_url || null,
      alt: homeContent?.['gallery-4']?.[language === 'sr' ? 'title_sr' : 'title_en'] || 'Hospital',
      className: 'col-span-2',
      imgClassName: 'w-full h-48 object-cover'
    }
  ].filter(img => img.src); // Filter out images without src

  const medicalServices = [
    { 
      icon: Siren, 
      title: language === 'sr' ? 'Hitna medicinska pomoć' : 'Emergency Medical Assistance',
      desc: language === 'sr' ? 'Brza i profesionalna hitna medicinska pomoć dostupna 24/7.' : 'Fast and professional emergency medical assistance available 24/7.'
    },
    { 
      icon: HeartPulse, 
      title: language === 'sr' ? 'Medicinska stabilizacija' : 'On-site Stabilization',
      desc: language === 'sr' ? 'Stručna medicinska stabilizacija na licu mesta.' : 'Expert on-site medical stabilization.'
    },
    { 
      icon: Stethoscope, 
      title: language === 'sr' ? 'Profesionalno osoblje' : 'Professional Staff',
      desc: language === 'sr' ? 'Tim stručnih lekara i medicinskih sestara.' : 'Team of professional doctors and nurses.'
    },
  ];

  const transportServices = [
    { 
      icon: Ambulance, 
      title: language === 'sr' ? 'Transport sanitetom' : 'Ambulance Transport',
      desc: language === 'sr' ? 'Siguran transport specijalizovanim sanitetskim vozilom.' : 'Safe transport in specialized ambulance vehicle.'
    },
    { 
      icon: Building2, 
      title: language === 'sr' ? 'Transport između bolnica' : 'Hospital-to-Hospital',
      desc: language === 'sr' ? 'Profesionalan transport između zdravstvenih ustanova.' : 'Professional transport between healthcare facilities.'
    },
    { 
      icon: HomeIcon, 
      title: language === 'sr' ? 'Transport od kuće' : 'Home-to-Hospital',
      desc: language === 'sr' ? 'Bezbedna vožnja od vašeg doma do bolnice.' : 'Safe ride from your home to the hospital.'
    },
  ];

  const features = [
    { icon: Clock, label: language === 'sr' ? 'Dostupni 24/7' : 'Available 24/7' },
    { icon: Shield, label: language === 'sr' ? 'Bezbednost' : 'Safety' },
    { icon: HeartPulse, label: language === 'sr' ? 'Profesionalnost' : 'Professionalism' },
  ];

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-gradient py-16 md:py-24 lg:py-32">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Clock className="w-4 h-4" />
                {language === 'sr' ? 'Dostupni 24/7' : 'Available 24/7'}
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6">
                {heroTitle}
              </h1>
              
              <div className="mb-8 max-w-xl">
                {formatContent(heroSubtitle, 'sky')}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/booking">
                  <Button className="btn-urgent w-full sm:w-auto gap-2" data-testid="hero-booking-btn">
                    <Ambulance className="w-5 h-5" />
                    {t('hero_cta_booking')}
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" className="btn-outline w-full sm:w-auto gap-2" data-testid="hero-contact-btn">
                    <Phone className="w-5 h-5" />
                    {t('hero_cta_contact')}
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-6 mt-10 pt-10 border-t border-slate-200">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-600">
                    <feature.icon className="w-5 h-5 text-sky-600" />
                    <span className="text-sm font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt="Ambulance"
                    className="w-full h-[400px] lg:h-[500px] object-cover"
                  />
                ) : (
                  <div className="w-full h-[400px] lg:h-[500px] bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center">
                    <Ambulance className="w-32 h-32 text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
              </div>
              
              {/* Floating card - Clickable Emergency Line */}
              <a 
                href={`tel:${emergencyPhone.replace(/\s/g, '')}`}
                className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-slate-100 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
                data-testid="emergency-phone-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors">
                    <Phone className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      {language === 'sr' ? 'Hitna linija' : 'Emergency Line'}
                    </p>
                    <p className="font-bold text-slate-900">{emergencyPhone}</p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Bento Grid */}
      <section className="section-spacing bg-white" data-testid="services-section">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {servicesTitle}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {servicesSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Medical Care Card */}
            <div className="card-interactive service-medical p-8 group" data-testid="medical-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                  <Stethoscope className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <span className="badge-medical mb-1">{t('nav_medical')}</span>
                  <h3 className="text-xl font-semibold text-slate-900">{t('medical_title')}</h3>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                {medicalServices.map((service, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <service.icon className="w-5 h-5 text-sky-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">{service.title}</p>
                      <p className="text-sm text-slate-500">{service.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/medical-care">
                <Button variant="ghost" className="gap-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 p-0">
                  {language === 'sr' ? 'Saznajte više' : 'Learn more'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Transport Card */}
            <div className="card-interactive service-transport p-8 group" data-testid="transport-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <Ambulance className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <span className="badge-transport mb-1">{t('nav_transport')}</span>
                  <h3 className="text-xl font-semibold text-slate-900">{t('transport_title')}</h3>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                {transportServices.map((service, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <service.icon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">{service.title}</p>
                      <p className="text-sm text-slate-500">{service.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/transport">
                <Button variant="ghost" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 p-0">
                  {language === 'sr' ? 'Saznajte više' : 'Learn more'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-slate-900">
        <div className="section-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {ctaTitle}
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
            {ctaText}
          </p>
          <Link to="/booking">
            <Button className="btn-urgent text-lg px-8 py-6" data-testid="cta-booking-btn">
              <Ambulance className="w-5 h-5 mr-2" />
              {t('hero_cta_booking')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Image Gallery */}
      <section className="section-spacing bg-slate-50" data-testid="gallery-section">
        <div className="section-container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              {galleryTitle}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
            {galleryImages.map((img, index) => (
              <div 
                key={index} 
                className={`rounded-xl overflow-hidden ${img.className} bg-slate-200`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PWA Install Banner - Shows on supported browsers */}
      <PWAInstallBanner language={language} forceShow={true} />
    </div>
  );
};

export default Home;
