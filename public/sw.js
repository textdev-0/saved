// Based on MDN and web.dev best practices for offline PWAs
// https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Offline_Service_workers
// https://web.dev/offline-fallback-page/

const OFFLINE_VERSION = 1
const CACHE_NAME = 'link-manager-offline'
const OFFLINE_URL = 'offline.html'

// Install SW
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install')
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      // Setting {cache: 'reload'} ensures fresh response from network
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))
      console.log('[Service Worker] Offline page cached')
    })()
  )
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Activate SW
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate')
  
  event.waitUntil(
    (async () => {
      // Enable navigation preload if it's supported
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable()
      }
    })()
  )
  
  // Tell the active service worker to take control of the page immediately
  self.clients.claim()
})

// Fetch event
self.addEventListener('fetch', (event) => {
  // Only call event.respondWith() if this is a navigation request for an HTML page
  if (event.request.mode === 'navigate') {
    console.log('[Service Worker] Handling navigation request:', event.request.url)
    
    event.respondWith(
      (async () => {
        try {
          // First, try to use the navigation preload response if it's supported
          const preloadResponse = await event.preloadResponse
          if (preloadResponse) {
            console.log('[Service Worker] Using preload response')
            return preloadResponse
          }

          // Always try the network first for navigation requests
          console.log('[Service Worker] Trying network first')
          const networkResponse = await fetch(event.request)
          return networkResponse
        } catch (error) {
          // catch is only triggered if fetch() throws an exception, which is likely
          // due to a network error. If fetch() returns a valid HTTP response with
          // a response code in the 4xx or 5xx range, the catch() will NOT be called.
          console.log('[Service Worker] Fetch failed; returning offline page instead.', error)

          const cache = await caches.open(CACHE_NAME)
          const cachedResponse = await cache.match(OFFLINE_URL)
          return cachedResponse
        }
      })()
    )
  }

  // If this is not a navigation request, let the browser handle it normally
  // This allows other resources (CSS, JS, images) to load normally
}) 