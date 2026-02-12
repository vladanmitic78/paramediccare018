import { createContext, useContext, useState, useEffect } from 'react';

const PWAContext = createContext(null);

// Check if app was previously installed (persisted in localStorage)
const getWasInstalled = () => {
  try {
    return localStorage.getItem('pwa-was-installed') === 'true';
  } catch {
    return false;
  }
};

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
  // Check multiple methods for standalone/installed detection
  const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = window.navigator.standalone === true;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
  
  return isDisplayStandalone || isIOSStandalone || isFullscreen || isMinimalUI;
};

export const PWAProvider = ({ children }) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  // Check both standalone mode AND if it was previously installed
  const [isInstalled, setIsInstalled] = useState(() => getIsStandalone() || getWasInstalled());
  const [isIOS] = useState(getIsIOS);
  const [isStandalone] = useState(getIsStandalone);
  const [isDismissed, setIsDismissed] = useState(getInitialDismissed);

  useEffect(() => {
    // Check for installed related apps (modern API, limited support)
    const checkInstalledApps = async () => {
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await navigator.getInstalledRelatedApps();
          if (relatedApps.length > 0) {
            console.log('[PWA Context] Related app found:', relatedApps);
            setIsInstalled(true);
            localStorage.setItem('pwa-was-installed', 'true');
          }
        } catch (error) {
          console.log('[PWA Context] getInstalledRelatedApps not available:', error);
        }
      }
    };

    // Listen for display-mode changes (e.g., when app is added to home screen)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        console.log('[PWA Context] Display mode changed to standalone');
        setIsInstalled(true);
        localStorage.setItem('pwa-was-installed', 'true');
      }
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleDisplayModeChange);
    }

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
      // Persist the installation state
      localStorage.setItem('pwa-was-installed', 'true');
    };

    checkInstalledApps();
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
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
        // Persist the installation state
        localStorage.setItem('pwa-was-installed', 'true');
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
