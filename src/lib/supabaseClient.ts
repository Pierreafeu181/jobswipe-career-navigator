/**
 * Client Supabase réutilisable pour l'application
 * 
 * Ce fichier configure et exporte une instance unique du client Supabase
 * pour être utilisée dans toute l'application.
 * 
 * Configuration des variables d'environnement :
 * 
 * Pour Vite (ce projet) :
 * - VITE_SUPABASE_URL : URL de votre projet Supabase
 * - VITE_SUPABASE_ANON_KEY : Clé publique anonyme de votre projet Supabase
 * 
 * Pour Next.js (si migration future) :
 * - NEXT_PUBLIC_SUPABASE_URL : URL de votre projet Supabase
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY : Clé publique anonyme de votre projet Supabase
 * 
 * Ces variables doivent être définies dans un fichier .env à la racine du projet :
 * 
 * VITE_SUPABASE_URL=https://votre-projet.supabase.co
 * VITE_SUPABASE_ANON_KEY=votre_cle_anon
 * 
 * Pour obtenir ces valeurs :
 * 1. Connectez-vous à https://supabase.com
 * 2. Sélectionnez votre projet
 * 3. Allez dans Settings > API
 * 4. Copiez l'URL du projet et la clé "anon public"
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Support pour Vite (import.meta.env) et Next.js (process.env)
// Priorité : VITE_ > NEXT_PUBLIC_ pour compatibilité
const getEnvVar = (viteKey: string, nextKey: string): string => {
  // Vite utilise import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteValue = import.meta.env[viteKey];
    // Vérifier que la valeur existe et n'est pas vide
    if (viteValue && typeof viteValue === 'string' && viteValue.trim() !== '') {
      return viteValue.trim();
    }
  }
  
  // Next.js utilise process.env
  if (typeof process !== 'undefined' && process.env) {
    const nextValue = process.env[nextKey];
    // Vérifier que la valeur existe et n'est pas vide
    if (nextValue && typeof nextValue === 'string' && nextValue.trim() !== '') {
      return nextValue.trim();
    }
  }
  
  // Debug : afficher les valeurs disponibles pour aider au diagnostic
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    console.error('Variables d\'environnement disponibles:', Object.keys(import.meta.env));
    console.error(`Valeur de ${viteKey}:`, import.meta.env[viteKey]);
  }
  
  throw new Error(
    `Variable d'environnement manquante : ${viteKey} ou ${nextKey}. ` +
    `Veuillez définir l'une de ces variables dans votre fichier .env et redémarrer le serveur de développement.`
  );
};

// Récupération des variables d'environnement avec support multi-plateforme
const supabaseUrl = getEnvVar(
  'VITE_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL'
);

const supabaseAnonKey = getEnvVar(
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
);

// Validation des variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configuration Supabase incomplète. ' +
    'Veuillez vérifier vos variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY'
  );
}

/**
 * Fonction fetch personnalisée avec timeout pour éviter les délais trop longs
 * Timeout de 30 secondes pour les requêtes d'authentification et API
 */
const fetchWithTimeout = async (
  url: RequestInfo | URL,
  options?: RequestInit
): Promise<Response> => {
  const TIMEOUT_MS = 30000; // 30 secondes

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La requête a pris trop de temps. Veuillez vérifier votre connexion et réessayer.');
    }
    throw error;
  }
};

/**
 * Client Supabase configuré avec authentification et persistance de session
 * 
 * Utilisation :
 * ```typescript
 * import { supabase } from '@/lib/supabaseClient';
 * 
 * // Exemple : récupérer des données
 * const { data, error } = await supabase.from('table').select('*');
 * 
 * // Exemple : authentification
 * const { data, error } = await supabase.auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password'
 * });
 * ```
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});

