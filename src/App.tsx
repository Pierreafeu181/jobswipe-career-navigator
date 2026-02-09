import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import DisclaimerPage from "./pages/DisclaimerPage";
import Profil from "./pages/Profil";
import CV from "./pages/CV";
import JobswipeOffers from "./pages/Offres";
import OffreDetail from "./pages/OffreDetail";
import OffreFiche from "./pages/OffreFiche";
import OffreScore from "./pages/OffreScore";
import Dashboard from "./pages/Dashboard";
import Calendrier from "./pages/Calendrier";
import ApplicationDashboard from "./pages/ApplicationDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  useEffect(() => {
    let done = false;
    
    // Récupérer la session au montage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Vérifier si l'utilisateur a déjà accepté le disclaimer
      const accepted = localStorage.getItem("jobswipe_ai_consent") === "true";
      setDisclaimerAccepted(accepted);

      if (!done) {
        done = true;
        setAuthReady(true);
      }
    });

    // S'abonner aux changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_IN') {
        // Re-vérifier lors de la connexion (cas où on se reconnecte sans rafraîchir)
        setDisclaimerAccepted(localStorage.getItem("jobswipe_ai_consent") === "true");
      }
      if (!done) {
        done = true;
        setAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem("jobswipe_ai_consent", "true");
    setDisclaimerAccepted(true);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* Routes publiques - accessibles sans session */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {authReady && session ? (
              !disclaimerAccepted ? (
                <Route path="*" element={<DisclaimerPage onAccept={handleAcceptDisclaimer} />} />
              ) : (
              <>
                {/* Routes protégées - utilisateur authentifié */}
                <Route path="/" element={<HomePage session={session} />} />
                <Route path="/profil" element={<ProfilePage userId={session.user.id} />} />
                <Route path="/cv" element={<CV />} />
                {/* Routes Jobswipe */}
                <Route path="/jobswipe" element={<JobswipeOffers userId={session.user.id} />} />
                <Route path="/jobswipe/offres" element={<JobswipeOffers userId={session.user.id} />} />
                {/* Routes offres (legacy - rediriger vers jobswipe) */}
                <Route path="/offres" element={<JobswipeOffers userId={session.user.id} />} />
                <Route path="/offres/:id" element={<OffreDetail />} />
                <Route path="/offres/:id/fiche" element={<OffreFiche />} />
                <Route path="/offres/:id/score" element={<OffreScore />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/application-dashboard" element={<ApplicationDashboard />} />
                <Route path="/calendrier" element={<Calendrier />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </>
              )
            ) : authReady && !session ? (
              <>
                {/* Routes publiques - utilisateur non authentifié (seulement après authReady) */}
                <Route path="*" element={<AuthPage />} />
              </>
            ) : null}
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
