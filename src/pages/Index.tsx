import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { User, Briefcase } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LogoHeader />
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
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
              onClick={() => navigate("/offres")}
              className="bg-primary hover:bg-primary/90"
            >
              <Briefcase className="w-5 h-5 mr-2" />
              Les offres
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
