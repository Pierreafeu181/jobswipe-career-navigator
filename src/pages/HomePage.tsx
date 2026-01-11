import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { User, Briefcase, LogOut, LayoutDashboard } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Bordures colorées subtiles sur les côtés */}
      <div className="fixed left-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-violet-200 via-purple-200 to-indigo-200 opacity-50 blur-3xl z-0 pointer-events-none" />
      <div className="fixed right-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-blue-200 via-indigo-200 to-violet-200 opacity-50 blur-3xl z-0 pointer-events-none" />
      
      <div className="relative z-10">
        <LogoHeader />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-semibold text-slate-800 mb-3">Bienvenue</h2>
            <p className="text-slate-600 text-lg">Trouvez votre prochain emploi d'ingénieur</p>
            {session.user.email && (
              <p className="text-sm text-slate-500 mt-3">
                Connecté en tant que {session.user.email}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate("/jobswipe/offres")}
              className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer transition-all duration-200 ease-out flex items-center justify-center gap-2"
            >
              <Briefcase className="w-5 h-5" />
              Commencer à swiper
            </button>

            <button
              onClick={() => navigate("/profil")}
              className="w-full px-6 py-4 rounded-2xl bg-white text-slate-700 font-medium shadow-sm border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 hover:scale-[1.02] cursor-pointer transition-all duration-200 ease-out flex items-center justify-center gap-2"
            >
              <User className="w-5 h-5 text-indigo-600" />
              Mon profil
            </button>

            <button
              onClick={() => navigate("/application-dashboard")}
              className="w-full px-6 py-4 rounded-2xl bg-white text-slate-700 font-medium shadow-sm border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 hover:scale-[1.02] cursor-pointer transition-all duration-200 ease-out flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-5 h-5 text-indigo-600" />
              Dashboard
            </button>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSignOut}
              className="w-full px-6 py-3 rounded-2xl bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 ease-out flex items-center justify-center gap-2"
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
