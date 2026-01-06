/**
 * Service Worker pour JobSwipe PWA
 * 
 * Ce service worker permet de rendre l'application installable comme PWA
 * en mettant en cache les ressources statiques de base.
 * 
 * IMPORTANT : Les requêtes vers Supabase et autres APIs ne sont PAS interceptées
 * pour ne pas casser la logique métier de l'application.
 * 
 * Compatibilité GitHub Pages :
 * - Fonctionne automatiquement en HTTPS sur GitHub Pages (requis pour les PWA)
 * - Les chemins incluent le base path /jobswipe-career-navigator/ pour GitHub Pages
 * - L'application sera installable une fois déployée
 */

const CACHE_NAME = "jobswipe-v3";
const BASE_PATH = "/jobswipe-career-navigator";
const URLS_TO_CACHE = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.webmanifest`,
  `${BASE_PATH}/icons/icon-192.png`,
  `${BASE_PATH}/icons/icon-512.png`
];

// Installation du service worker : on pré-cache quelques ressources de base
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Installing...");
  // Force le service worker à s'activer immédiatement après l'installation
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Caching app shell");
      return cache.addAll(URLS_TO_CACHE).catch((error) => {
        console.error("[ServiceWorker] Error caching app shell:", error);
      });
    })
  );
});

// Activation : nettoyage des anciens caches si on change de version
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activating...");
  event.waitUntil(
    Promise.all([
      // Delete old caches not matching CACHE_NAME
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log("[ServiceWorker] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim()
    ])
  );
});

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // On ne s'occupe que des requêtes GET
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // On ignore les appels API (Supabase, /api, etc.) pour ne pas casser la logique métier
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.com") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/auth/v1") ||
    url.pathname.startsWith("/rest/v1")
  ) {
    // Laisser passer les requêtes API sans interception
    return;
  }

  // Only intercept same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Cache-first strategy with network fallback - never throw
  event.respondWith(
    (async () => {
      try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Cache miss - try network
        try {
          const networkResponse = await fetch(request);
          // Cache successful responses for future use
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (fetchError) {
          console.error("[ServiceWorker] Network fetch failed:", fetchError);
          
          // For navigation requests, return cached index.html as fallback
          if (request.mode === "navigate") {
            const indexUrl = new URL(`${BASE_PATH}/index.html`, self.location.origin);
            const cachedIndex = await caches.match(indexUrl);
            if (cachedIndex) {
              return cachedIndex;
            }
          }
          
          // For other requests, return a basic error response
          return new Response("Network error", {
            status: 408,
            statusText: "Request Timeout",
            headers: { "Content-Type": "text/plain" }
          });
        }
      } catch (error) {
        console.error("[ServiceWorker] Unexpected error in fetch handler:", error);
        // Never throw - return a fallback response
        if (request.mode === "navigate") {
          const indexUrl = new URL(`${BASE_PATH}/index.html`, self.location.origin);
          const cachedIndex = await caches.match(indexUrl);
          if (cachedIndex) {
            return cachedIndex;
          }
        }
        return new Response("Service Worker Error", {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "text/plain" }
        });
      }
    })()
  );
});

