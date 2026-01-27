import { createContext, useContext, useState, useEffect } from 'react';

const PWAContext = createContext(null);

// Helper functions to get initial values (run only once during initialization)
const getInitialDismissed = () => {
  try {
    return sessionStorage.getItem('pwa-banner-dismissed') === 'true';
  } catch {
    return false;
  }
};

const getIsIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

const getIsStandalone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
};

export const PWAProvider = ({ children }) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(getIsStandalone);
  const [isIOS] = useState(getIsIOS);
  const [isStandalone] = useState(getIsStandalone);
  const [isDismissed, setIsDismissed] = useState(getInitialDismissed);

  useEffect(() => {
    // Listen for beforeinstallprompt (Chrome, Edge, etc.)
    const handleBeforeInstall = (e) => {
      console.log('[PWA Context] beforeinstallprompt event captured');
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      console.log('[PWA Context] App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) {
      console.log('[PWA Context] No install prompt available');
      return false;
    }

    try {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      console.log('[PWA Context] User choice:', result.outcome);
      
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setInstallPrompt(null);
      return result.outcome === 'accepted';
    } catch (error) {
      console.error('[PWA Context] Install prompt error:', error);
      return false;
    }
  };

  const dismissBanner = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  const value = {
    isInstallable,
    isInstalled,
    isIOS,
    isStandalone,
    isDismissed,
    promptInstall,
    dismissBanner
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default PWAContext;
