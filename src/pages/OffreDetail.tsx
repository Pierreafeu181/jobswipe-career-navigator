import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJobById } from "@/lib/supabase";
import { loadProfile } from "@/lib/storage";
import { addFavorite, removeFavorite, isFavorite } from "@/lib/storage";
import { calculateCompatibilityScore } from "@/lib/scoring";
import { Job } from "@/types/job";
import { Loader2, ExternalLink, FileText, TrendingUp, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OffreDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);
  const profile = loadProfile();
  const score = job ? calculateCompatibilityScore(job, profile) : 0;

  useEffect(() => {
    if (id) {
      loadJob(id);
      setFavorite(isFavorite(id));
    }
  }, [id]);

  const loadJob = async (jobId: string) => {
    try {
      const data = await fetchJobById(jobId);
      setJob(data);
    } catch (error) {
      console.error("Error loading job:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = () => {
    if (!id) return;
    
    if (favorite) {
      removeFavorite(id);
      toast({ description: "Retiré des favoris" });
    } else {
      addFavorite(id);
      toast({ description: "Ajouté aux favoris" });
    }
    setFavorite(!favorite);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <LogoHeader />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <LogoHeader />
        <div className="px-6 py-8 text-center">
          <p className="text-muted-foreground">Offre non trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LogoHeader />
      
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="relative">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold text-foreground pr-16">Poste</h2>
              <Badge className="absolute top-6 right-6 bg-primary text-primary-foreground text-lg px-4 py-2">
                {score}%
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{job.company}</p>
            
            <SecondaryButton
              variant={favorite ? "favorite" : "default"}
              onClick={toggleFavorite}
              className="mt-3"
            >
              <Heart className={`w-4 h-4 mr-2 ${favorite ? "fill-current" : ""}`} />
              {favorite ? "Retirer des favoris" : "Favoris"}
            </SecondaryButton>
          </CardHeader>

          <CardContent className="space-y-6">
            {profile && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Profil</h3>
                <p className="text-sm text-muted-foreground">
                  {profile.formations.split("\n")[0]} • {profile.competences.split(",")[0]}
                </p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-foreground mb-2">Intitulé de la mission</h3>
              <p className="text-foreground">{job.title}</p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">À propos de l'entreprise</h3>
              <p className="text-sm text-muted-foreground">
                {job.company} - Secteur {job.secteur}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Informations complémentaires</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>📍 {job.location}</p>
                <p>📄 {job.contract_type}</p>
                <p>🎓 {job.niveau}</p>
                <p>💼 {job.famille}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <PrimaryButton onClick={() => window.open(job.redirect_url, "_blank")}>
                <ExternalLink className="w-5 h-5 mr-2" />
                Postuler
              </PrimaryButton>

              <div className="grid grid-cols-2 gap-3">
                <PrimaryButton
                  onClick={() => navigate(`/offres/${id}/fiche`)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Détails
                </PrimaryButton>

                <PrimaryButton
                  onClick={() => navigate(`/offres/${id}/score`)}
                  className="bg-secondary hover:bg-secondary/90"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Score
                </PrimaryButton>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OffreDetail;
