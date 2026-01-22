import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Cross, MapPin, Phone, Mail } from 'lucide-react';

export const Footer = () => {
  const { t } = useLanguage();

  const navItems = [
    { path: '/', label: t('nav_home') },
    { path: '/medical-care', label: t('nav_medical') },
    { path: '/transport', label: t('nav_transport') },
    { path: '/booking', label: t('nav_booking') },
    { path: '/about', label: t('nav_about') },
    { path: '/contact', label: t('nav_contact') },
  ];

  return (
    <footer className="bg-slate-900 text-white" data-testid="footer">
      <div className="section-container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo Section */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg flex items-center justify-center">
                <Cross className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-white">Paramedic Care</span>
                <span className="text-sky-400 font-bold ml-1">018</span>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t('about_mission_text')}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-white mb-4">Navigacija</h4>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Company Details */}
          <div className="lg:col-span-2">
            <h4 className="font-semibold text-white mb-4">{t('contact_company')}</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <div className="text-slate-400 text-sm">
                  <p>Žarka Zrenjanina 50A</p>
                  <p>18103 Niš (Pantelej), Serbia</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <a 
                  href="tel:+38118123456" 
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  +381 18 123 456
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <a 
                  href="mailto:transporta@paramedic-care018.rs" 
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  transporta@paramedic-care018.rs
                </a>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-slate-500 text-xs">PIB: 115243796</p>
                <p className="text-slate-500 text-xs">MB: 68211557</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="section-container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <p className="text-slate-500 text-xs">
              © 2026 Paramedics Care 018. {t('footer_rights')}.
            </p>
            <div className="text-slate-500 text-xs">
              <span>{t('footer_platform')} © MITA ICT AB. {t('footer_license')}.</span>
              <span className="mx-2">|</span>
              <span>
                {t('footer_designed')}{' '}
                <a 
                  href="https://www.mitaict.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 transition-colors"
                >
                  MITA ICT AB
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
