/**
 * PWA-specific hooks for the mobile application
 * - Push notifications
 * - PWA manifest
 * - Wake lock (keeps screen on during transport)
 * - State persistence (survives phone calls)
 */
import { useState, useEffect, useRef } from 'react';

/**
 * Hook for managing push notifications
 * Handles permission requests, service worker registration, and test notifications
 */
export const usePushNotifications = () => {
  const isIOS = typeof window !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
  
  const isSupported = typeof window !== 'undefined' && 
    'Notification' in window && 
    'serviceWorker' in navigator;

  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const requestPermission = async () => {
    if (!isSupported) {
      return { success: false, reason: 'not_supported' };
    }

    if (isIOS && !isStandalone) {
      return { success: false, reason: 'ios_not_installed' };
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        await registerServiceWorker();
        return { success: true };
      }
      
      return { success: false, reason: result };
    } catch (error) {
      console.error('Push permission error:', error);
      return { success: false, reason: 'error', error };
    }
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration.scope);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  };

  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      const result = await requestPermission();
      if (!result.success) return result;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active.postMessage({
        type: 'TEST_NOTIFICATION',
        body: 'Push notifications are working! 🚑'
      });
      return { success: true };
    } catch (error) {
      console.error('Test notification error:', error);
      return { success: false, error };
    }
  };

  return {
    permission,
    isSupported,
    isIOS,
    isStandalone,
    requestPermission,
    sendTestNotification,
    canRequestPermission: isSupported && (!isIOS || isStandalone)
  };
};

/**
 * Hook to set PWA manifest for mobile app
 * Updates document title, manifest link, and theme color
 */
export const usePWAManifest = () => {
  useEffect(() => {
    const manifestLink = document.getElementById('pwa-manifest');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const originalManifest = manifestLink?.href;
    const originalThemeColor = themeColorMeta?.content;
    
    document.title = 'PC018 Mobile - Paramedic Care 018';
    if (manifestLink) manifestLink.href = '/manifest-mobile.json';
    if (themeColorMeta) themeColorMeta.content = '#0f172a';
    
    return () => {
      document.title = 'Paramedic Care 018';
      if (manifestLink && originalManifest) manifestLink.href = originalManifest;
      if (themeColorMeta && originalThemeColor) themeColorMeta.content = originalThemeColor;
    };
  }, []);
};

/**
 * Hook to keep screen awake during active transport or calls
 * Uses the Screen Wake Lock API
 */
export const useWakeLock = (enabled) => {
  const wakeLockRef = useRef(null);
  
  useEffect(() => {
    const requestWakeLock = async () => {
      if (enabled && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('Wake Lock error:', err.message);
        }
      }
    };
    
    if (enabled) {
      requestWakeLock();
      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && enabled) requestWakeLock();
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        if (wakeLockRef.current) wakeLockRef.current.release();
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [enabled]);
};

/**
 * Hook to persist app state to sessionStorage
 * Allows state to survive phone calls or app switches
 */
export const useStatePersistence = (key, state, enabled) => {
  useEffect(() => {
    if (enabled && state) {
      try {
        sessionStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        console.log('State persistence error:', e);
      }
    }
  }, [key, state, enabled]);
};

/**
 * Restore state from session storage
 */
export const getPersistedState = (key) => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};
