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

const CACHE_NAME = "jobswipe-cache-v1";
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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Caching app shell");
      return cache.addAll(URLS_TO_CACHE).catch((error) => {
        console.error("[ServiceWorker] Error caching app shell:", error);
      });
    })
  );
  // Force le service worker à s'activer immédiatement après l'installation
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches si on change de version
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[ServiceWorker] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  // Prend le contrôle de toutes les pages immédiatement
  return self.clients.claim();
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

  // Stratégie cache-then-network simple pour les assets statiques
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retourner la version en cache si disponible
        return cachedResponse;
      }
      // Sinon, faire la requête réseau normale
      return fetch(request).catch((error) => {
        console.error("[ServiceWorker] Fetch failed:", error);
        // En cas d'erreur réseau, on peut retourner une page offline si nécessaire
        throw error;
      });
    })
  );
});

