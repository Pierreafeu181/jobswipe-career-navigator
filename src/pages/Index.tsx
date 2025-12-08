import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { User, Briefcase } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

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
            <h2 className="text-3xl font-bold text-foreground mb-2">Bienvenue</h2>
            <p className="text-muted-foreground">Trouvez votre prochain emploi d'ingénieur</p>
          </div>

          <div className="space-y-4">
            <PrimaryButton 
              onClick={() => navigate("/profil")}
              className="bg-foreground hover:bg-foreground/90"
            >
              <User className="w-5 h-5 mr-2" />
              Mon profil
            </PrimaryButton>

            <PrimaryButton 
              onClick={() => navigate("/jobswipe/offres")}
              className="bg-primary hover:bg-primary/90"
            >
              <Briefcase className="w-5 h-5 mr-2" />
              Jobswipe
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
