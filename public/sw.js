const CACHE_NAME = 'link-manager-v3'
const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/favicon.ico'
]

// Install SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.log('Cache addAll failed:', error)
        // Don't fail installation if some resources can't be cached
        return Promise.resolve()
      })
  )
})

// Listen for requests
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    // Try cache first
    caches.match(event.request)
      .then((cachedResponse) => {
        // If found in cache, return it
        if (cachedResponse) {
          // Also try to update cache in background for fresh content
          fetch(event.request)
            .then((response) => {
              if (response && response.status === 200 && response.type === 'basic') {
                const responseToCache = response.clone()
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache)
                })
              }
            })
            .catch(() => {
              // Network failed, but we have cache so it's fine
            })
          
          return cachedResponse
        }

        // Not in cache, try network
        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Clone the response for caching
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })

            return response
          })
          .catch(() => {
            // Network failed and no cache
            if (event.request.mode === 'navigate') {
              // For navigation requests, try main page first, then offline page
              return caches.match('/').then((response) => {
                return response || caches.match('/offline.html')
              })
            }
            
            // For other requests, return a simple offline response
            return new Response('Offline', { 
              status: 503, 
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            })
          })
      })
  )
})

// Update SW
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
}) 