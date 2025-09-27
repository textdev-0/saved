// Service Worker for Link Manager - Offline Support
const CACHE_NAME = 'link-manager-v1';
const urlsToCache = [
  '/',
  '/offline',
  '/_next/static/css/app/layout.css',
  '/_next/static/css/app/page.css',
  '/favicon.ico',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Try to cache files, but don't fail installation if some files can't be cached
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return Promise.resolve();
            })
          )
        );
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip external requests (like favicons from other domains)
  if (url.hostname !== self.location.hostname && !url.hostname.includes('vercel')) {
    // For external favicon requests, try network first, then return a fallback
    if (url.hostname.includes('google.com') || 
        url.hostname.includes('duckduckgo.com') || 
        url.hostname.includes('yandex.net')) {
      event.respondWith(
        fetch(request)
          .catch(() => {
            // Return a transparent 1x1 pixel as fallback for failed favicon requests
            return new Response(
              new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 218, 98, 0, 0, 0, 2, 0, 1, 228, 45, 230, 31, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]),
              {
                headers: {
                  'Content-Type': 'image/png',
                  'Cache-Control': 'public, max-age=31536000'
                }
              }
            );
          })
      );
    }
    return;
  }

  // Network-first strategy for API routes and Next.js assets
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/_next/') ||
      url.pathname.includes('.json')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response before caching
          const responseToCache = response.clone();
          
          // Update cache in the background
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then(response => {
            if (response) {
              return response;
            }
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
            // Return a basic error response for other requests
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          // Found in cache
          return response;
        }

        // Not in cache, try network
        return fetch(request).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Add to cache
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        }).catch(() => {
          // Network failed, return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          // Return error for other requests
          return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for future enhancement
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-links') {
    // Future: sync links when back online
    console.log('Background sync triggered');
  }
});