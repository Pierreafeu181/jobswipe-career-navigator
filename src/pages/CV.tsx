import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadProfile } from "@/lib/storage";
import { ArrowRight } from "lucide-react";

const CV = () => {
  const navigate = useNavigate();
  const profile = loadProfile();

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <LogoHeader />
        <div className="px-6 py-8 max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">Veuillez d'abord compléter votre profil</p>
          <PrimaryButton onClick={() => navigate("/profil")}>
            Aller au profil
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LogoHeader />
      
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">CV généré</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-6 space-y-4">
              <div className="text-center pb-4 border-b border-border">
                <h2 className="text-2xl font-bold text-foreground">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{profile.contact}</p>
              </div>

              {profile.formations && (
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-2">Formations</h3>
                  <p className="text-sm text-foreground whitespace-pre-line">{profile.formations}</p>
                </div>
              )}

              {profile.experiences && (
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-2">Expériences</h3>
                  <p className="text-sm text-foreground whitespace-pre-line">{profile.experiences}</p>
                </div>
              )}

              {profile.competences && (
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-2">Compétences</h3>
                  <p className="text-sm text-foreground whitespace-pre-line">{profile.competences}</p>
                </div>
              )}
            </div>

            <PrimaryButton onClick={() => navigate("/offres")}>
              Suivant
              <ArrowRight className="w-5 h-5 ml-2" />
            </PrimaryButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CV;
