const CACHE_NAME = 'mcq-flashcards-cache-v1.1'; // Increment version to force update
const urlsToCache = [
  '/',
  '/index.html',
  // Assuming index.tsx is the main entry point loaded by your setup.
  // If your build process renames or bundles it, adjust this path.
  '/index.tsx', 
  // CDN dependencies from importmap and HTML
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react@^19.1.0',
  'https://esm.sh/react@^19.1.0/jsx-runtime',
  'https://esm.sh/react-dom@^19.1.0/client',
  'https://esm.sh/@google/genai@^1.4.0',
  // Placeholder icons (user needs to create these in /icons/ directory)
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching initial assets');
        // Use individual requests to handle potential CORS issues more gracefully than cache.addAll
        const promises = urlsToCache.map(url => {
          // For CDN URLs, ensure CORS mode to allow caching.
          // For local assets, default mode is fine.
          const request = new Request(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' });
          return fetch(request).then(response => {
            if (!response.ok) {
              // Don't fail the entire install if a non-critical CDN asset fails (e.g. opaque response)
              console.warn(`Failed to fetch and cache ${url}. Status: ${response.status}`);
              return Promise.resolve(); // Continue installation
            }
            return cache.put(request, response);
          }).catch(err => {
            console.warn(`Skipping caching for ${url} due to fetch error:`, err);
            return Promise.resolve();
          });
        });
        return Promise.all(promises);
      })
      .catch(err => {
        console.error('Cache open/addAll failed during install:', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    // For non-GET requests, just fetch from network.
    // Or if it's an API call to Gemini, always fetch.
     if (event.request.url.includes('generativelanguage.googleapis.com')) {
        return event.respondWith(fetch(event.request));
     }
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        // Return cached response if found (Cache First strategy)
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request.clone()).then(networkResponse => {
          // Check if we received a valid response
          if (networkResponse && networkResponse.ok) { // .ok checks for status in 200-299 range
            // Cache the new response for future use
            // Clone because response is a stream and can be consumed once
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          console.error('Network request failed for:', event.request.url, error);
          // If network fails and not in cache, the browser will show its default offline error.
          // You could return a generic offline fallback page here if you cache one:
          // return caches.match('/offline.html'); 
        });
      });
    })
  );
});