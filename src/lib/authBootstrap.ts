import { supabase } from "./supabaseClient";

function extractCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Check query parameters first
    const queryCode = urlObj.searchParams.get("code");
    if (queryCode) return queryCode;
    
    // Check hash fragment (for HashRouter: #/path?code=...)
    const hash = urlObj.hash;
    if (hash) {
      const hashMatch = hash.match(/[?&]code=([^&]+)/);
      if (hashMatch) return hashMatch[1];
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function bootstrapSupabaseAuth(): Promise<void> {
  if (typeof window === "undefined") return;

  const href = window.location.href;

  // If PKCE code exists anywhere, exchange it for a session
  const code = extractCodeFromUrl(href);
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[AuthBootstrap] Error exchanging code for session:", error);
      } else {
        // Remove code & state from URL (both query and hash) using history.replaceState
        const url = new URL(window.location.href);
        
        // Remove from query params
        url.searchParams.delete("code");
        url.searchParams.delete("state");
        
        // Remove from hash if present
        if (url.hash) {
          const hashParts = url.hash.split("?");
          if (hashParts.length > 1) {
            const hashParams = new URLSearchParams(hashParts[1]);
            hashParams.delete("code");
            hashParams.delete("state");
            const newHash = hashParams.toString() 
              ? `${hashParts[0]}?${hashParams.toString()}`
              : hashParts[0];
            url.hash = newHash;
          }
        }
        
        window.history.replaceState({}, "", url.toString());
      }
    } catch (err) {
      console.error("[AuthBootstrap] Error during code exchange:", err);
    }
  }

  // Also handle implicit flow tokens if present in hash: access_token= or refresh_token=
  // In that case supabase-js usually auto-detects, but still clean URL if tokens exist.
  const url = new URL(window.location.href);
  const hash = url.hash;
  if (hash && (hash.includes("access_token=") || hash.includes("refresh_token="))) {
    // Supabase should auto-detect, but clean URL after a short delay
    setTimeout(() => {
      const cleanUrl = new URL(window.location.href);
      const hashParts = cleanUrl.hash.split("?");
      if (hashParts.length > 1) {
        const hashParams = new URLSearchParams(hashParts[1]);
        hashParams.delete("access_token");
        hashParams.delete("refresh_token");
        hashParams.delete("expires_in");
        hashParams.delete("token_type");
        hashParams.delete("type");
        const newHash = hashParams.toString() 
          ? `${hashParts[0]}?${hashParams.toString()}`
          : hashParts[0];
        cleanUrl.hash = newHash;
        window.history.replaceState({}, "", cleanUrl.toString());
      }
    }, 1000);
  }
}

