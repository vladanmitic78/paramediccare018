import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, ChevronDown, Phone } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, isAdmin, isStaff } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerContent, setHeaderContent] = useState(null);

  // Fetch header content from CMS
  useEffect(() => {
    const fetchHeaderContent = async () => {
      try {
        const response = await axios.get(`${API}/api/pages/header`);
        const content = {};
        response.data.forEach(item => {
          content[item.section] = item;
        });
        setHeaderContent(content);
      } catch (error) {
        console.log('Using default header content');
      }
    };
    fetchHeaderContent();
  }, []);

  // Get logo URL from CMS or use default
  const logoUrl = headerContent?.logo?.image_url || 
    'https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg';
  
  // Get emergency phone from CMS or use default
  const emergencyPhone = headerContent?.['emergency-banner']?.[language === 'sr' ? 'content_sr' : 'content_en'] || '+381 18 123 456';

  const navItems = [
    { path: '/', label: t('nav_home') },
    { path: '/medical-care', label: t('nav_medical'), color: 'text-sky-600' },
    { path: '/transport', label: t('nav_transport'), color: 'text-red-600' },
    { path: '/booking', label: t('nav_booking') },
    { path: '/about', label: t('nav_about') },
    { path: '/contact', label: t('nav_contact') },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="glass-header sticky top-0 z-50 border-b border-slate-200/50" data-testid="header">
      <div className="section-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 group"
            data-testid="logo-link"
          >
            <img 
              src="https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg"
              alt="Paramedic Care 018"
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-slate-100 text-slate-900'
                    : `text-slate-600 hover:text-slate-900 hover:bg-slate-50 ${item.color || ''}`
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  data-testid="language-switcher"
                >
                  <img 
                    src={language === 'sr' 
                      ? 'https://flagcdn.com/w40/rs.png'
                      : 'https://flagcdn.com/w40/gb.png'
                    }
                    alt={language === 'sr' ? 'Serbian' : 'English'}
                    className="w-5 h-4 object-cover rounded-sm"
                  />
                  <span className="hidden sm:inline uppercase text-xs font-semibold">
                    {language}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setLanguage('sr')}
                  data-testid="lang-sr"
                >
                  <img 
                    src="https://flagcdn.com/w40/rs.png"
                    alt="Serbian"
                    className="w-5 h-4 object-cover rounded-sm mr-2"
                  />
                  Srpski
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage('en')}
                  data-testid="lang-en"
                >
                  <img 
                    src="https://flagcdn.com/w40/gb.png"
                    alt="English"
                    className="w-5 h-4 object-cover rounded-sm mr-2"
                  />
                  English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auth Buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 rounded-full"
                    data-testid="user-menu"
                  >
                    <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-sky-700">
                        {user.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden sm:inline text-sm">{user.full_name?.split(' ')[0]}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isStaff() && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" data-testid="nav-dashboard">
                        {t('nav_dashboard')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={logout}
                    className="text-red-600"
                    data-testid="logout-btn"
                  >
                    {t('nav_logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button 
                  size="sm" 
                  className="btn-primary"
                  data-testid="login-btn"
                >
                  {t('nav_login')}
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-slate-100" data-testid="mobile-menu">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-slate-100 text-slate-900'
                      : `text-slate-600 hover:bg-slate-50 ${item.color || ''}`
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
