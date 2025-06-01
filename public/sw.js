const CACHE_NAME = 'link-manager-v2'
const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/favicon.ico'
]

// Install SW: Pre-cache app shell and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Opened cache and caching app shell')
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        return self.skipWaiting() // Force the waiting service worker to become the active service worker.
      })
      .catch((error) => {
        console.error('SW: Cache addAll failed during install:', error)
        // Don't fail installation if some non-critical resources can't be cached
        return Promise.resolve()
      })
  )
})

// Activate SW: Clean up old caches and take control of clients
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('SW: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      return self.clients.claim() // Allow an active service worker to set itself as the controller for all clients within its scope.
    })
  )
})

// Listen for requests
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // 1. Try network first
          const networkResponse = await fetch(event.request)
          // If successful, and it's a same-origin request, cache it for future offline use
          if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(event.request, networkResponse.clone())
          }
          return networkResponse
        } catch (error) {
          console.log('SW: Network request failed for navigation, trying cache.', event.request.url, error)
          // 2. Network failed, try to get from cache for the specific page
          const cache = await caches.open(CACHE_NAME)
          const cachedResponse = await cache.match(event.request)
          if (cachedResponse) {
            console.log('SW: Serving navigation from cache:', event.request.url)
            return cachedResponse
          }
          // 3. If specific page not in cache, try the main app shell '/'
          const appShellResponse = await cache.match('/')
          if (appShellResponse) {
            console.log('SW: Serving app shell from cache for navigation:', event.request.url)
            return appShellResponse
          }
          // 4. Finally, serve the offline fallback page
          const offlinePageResponse = await cache.match('/offline.html')
          if (offlinePageResponse) {
            console.log('SW: Serving offline.html from cache for navigation:', event.request.url)
            return offlinePageResponse
          }
          // If all fails (shouldn't happen if offline.html is cached)
          return new Response("You are offline and the requested page couldn't be loaded from cache.", {
            status: 404,
            headers: { 'Content-Type': 'text/html' }
          })
        }
      })()
    )
  } else {
    // For non-navigation requests (assets like JS, CSS, images)
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        // 1. Try cache first
        const cachedResponse = await cache.match(event.request)
        if (cachedResponse) {
          return cachedResponse
        }

        // 2. Not in cache, try network
        try {
          const networkResponse = await fetch(event.request)
          // If successful, cache it (only if it's a valid, basic (same-origin) response)
          if (networkResponse && networkResponse.status === 200 && 
              networkResponse.type === 'basic' && // 'basic' usually means same-origin
              event.request.url.startsWith(self.location.origin)) { // Explicitly check same-origin
            await cache.put(event.request, networkResponse.clone())
          }
          return networkResponse
        } catch (error) {
          console.error('SW: Asset fetch failed, not in cache and network error:', event.request.url, error)
          // For assets, if not in cache and network fails, it's generally an error.
          // You could return a placeholder image/style if you have one.
          return new Response(`Asset not found: ${event.request.url}`, { 
            status: 404, 
            headers: { 'Content-Type': 'text/plain' } // Adjust content type if needed
          })
        }
      })()
    )
  }
}) 