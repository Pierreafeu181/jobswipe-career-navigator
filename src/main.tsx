import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { bootstrapSupabaseAuth } from "./lib/authBootstrap";

// Hotfix GitHub Pages + HashRouter: Supabase OAuth returns "#/#access_token=..."
(() => {
  const h = window.location.hash || "";
  if (h.startsWith("#/#access_token=") || h.startsWith("#/#error=")) {
    const fixed = "#" + h.slice(3); // remove "/#" after the first "#"
    window.history.replaceState(null, "", window.location.pathname + window.location.search + fixed);
  }
})();

// Enregistrement du Service Worker pour la PWA
// Ce code s'exécute uniquement côté client (navigateur)
// 
// IMPORTANT pour GitHub Pages :
// - Le service worker fonctionnera automatiquement en HTTPS sur GitHub Pages
// - L'application sera installable comme PWA une fois déployée
// - Le chemin utilise import.meta.env.BASE_URL pour s'adapter automatiquement au base path
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  // En mode développement, on désinscrit le Service Worker pour éviter les conflits avec Vite HMR
  // L'erreur "@vitejs/plugin-react-swc can't detect preamble" vient du fait que le SW sert une version cachée sans les scripts de dev
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        console.log("[ServiceWorker] Désinscription en mode dev pour permettre le HMR");
        registration.unregister();
      }
    });
  } else {
    // En production uniquement : Enregistrement du Service Worker
    window.addEventListener("load", () => {
      const base = import.meta.env.BASE_URL;
      navigator.serviceWorker
        .register(`${base}service-worker.js`, {
          scope: base,
        })
        .then((registration) => {
          console.log("[ServiceWorker] Registered successfully:", registration.scope);
          
          // Vérifier les mises à jour du service worker
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    // New service worker available - prompt reload (optional)
                    console.log("[ServiceWorker] New service worker available. Reloading page...");
                    // Auto-reload to activate new service worker
                    window.location.reload();
                  } else {
                    // First install
                    console.log("[ServiceWorker] Service worker installed for the first time.");
                  }
                }
              });
            }
          });
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.error("[ServiceWorker] Registration failed:", error);
        });
    });
  }
}

// Bootstrap Supabase auth before rendering (handle OAuth callbacks)
(async () => {
  await bootstrapSupabaseAuth();
  createRoot(document.getElementById("root")!).render(<App />);
})();
