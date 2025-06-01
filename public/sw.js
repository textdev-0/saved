const CACHE_NAME = 'link-manager-v2'
const APP_SHELL_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  // Add other critical app shell files here, e.g., global CSS, core JS bundles if they are static names
  // For Next.js, many core assets are hashed, so we will cache them dynamically
]

const PRECACHE_ASSETS = [
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  // Add any other assets you want to pre-cache, like fonts or key images
]

// Install SW: Pre-cache app shell and other critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache:', CACHE_NAME)
        // Cache app shell (non-negotiable for offline)
        const appShellPromises = cache.addAll(APP_SHELL_URLS).catch(error => {
          console.error('[SW] Failed to cache app shell:', APP_SHELL_URLS, error)
          // Don't fail install if only some app shell items fail, but log it.
          return Promise.resolve()
        })
        // Cache other assets (best effort)
        const precachePromises = cache.addAll(PRECACHE_ASSETS).catch(error => {
          console.warn('[SW] Failed to pre-cache some assets:', PRECACHE_ASSETS, error)
          return Promise.resolve()
        })
        return Promise.all([appShellPromises, precachePromises])
      })
      .then(() => self.skipWaiting()) // Activate new SW immediately
  )
})

// Activate SW: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
    .then(() => self.clients.claim()) // Take control of all clients immediately
  )
})

// Fetch event: Apply caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests and non-http/https requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return
  }

  // Skip requests to Chrome extensions or other browser internal URLs
  if (request.url.startsWith('chrome-extension://') || request.url.startsWith('moz-extension://')) {
    return
  }

  // Strategy for navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If successful, cache the page for future offline use if it's a 200 response
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone))
          }
          return response
        })
        .catch(() => {
          // Network failed, try to serve from cache
          return caches.match(request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/offline.html')
            })
        })
    )
    return
  }

  // Strategy for static assets (CSS, JS, images, fonts etc.) - Cache first, then network, then offline for specific assets
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image' || request.destination === 'font' || request.url.includes('.js') || request.url.includes('.css')) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Serve from cache and update in background (stale-while-revalidate pattern for static assets)
            fetch(request).then(networkResponse => {
              if (networkResponse && networkResponse.ok) {
                const responseClone = networkResponse.clone()
                caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone))
              }
            }).catch(err => console.warn('[SW] Failed to update cached asset:', request.url, err))
            return cachedResponse
          }

          // Not in cache, fetch from network
          return fetch(request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.ok) {
                const responseClone = networkResponse.clone()
                caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone))
                return networkResponse
              } else if (!networkResponse || !networkResponse.ok) {
                // If network fails for a known pre-cached asset, try to serve it from cache (e.g. icons)
                if (PRECACHE_ASSETS.includes(new URL(request.url).pathname)) {
                  return caches.match(request)
                }
              }
              return networkResponse // Return original failed/bad response
            })
            .catch(() => {
              // For images, if network fails and not in cache, could return a placeholder
              if (request.destination === 'image') {
                // return caches.match('/placeholder-image.png') // Example placeholder
              }
              // For critical assets like icons, try to serve pre-cached version if all else fails
              if (PRECACHE_ASSETS.includes(new URL(request.url).pathname)) {
                return caches.match(request)
              }
              return new Response('Network error', { status: 408, headers: { 'Content-Type': 'text/plain' } })
            })
        })
    )
    return
  }
  
  // Default: Network first for all other requests (e.g., API calls, unknown destinations)
  event.respondWith(
    fetch(request)
      .then(response => {
        // If response is good, cache it (optional, depending on whether you want to cache API responses)
        // For this app, we probably don't need to cache arbitrary external favicons fetched by the client-side JS
        // if (response.ok && !request.url.includes('favicons?domain=') && !request.url.includes('ip3/') && !request.url.includes('yandex.net/favicon/') ) {
        //   const responseClone = response.clone()
        //   caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone))
        // }
        return response
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request).then(cachedResponse => {
          // If not in cache and it's a navigation, show offline page
          if (!cachedResponse && request.mode === 'navigate') {
            return caches.match('/offline.html')
          }
          return cachedResponse
        })
      })
  )
})

// Listen for messages from clients (e.g., to trigger skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
}) 