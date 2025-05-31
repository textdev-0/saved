const CACHE_NAME = 'link-manager-v5'
const STATIC_CACHE_NAME = 'link-manager-static-v5'
const DYNAMIC_CACHE_NAME = 'link-manager-dynamic-v5'

// Files to cache on install
const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/favicon.ico'
]

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching essential files')
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Cache install failed:', error)
      })
  )
})

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME]
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('Service Worker: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim()
      })
      .then(() => {
        console.log('Service Worker: Now controlling all pages')
      })
  )
})

// Helper function to determine if a request is for a Next.js asset
function isNextJsAsset(url) {
  return url.includes('/_next/') || 
         url.includes('.js') || 
         url.includes('.css') || 
         url.includes('.json') ||
         url.includes('/api/') ||
         url.includes('.woff') ||
         url.includes('.woff2')
}

// Helper function to determine caching strategy
function getCachingStrategy(request) {
  const url = request.url
  
  // For Next.js build files, use cache-first (they're immutable)
  if (url.includes('/_next/static/')) {
    return 'cache-first'
  }
  
  // For API routes, use network-first
  if (url.includes('/api/')) {
    return 'network-first'
  }
  
  // For pages and other assets, use stale-while-revalidate
  return 'stale-while-revalidate'
}

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  const strategy = getCachingStrategy(event.request)

  if (strategy === 'cache-first') {
    // Cache first strategy - for immutable assets
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          
          return fetch(event.request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response
              }
              
              const responseToCache = response.clone()
              caches.open(DYNAMIC_CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache)
                })
              
              return response
            })
        })
    )
  } else if (strategy === 'network-first') {
    // Network first strategy - for API routes
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          
          const responseToCache = response.clone()
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache)
            })
          
          return response
        })
        .catch(() => {
          return caches.match(event.request)
        })
    )
  } else {
    // Stale while revalidate - for pages
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response
              }
              
              const responseToCache = response.clone()
              caches.open(DYNAMIC_CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache)
                })
              
              return response
            })
            .catch(() => {
              // If network fails and we have no cache, return offline page
              if (event.request.mode === 'navigate' && !cachedResponse) {
                return caches.match('/offline.html')
              }
              return cachedResponse
            })
          
          // Return cached version immediately, update in background
          return cachedResponse || fetchPromise
        })
    )
  }
})

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urlsToCache = event.data.payload.urls || []
    caches.open(DYNAMIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
  }
}) 