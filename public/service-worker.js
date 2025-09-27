// Link Manager Service Worker - Complete Offline Support
const CACHE_VERSION = 'v1';
const CACHE_NAME = `link-manager-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Core files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching core assets');
        // Cache core files, continue even if some fail
        return Promise.allSettled(
          PRECACHE_URLS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[ServiceWorker] Failed to cache ${url}:`, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map(cacheName => {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip browser extensions
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;

  // Handle external favicon requests (Google, DuckDuckGo, etc.)
  if (url.hostname !== self.location.hostname) {
    // For external resources, try network with timeout, fallback to cache or placeholder
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ])
      .then(response => {
        // Cache successful external responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Try cache for external resources
        return caches.match(request).then(cached => {
          if (cached) return cached;
          
          // Return transparent pixel for failed favicon requests
          if (url.pathname.includes('favicon') || url.pathname.endsWith('.ico')) {
            return new Response(
              new Uint8Array([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59]),
              { headers: { 'Content-Type': 'image/gif' } }
            );
          }
          
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // Handle Next.js specific routes
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) return cached;
          
          return fetch(request).then(response => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
        .catch(() => {
          console.log('[ServiceWorker] Network request failed for:', url.pathname);
          return new Response('', { status: 404 });
        })
    );
    return;
  }

  // Handle API routes - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'This feature requires an internet connection' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Default strategy: Network first, fall back to cache, then offline page
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Try cache
        return caches.match(request).then(cached => {
          if (cached) return cached;
          
          // For navigation requests, return the main app (it works offline)
          if (request.mode === 'navigate') {
            return caches.match('/').then(mainPage => {
              if (mainPage) return mainPage;
              
              // Last resort: offline page
              return caches.match('/offline.html').then(offlinePage => {
                if (offlinePage) return offlinePage;
                
                // Ultimate fallback
                return new Response(
                  `<!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Offline - Link Manager</title>
                    <style>
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: #1a1a1a;
                        color: #ffffff;
                      }
                      .offline-container {
                        text-align: center;
                        padding: 2rem;
                      }
                      h1 { font-size: 2rem; margin-bottom: 1rem; }
                      p { color: #888; margin-bottom: 1.5rem; }
                      button {
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 0.5rem;
                        font-size: 1rem;
                        cursor: pointer;
                      }
                      button:hover { background: #2563eb; }
                    </style>
                  </head>
                  <body>
                    <div class="offline-container">
                      <h1>You're Offline</h1>
                      <p>Please check your internet connection and try again.</p>
                      <button onclick="location.reload()">Retry</button>
                    </div>
                  </body>
                  </html>`,
                  {
                    headers: { 'Content-Type': 'text/html' }
                  }
                );
              });
            });
          }
          
          return new Response('Resource not available offline', { status: 503 });
        });
      })
  );
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLIENT_READY') {
    // Client is ready, we could sync data here if needed
    console.log('[ServiceWorker] Client ready');
  }
});