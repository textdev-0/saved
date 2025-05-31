// Minimal service worker for PWA functionality
// Offline detection is now handled in the main app (YouTube approach)

const CACHE_VERSION = 1
const CACHE_NAME = `link-manager-pwa-v${CACHE_VERSION}`

// Install SW - just for PWA manifest support
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install - PWA support only')
  self.skipWaiting()
})

// Activate SW
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate - PWA support only')
  
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  self.clients.claim()
})

// No fetch interception - let browser handle everything normally
// Offline detection happens in the main app like YouTube 