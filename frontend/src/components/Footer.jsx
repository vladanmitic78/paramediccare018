import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { MapPin, Phone, Ambulance, Stethoscope } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export const Footer = () => {
  const { t, language } = useLanguage();
  const [footerContent, setFooterContent] = useState(null);
  const [headerContent, setHeaderContent] = useState(null);

  // Fetch footer and header content from CMS
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const [footerRes, headerRes] = await Promise.all([
          axios.get(`${API}/api/pages/footer`),
          axios.get(`${API}/api/pages/header`)
        ]);
        
        // Convert arrays to objects keyed by section
        const footer = {};
        footerRes.data.forEach(item => {
          footer[item.section] = item;
        });
        setFooterContent(footer);

        const header = {};
        headerRes.data.forEach(item => {
          header[item.section] = item;
        });
        setHeaderContent(header);
      } catch (error) {
        console.log('Using default footer content');
      }
    };
    fetchContent();
  }, []);

  // Get content from CMS or use defaults
  const logoUrl = headerContent?.logo?.image_url || 
    'https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg';
  
  const companyAddress = footerContent?.['company-info']?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr' ? 'Žarka Zrenjanina 50A, 18103 Niš (Pantelej), Srbija' : 'Žarka Zrenjanina 50A, 18103 Niš (Pantelej), Serbia');
  
  const phoneNumber = footerContent?.phone?.[language === 'sr' ? 'content_sr' : 'content_en'] || '+381 66 81 01 007';
  
  const legalInfo = footerContent?.legal?.[language === 'sr' ? 'content_sr' : 'content_en'] || 'PIB: 115243796 | MB: 68211557';
  
  const copyright = footerContent?.copyright?.[language === 'sr' ? 'content_sr' : 'content_en'] || 
    (language === 'sr' ? '© 2026 Paramedic Care 018. Sva prava zadržana.' : '© 2026 Paramedic Care 018. All rights reserved.');

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
              <img 
                src={logoUrl}
                alt="Paramedic Care 018"
                className="h-16 w-auto object-contain bg-white rounded-lg p-1"
              />
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t('about_mission_text')}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-white mb-4">
              {language === 'sr' ? 'Navigacija' : 'Navigation'}
            </h4>
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
                  <p>{companyAddress}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <a 
                  href={`tel:${phoneNumber.replace(/\s/g, '')}`}
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  {phoneNumber}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Ambulance className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-slate-500 text-xs mb-0.5">Transport</p>
                  <a 
                    href="mailto:transport@paramedic-care018.rs" 
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    transport@paramedic-care018.rs
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-slate-500 text-xs mb-0.5">
                    {language === 'sr' ? 'Medicinska Nega' : 'Medical Care'}
                  </p>
                  <a 
                    href="mailto:ambulanta@paramedic-care018.rs" 
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    ambulanta@paramedic-care018.rs
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="section-container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <p className="text-slate-500 text-xs">
                {copyright}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {legalInfo}
              </p>
            </div>
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
