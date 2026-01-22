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

const Home = () => {
  const { t, language } = useLanguage();

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
                {t('hero_title')}
              </h1>
              
              <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-xl">
                {t('hero_subtitle')}
              </p>

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
                <img
                  src="https://images.pexels.com/photos/6520105/pexels-photo-6520105.jpeg"
                  alt="Ambulance"
                  className="w-full h-[400px] lg:h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
              </div>
              
              {/* Floating card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      {language === 'sr' ? 'Hitna linija' : 'Emergency Line'}
                    </p>
                    <p className="font-bold text-slate-900">+381 18 123 456</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Bento Grid */}
      <section className="section-spacing bg-white" data-testid="services-section">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t('services_title')}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t('services_subtitle')}
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
            {language === 'sr' ? 'Potreban vam je transport?' : 'Need Transport?'}
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
            {language === 'sr' 
              ? 'Zakažite medicinski transport brzo i jednostavno. Naš tim je spreman da vam pomogne.'
              : 'Book medical transport quickly and easily. Our team is ready to help you.'}
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
      <section className="section-spacing bg-slate-50">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl overflow-hidden col-span-2 row-span-2">
              <img
                src="https://images.pexels.com/photos/6519910/pexels-photo-6519910.jpeg"
                alt="Paramedic team"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="rounded-xl overflow-hidden">
              <img
                src="https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg"
                alt="Doctor"
                className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="rounded-xl overflow-hidden">
              <img
                src="https://images.pexels.com/photos/9893525/pexels-photo-9893525.jpeg"
                alt="Nurse"
                className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="rounded-xl overflow-hidden col-span-2">
              <img
                src="https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg"
                alt="Hospital"
                className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
