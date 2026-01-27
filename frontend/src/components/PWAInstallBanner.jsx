import { useState } from 'react';
import { Button } from './ui/button';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { usePWA } from '../contexts/PWAContext';

/**
 * PWA Install Banner - Shows on the landing page to encourage app installation
 * - On supported mobile browsers: Shows native install prompt
 * - On iOS: Shows manual installation instructions
 * - On desktop: Shows instructions for mobile installation
 */
const PWAInstallBanner = ({ language = 'en', forceShow = false }) => {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    isStandalone, 
    isDismissed,
    promptInstall,
    dismissBanner
  } = usePWA();
  
  const [localDismissed, setLocalDismissed] = useState(false);

  const handleInstall = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    setLocalDismissed(true);
    dismissBanner();
  };

  // Don't show if already installed or running standalone
  if (isInstalled || isStandalone) return null;
  
  // Don't show if dismissed (either from context or local state)
  if (isDismissed || localDismissed) return null;

  // Show iOS-specific instructions
  if (isIOS) {
    return (
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-sky-600 to-indigo-600 text-white p-4 shadow-lg animate-slide-up"
        data-testid="pwa-install-banner-ios"
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">
                {language === 'sr' ? 'Instalirajte aplikaciju' : 'Install Our App'}
              </h3>
              <p className="text-sm text-white/90 mb-2">
                {language === 'sr' 
                  ? 'Za najbolje iskustvo, dodajte PC018 na početni ekran:'
                  : 'For the best experience, add PC018 to your home screen:'}
              </p>
              <ol className="text-sm text-white/80 space-y-1">
                <li>1. {language === 'sr' ? 'Pritisnite dugme za deljenje' : 'Tap the Share button'} <span className="inline-block bg-white/20 px-1.5 py-0.5 rounded text-xs">⬆️</span></li>
                <li>2. {language === 'sr' ? 'Izaberite "Dodaj na početni ekran"' : 'Select "Add to Home Screen"'}</li>
              </ol>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-white/70 hover:text-white p-1"
              aria-label="Dismiss"
              data-testid="pwa-banner-dismiss-ios"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show native install button for Chrome/Edge (Android, some desktops)
  if (isInstallable) {
    return (
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-sky-600 to-indigo-600 text-white p-4 shadow-lg animate-slide-up"
        data-testid="pwa-install-banner"
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <Download className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
                {language === 'sr' ? 'Instalirajte PC018 aplikaciju' : 'Install PC018 App'}
              </h3>
              <p className="text-sm text-white/80">
                {language === 'sr' 
                  ? 'Brži pristup i rad bez interneta'
                  : 'Faster access and offline support'}
              </p>
            </div>
            <Button 
              onClick={handleInstall}
              className="bg-white text-sky-600 hover:bg-white/90 font-semibold"
              data-testid="pwa-install-btn"
            >
              {language === 'sr' ? 'Instaliraj' : 'Install'}
            </Button>
            <button 
              onClick={handleDismiss}
              className="text-white/70 hover:text-white p-1"
              aria-label="Dismiss"
              data-testid="pwa-banner-dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show promotional banner on desktop/unsupported browsers when forceShow is true
  if (forceShow) {
    return (
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-sky-600 to-indigo-600 text-white p-4 shadow-lg animate-slide-up"
        data-testid="pwa-install-banner-promo"
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-full p-2.5 hidden sm:flex">
              <Smartphone className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {language === 'sr' ? 'Preuzmite PC018 mobilnu aplikaciju' : 'Get the PC018 Mobile App'}
              </h3>
              <p className="text-sm text-white/80 mt-0.5">
                {language === 'sr' 
                  ? 'Otvorite ovu stranicu na mobilnom telefonu za brzu instalaciju aplikacije'
                  : 'Open this page on your mobile phone to install the app instantly'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <Monitor className="w-4 h-4 text-white/60" />
                <span className="text-xs text-white/70">→</span>
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <button 
                onClick={handleDismiss}
                className="text-white/70 hover:text-white p-1"
                aria-label="Dismiss"
                data-testid="pwa-banner-dismiss-promo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAInstallBanner;
