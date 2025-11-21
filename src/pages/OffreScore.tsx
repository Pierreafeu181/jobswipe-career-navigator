import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJobById } from "@/lib/supabase";
import { loadProfile } from "@/lib/storage";
import { calculateCompatibilityScore, getScoreAnalysis } from "@/lib/scoring";
import { Job } from "@/types/job";
import { Loader2, ArrowLeft } from "lucide-react";

const OffreScore = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const profile = loadProfile();

  useEffect(() => {
    if (id) {
      loadJob(id);
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

  const score = calculateCompatibilityScore(job, profile);
  const analysis = getScoreAnalysis(job, profile);

  return (
    <div className="min-h-screen bg-background">
      <LogoHeader />
      
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold mb-4">Score de compatibilité</CardTitle>
            <div className="flex justify-center">
              <Badge className="bg-primary text-primary-foreground text-4xl px-8 py-4">
                {score}%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Basé sur vos compétences</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Compétences</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.competences.map((comp, idx) => (
                  <Badge key={idx} variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    {comp}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Expériences</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {analysis.experiences}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Analyse détaillée</h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  {analysis.analysis}
                </p>
              </div>
            </div>

            <PrimaryButton onClick={() => navigate(`/offres/${id}`)}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </PrimaryButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OffreScore;
