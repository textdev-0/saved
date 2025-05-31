const CACHE_NAME = 'link-manager-v2'
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

  // For hard refresh requests (cache: 'reload'), always try network first but fall back to cache
  if (event.request.cache === 'reload') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Network succeeded, cache the response
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // Network failed, fall back to cache even for hard refresh
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // If no cache, show offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/') || caches.match('/offline.html')
            }
            // For other requests, return a basic offline response
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
          })
        })
    )
    return
  }

  // Standard cache-first strategy for normal requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }

        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Clone the response for caching
            const responseToCache = response.clone()

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Only cache same-origin requests
                if (event.request.url.startsWith(self.location.origin)) {
                  cache.put(event.request, responseToCache)
                }
              })

            return response
          }
        ).catch(() => {
          // Network failed, try to return appropriate fallback
          if (event.request.mode === 'navigate') {
            // For navigation requests, try main page first, then offline page
            return caches.match('/').then((response) => {
              return response || caches.match('/offline.html')
            })
          }
          
          // For other requests, try to match from cache
          return caches.match(event.request)
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