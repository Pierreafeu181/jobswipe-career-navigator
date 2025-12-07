import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { User, Briefcase, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface HomePageProps {
  session: Session;
}

const HomePage = ({ session }: HomePageProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // La session sera mise à jour automatiquement via onAuthStateChange dans App.tsx
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-400 via-pink-500 via-purple-500 to-indigo-600 relative overflow-hidden">
      {/* Pattern overlay subtil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.1),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />
      
      <div className="relative z-10">
        <LogoHeader />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-semibold text-graphite mb-3">Bienvenue</h2>
            <p className="text-gray-dark text-lg">Trouvez votre prochain emploi d'ingénieur</p>
            {session.user.email && (
              <p className="text-sm text-gray-medium mt-3">
                Connecté en tant que {session.user.email}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate("/profil")}
              className="w-full px-6 py-4 rounded-2xl bg-mint text-white font-medium shadow-sm hover:bg-mint-dark transition-all duration-200 ease-out flex items-center justify-center gap-2"
            >
              <User className="w-5 h-5" />
              Mon profil
            </button>

            <button
              onClick={() => navigate("/jobswipe/offres")}
              className="w-full px-6 py-4 rounded-2xl bg-indigo text-white font-medium shadow-sm hover:bg-indigo/90 transition-all duration-200 ease-out flex items-center justify-center gap-2"
            >
              <Briefcase className="w-5 h-5" />
              Jobswipe
            </button>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSignOut}
              className="w-full px-6 py-3 rounded-2xl bg-white text-gray-dark hover:bg-gray-light transition-all duration-200 ease-out border border-gray-light shadow-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

