const CACHE_NAME = 'pc018-mobile-v5';
const STATIC_ASSETS = [
  '/logo.jpg',
  '/manifest-mobile.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v5...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v5...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first for app and API, cache for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // For API requests and app routes - ALWAYS network first
  if (event.request.url.includes('/api/') || url.pathname === '/app' || url.pathname.startsWith('/app/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // For app route, return offline page or let it fail naturally
          if (url.pathname === '/app' || url.pathname.startsWith('/app/')) {
            return caches.match(event.request);
          }
          return new Response(
            JSON.stringify({ offline: true, message: 'You are offline' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // For static assets only - cache first then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// ============ PUSH NOTIFICATIONS ============

// Handle push events (iOS 16.4+ and all modern browsers)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'Paramedic Care 018',
    body: 'Imate novo obaveštenje',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    tag: 'pc018-notification',
    data: {}
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.jpg',
    badge: data.badge || '/logo.jpg',
    tag: data.tag || 'pc018-notification',
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  // Get the action and data
  const action = event.action;
  const data = event.notification.data || {};

  // Determine which URL to open
  let targetUrl = '/app';
  
  if (action === 'view_task') {
    targetUrl = '/app';
  } else if (action === 'call') {
    if (data.phone) {
      targetUrl = `tel:${data.phone}`;
    }
  } else if (data.url) {
    targetUrl = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if app is already open
        for (const client of windowClients) {
          if (client.url.includes('/app') && 'focus' in client) {
            // Post message to refresh data
            client.postMessage({ 
              type: 'NOTIFICATION_CLICK', 
              action: action,
              data: data 
            });
            return client.focus();
          }
        }
        // Open new window if not already open
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Background sync for offline vitals
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-vitals') {
    event.waitUntil(syncOfflineVitals());
  }
});

async function syncOfflineVitals() {
  const allClients = await self.clients.matchAll();
  allClients.forEach(client => {
    client.postMessage({ type: 'SYNC_VITALS' });
  });
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Test notification from app
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('Test Notification', {
      body: event.data.body || 'Push notifications are working!',
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      tag: 'test-notification'
    });
  }
});
