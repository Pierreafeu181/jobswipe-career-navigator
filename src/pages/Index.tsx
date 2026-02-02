import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { User, Briefcase } from "lucide-react";
import { SEOHead } from "@/components/seo";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      <SEOHead
        title="Bienvenue - Trouvez votre emploi d'ingénieur"
        description="JobSwipe vous aide à trouver votre prochain emploi d'ingénieur avec des recommandations intelligentes"
        canonical={`${window.location.origin}${window.location.pathname}${window.location.hash}`}
      />
      {/* Bordures colorées subtiles sur les côtés */}
      <div className="fixed left-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-violet-200 via-purple-200 to-indigo-200 opacity-50 blur-3xl z-0 pointer-events-none" />
      <div className="fixed right-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-blue-200 via-indigo-200 to-violet-200 opacity-50 blur-3xl z-0 pointer-events-none" />
      
      <div className="relative z-10">
        <LogoHeader />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-semibold text-slate-800 mb-3">Bienvenue</h1>
            <p className="text-slate-600 text-lg">Trouvez votre prochain emploi d'ingénieur</p>
          </div>

          <div className="space-y-4">
            <PrimaryButton 
              onClick={() => navigate("/jobswipe/offres")}
              className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 ease-out flex items-center justify-center gap-2 h-auto text-base"
            >
              <Briefcase className="w-5 h-5 mr-2" />
              Commencer à swiper
            </PrimaryButton>

            <PrimaryButton 
              onClick={() => navigate("/profil")}
              className="w-full px-6 py-4 rounded-2xl bg-white text-slate-700 font-medium shadow-sm border border-slate-200 hover:bg-slate-50 hover:border-indigo-200 transition-all duration-200 ease-out flex items-center justify-center gap-2 h-auto text-base"
            >
              <User className="w-5 h-5 mr-2 text-indigo-600" />
              Mon profil
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
