import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Enregistrement du Service Worker pour la PWA
// Ce code s'exécute uniquement côté client (navigateur)
// 
// IMPORTANT pour Vercel/Production :
// - Le service worker fonctionnera automatiquement en HTTPS sur Vercel
// - L'application sera installable comme PWA une fois déployée
// - Le chemin "/service-worker.js" est relatif et fonctionnera en production
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("[ServiceWorker] Registered successfully:", registration.scope);
        
        // Vérifier les mises à jour du service worker
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[ServiceWorker] New service worker available. Please refresh the page.");
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error("[ServiceWorker] Registration failed:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
