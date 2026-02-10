import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Ambulance, 
  Building2, 
  Home,
  Clock,
  Shield,
  CheckCircle,
  Phone,
  MapPin,
  Truck
} from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const Transport = () => {
  const { language } = useLanguage();
  const [pageContent, setPageContent] = useState(null);

  // Fetch transport page content from CMS
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/api/pages/transport`);
        const content = {};
        response.data.forEach(item => {
          content[item.section] = item;
        });
        setPageContent(content);
      } catch (error) {
        console.log('Using default transport content');
      }
    };
    fetchContent();
  }, []);

  // Get content from CMS or use defaults
  const heroTitle = pageContent?.hero?.[language === 'sr' ? 'title_sr' : 'title_en'] || 
    (language === 'sr' ? 'Medicinski Transport' : 'Medical Transport');
  
  const heroSubtitle = pageContent?.hero?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr'
      ? 'Pružamo siguran i pouzdan medicinski transport sa profesionalnom pratnjom. Naša flota je opremljena najmodernijom medicinskom opremom.'
      : 'We provide safe and reliable medical transport with professional escort. Our fleet is equipped with the most modern medical equipment.');
  
  const heroImage = pageContent?.hero?.image_url || null;

  const servicesTitle = pageContent?.['services-title']?.[language === 'sr' ? 'title_sr' : 'title_en'] || 
    (language === 'sr' ? 'Vrste Transporta' : 'Transport Types');
  
  const servicesSubtitle = pageContent?.['services-title']?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr' ? 'Odaberite vrstu transporta koja vam najviše odgovara' : 'Choose the type of transport that suits you best');

  const fleetTitle = pageContent?.fleet?.[language === 'sr' ? 'title_sr' : 'title_en'] || 
    (language === 'sr' ? 'Moderna Flota Vozila' : 'Modern Vehicle Fleet');
  
  const fleetContent = pageContent?.fleet?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr'
      ? 'Naša flota sanitetskih vozila je opremljena najmodernijom medicinskom opremom. Sva vozila su klimatizovana i redovno servisirana kako bi osigurali maksimalnu udobnost i bezbednost pacijenata.'
      : 'Our ambulance fleet is equipped with the most modern medical equipment. All vehicles are air-conditioned and regularly serviced to ensure maximum comfort and safety for patients.');
  
  const fleetImage = pageContent?.fleet?.image_url || null;

  const ctaTitle = pageContent?.cta?.[language === 'sr' ? 'title_sr' : 'title_en'] || 
    (language === 'sr' ? 'Zakažite Transport Sada' : 'Book Transport Now');
  
  const ctaContent = pageContent?.cta?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr'
      ? 'Jednostavno zakažite medicinski transport putem naše online forme ili nas pozovite direktno.'
      : 'Easily book medical transport through our online form or call us directly.');

  const emergencyPhone = pageContent?.['emergency-phone']?.[language === 'sr' ? 'content_sr' : 'content_en'] || '+381 66 81 01 007';
  const transportPhone = pageContent?.['transport-phone']?.[language === 'sr' ? 'content_sr' : 'content_en'] || '+381 66 81 01 007';

  const services = [
    {
      icon: Ambulance,
      title: language === 'sr' ? 'Transport sanitetom' : 'Ambulance Transport',
      description: language === 'sr' 
        ? 'Siguran i udoban transport specijalizovanim sanitetskim vozilom opremljenim najmodernijom medicinskom opremom.'
        : 'Safe and comfortable transport in specialized ambulance vehicle equipped with the most modern medical equipment.',
      features: language === 'sr' 
        ? ['Moderna oprema', 'Klimatizovano vozilo', 'Medicinska pratnja']
        : ['Modern equipment', 'Air-conditioned vehicle', 'Medical escort']
    },
    {
      icon: Building2,
      title: language === 'sr' ? 'Transport između bolnica' : 'Hospital-to-Hospital Transport',
      description: language === 'sr'
        ? 'Profesionalan transport pacijenata između zdravstvenih ustanova sa punom medicinskom pratnjom.'
        : 'Professional patient transport between healthcare facilities with full medical escort.',
      features: language === 'sr'
        ? ['Koordinacija sa bolnicama', 'Kontinuitet nege', 'Dokumentacija']
        : ['Hospital coordination', 'Continuity of care', 'Documentation']
    },
    {
      icon: Home,
      title: language === 'sr' ? 'Transport od kuće do bolnice' : 'Home-to-Hospital Transport',
      description: language === 'sr'
        ? 'Bezbedna vožnja od vašeg doma do zdravstvene ustanove. Preuzimamo pacijenta na adresi i pratimo do destinacije.'
        : 'Safe ride from your home to the healthcare facility. We pick up the patient at the address and accompany them to the destination.',
      features: language === 'sr'
        ? ['Pomoć pri ukrcavanju', 'Udoban transport', 'Pratnja do prijema']
        : ['Boarding assistance', 'Comfortable transport', 'Escort to admission']
    }
  ];

  const features = [
    { 
      icon: Clock, 
      title: language === 'sr' ? 'Dostupnost 24/7' : '24/7 Availability',
      desc: language === 'sr' ? 'Uvek smo tu kada vam zatrebamo' : 'We are always here when you need us'
    },
    { 
      icon: Shield, 
      title: language === 'sr' ? 'Bezbednost' : 'Safety',
      desc: language === 'sr' ? 'Najviši standardi bezbednosti' : 'Highest safety standards'
    },
    { 
      icon: MapPin, 
      title: language === 'sr' ? 'Širom Srbije' : 'Across Serbia',
      desc: language === 'sr' ? 'Pokrivamo celu teritoriju' : 'We cover the entire territory'
    },
    { 
      icon: Truck, 
      title: language === 'sr' ? 'Moderna flota' : 'Modern Fleet',
      desc: language === 'sr' ? 'Najnovija vozila i oprema' : 'Latest vehicles and equipment'
    },
  ];

  return (
    <div className="min-h-screen" data-testid="transport-page">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-white -z-10" />
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Ambulance className="w-4 h-4" />
                {language === 'sr' ? 'Hitno' : 'Urgent'}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
                {heroTitle}
              </h1>
              
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                {heroSubtitle}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/booking">
                  <Button className="btn-urgent gap-2" data-testid="transport-booking-btn">
                    <Ambulance className="w-4 h-4" />
                    {language === 'sr' ? 'Zakažite Transport' : 'Book Transport'}
                  </Button>
                </Link>
                <a href={`tel:${emergencyPhone.replace(/\s/g, '')}`}>
                  <Button variant="outline" className="btn-outline gap-2">
                    <Phone className="w-4 h-4" />
                    {emergencyPhone}
                  </Button>
                </a>
              </div>
            </div>

            <div className="relative">
              <img
                src={heroImage}
                alt="Ambulance"
                className="rounded-2xl shadow-2xl w-full h-[400px] object-cover"
              />
              <a 
                href={`tel:${emergencyPhone.replace(/\s/g, '')}`}
                className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-slate-100 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
                data-testid="emergency-phone-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center animate-pulse group-hover:bg-red-200">
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

      {/* Features */}
      <section className="py-12 bg-red-600">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold text-white mb-1">{feature.title}</p>
                <p className="text-red-100 text-sm">{feature.desc}</p>
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
                className="card-base service-transport hover:shadow-lg transition-shadow"
                data-testid={`transport-card-${i}`}
              >
                <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                  <service.icon className="w-7 h-7 text-red-600" />
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
                      <CheckCircle className="w-4 h-4 text-red-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fleet Image */}
      <section className="section-spacing bg-slate-50">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                {fleetTitle}
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                {fleetContent}
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-red-600" />
                  <span className="text-slate-700">
                    {language === 'sr' ? 'Potpuno opremljeni sanitetski vozila' : 'Fully equipped ambulances'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-red-600" />
                  <span className="text-slate-700">
                    {language === 'sr' ? 'GPS praćenje u realnom vremenu' : 'Real-time GPS tracking'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-red-600" />
                  <span className="text-slate-700">
                    {language === 'sr' ? 'Redovno održavanje' : 'Regular maintenance'}
                  </span>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <img
                src={fleetImage}
                alt="Paramedic team"
                className="rounded-2xl shadow-xl w-full h-[400px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-red-600">
        <div className="section-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {ctaTitle}
          </h2>
          <p className="text-lg text-red-100 mb-8 max-w-xl mx-auto">
            {ctaContent}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/booking">
              <Button className="bg-white text-red-600 hover:bg-red-50 rounded-full px-8 py-3 font-medium">
                {language === 'sr' ? 'Online Rezervacija' : 'Online Booking'}
              </Button>
            </Link>
            <a href={`tel:${emergencyPhone.replace(/\s/g, '')}`}>
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white/10 rounded-full px-8 py-3 font-medium">
                <Phone className="w-4 h-4 mr-2" />
                {emergencyPhone}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Transport;
