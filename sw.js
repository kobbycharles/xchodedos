// sw.js — xchodedos Service Worker
// Caches app shell for offline use and fast loads

const CACHE_NAME = 'xchodedos-v2';

// Core app shell files to cache on install
const PRECACHE = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/supabase.js',
  '/js/auth.js',
  '/js/toast.js',
  '/pages/admin/dashboard.html',
  '/pages/admin/create-officer.html',
  '/pages/admin/officers.html',
  '/pages/admin/assign-driver.html',
  '/pages/admin/settings.html',
  '/pages/officer/dashboard.html',
  '/pages/officer/drivers.html',
  '/pages/officer/leads.html',
  '/pages/officer/lead-detail.html',
  '/pages/officer/create-lead.html',
  '/pages/officer/checks.html',
  '/pages/officer/fleet.html',
  '/pages/officer/record-payment.html',
  '/pages/officer/driver-detail.html',
  '/pages/officer/assign-vehicle.html',
  '/pages/driver/dashboard.html',
  '/pages/driver/payments.html',
  '/pages/driver/pre-use-check.html',
  '/pages/driver/car.html',
  '/pages/driver/profile.html',
  '/pages/lead/status.html',
];

// Install: cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first for API calls, cache first for app shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network-first for Supabase API calls
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('jsdelivr.net')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Cache-first for app shell (HTML, CSS, JS)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});

// Background sync placeholder for future push notifications
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const title = data.title || 'xchodedos';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    data: { url: data.url || '/' },
    actions: data.actions || [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: open the linked page
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
      const existing = list.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
