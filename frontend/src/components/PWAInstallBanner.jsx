import { Button } from './ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWA } from '../contexts/PWAContext';

/**
 * PWA Install Banner - Shows on mobile devices when app is installable
 * Can be used on any page (public or private)
 * Uses global PWAContext to share the beforeinstallprompt event across pages
 */
const PWAInstallBanner = ({ language = 'en' }) => {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    isStandalone, 
    isDismissed,
    promptInstall,
    dismissBanner
  } = usePWA();

  const handleInstall = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    dismissBanner();
  };

  // Don't show if already installed, dismissed, or running standalone
  if (isInstalled || isStandalone || isDismissed) return null;

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

  // Show install button for Chrome/Edge (Android, Desktop)
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

  return null;
};

export default PWAInstallBanner;
