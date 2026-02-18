import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Cross,
  Target,
  Heart,
  Shield,
  Clock,
  Users,
  Award,
  CheckCircle,
  Building2
} from 'lucide-react';
import axios from 'axios';
import { formatContent } from '../utils/formatContent';

const API = process.env.REACT_APP_BACKEND_URL;

const About = () => {
  const { language, t } = useLanguage();
  const [pageContent, setPageContent] = useState(null);

  // Fetch about page content from CMS
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API}/api/pages/about`);
        const content = {};
        response.data.forEach(item => {
          content[item.section] = item;
        });
        setPageContent(content);
      } catch (error) {
        console.log('Using default about content');
      }
    };
    fetchContent();
  }, []);

  // Get images from CMS
  const heroImage = pageContent?.hero?.image_url || null;
  const missionImage = pageContent?.mission?.image_url || null;

  // Get content from CMS or use defaults
  const heroTitle = pageContent?.hero?.[language === 'sr' ? 'title_sr' : 'title_en'] || t('about_subtitle');
  const heroText = pageContent?.hero?.[language === 'sr' ? 'content_sr' : 'content_en'] || t('about_text');
  const missionTitle = pageContent?.mission?.[language === 'sr' ? 'title_sr' : 'title_en'] || t('about_mission');
  const missionText = pageContent?.mission?.[language === 'sr' ? 'content_sr' : 'content_en'] || t('about_mission_text');

  const values = [
    { 
      icon: Shield, 
      title: t('about_value_1'), 
      desc: language === 'sr' ? 'Najviši standardi u svemu što radimo' : 'Highest standards in everything we do'
    },
    { 
      icon: Heart, 
      title: t('about_value_2'), 
      desc: language === 'sr' ? 'Možete se osloniti na nas' : 'You can count on us'
    },
    { 
      icon: Users, 
      title: t('about_value_3'), 
      desc: language === 'sr' ? 'Razumemo vaše potrebe' : 'We understand your needs'
    },
    { 
      icon: Clock, 
      title: t('about_value_4'), 
      desc: language === 'sr' ? 'Uvek tu kada vam zatrebamo' : 'Always there when you need us'
    },
  ];

  const stats = [
    { value: '2010', label: language === 'sr' ? 'Godina osnivanja' : 'Founded' },
    { value: '1000+', label: language === 'sr' ? 'Transporta' : 'Transports' },
    { value: '15+', label: language === 'sr' ? 'Zaposlenih' : 'Employees' },
    { value: '24/7', label: language === 'sr' ? 'Dostupnost' : 'Availability' },
  ];

  return (
    <div className="min-h-screen" data-testid="about-page">
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-sky-50 to-white">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Cross className="w-4 h-4" />
                {t('about_title')}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
                {heroTitle}
              </h1>
              
              <div className="leading-relaxed">
                {formatContent(heroText, 'sky')}
              </div>
            </div>

            <div className="relative">
              {pageContent && heroImage ? (
                <img
                  src={heroImage}
                  alt="Our team"
                  className="rounded-2xl shadow-2xl w-full h-[400px] object-cover"
                />
              ) : (
                <div className="rounded-2xl shadow-2xl w-full h-[400px] bg-slate-100" />
              )}
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

      {/* Mission */}
      <section className="section-spacing">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {missionImage ? (
                <img
                  src={missionImage}
                  alt="Medical care"
                  className="rounded-2xl shadow-xl w-full h-[400px] object-cover"
                />
              ) : (
                <div className="rounded-2xl shadow-xl w-full h-[400px] bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center">
                  <Target className="w-24 h-24 text-white/30" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-sky-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                  {missionTitle}
                </h2>
              </div>
              
              <div className="mb-6">
                {formatContent(missionText, 'sky')}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-600" />
                  <span className="text-slate-700">
                    {language === 'sr' ? 'Profesionalno osoblje' : 'Professional staff'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-600" />
                  <span className="text-slate-700">
                    {language === 'sr' ? 'Moderna oprema' : 'Modern equipment'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-sky-600" />
                  <span className="text-slate-700">
                    {language === 'sr' ? 'Brzi odziv' : 'Fast response'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-spacing bg-slate-50">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {t('about_values')}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {language === 'sr'
                ? 'Vrednosti koje nas vode u svakodnevnom radu'
                : 'Values that guide us in our daily work'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <div 
                key={i} 
                className="card-base text-center hover:shadow-lg transition-shadow"
                data-testid={`value-card-${i}`}
              >
                <div className="w-14 h-14 bg-sky-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-sky-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-slate-600 text-sm">
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section-spacing">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {language === 'sr' ? 'Naš Tim' : 'Our Team'}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {language === 'sr'
                ? 'Posvećeni profesionalci sa godinama iskustva'
                : 'Dedicated professionals with years of experience'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-sky-500 to-sky-700">
              <div className="w-full h-64 flex items-center justify-center">
                <Cross className="w-16 h-16 text-white/50" />
              </div>
              <div className="bg-white p-4 text-center">
                <p className="font-semibold text-slate-900">
                  {language === 'sr' ? 'Lekari' : 'Doctors'}
                </p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-pink-500 to-pink-700">
              <div className="w-full h-64 flex items-center justify-center">
                <Heart className="w-16 h-16 text-white/50" />
              </div>
              <div className="bg-white p-4 text-center">
                <p className="font-semibold text-slate-900">
                  {language === 'sr' ? 'Medicinske Sestre' : 'Nurses'}
                </p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700">
              <div className="w-full h-64 flex items-center justify-center">
                <Shield className="w-16 h-16 text-white/50" />
              </div>
              <div className="bg-white p-4 text-center">
                <p className="font-semibold text-slate-900">
                  {language === 'sr' ? 'Paramedici' : 'Paramedics'}
                </p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700">
              <div className="w-full h-64 flex items-center justify-center">
                <Building2 className="w-16 h-16 text-white/50" />
              </div>
              <div className="bg-white p-4 text-center">
                <p className="font-semibold text-slate-900">
                  {language === 'sr' ? 'Vozači' : 'Drivers'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-12 bg-slate-900">
        <div className="section-container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Award className="w-12 h-12 text-sky-400" />
              <div>
                <p className="font-semibold text-white text-lg">
                  {language === 'sr' ? 'Licencirani i Sertifikovani' : 'Licensed and Certified'}
                </p>
                <p className="text-slate-400 text-sm">
                  {language === 'sr' 
                    ? 'Svi naši zaposleni poseduju potrebne licence i sertifikate'
                    : 'All our employees hold the necessary licenses and certificates'}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/10 rounded-lg px-6 py-3">
                <p className="text-white font-mono">PIB: 115243796</p>
              </div>
              <div className="bg-white/10 rounded-lg px-6 py-3">
                <p className="text-white font-mono">MB: 68211557</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
