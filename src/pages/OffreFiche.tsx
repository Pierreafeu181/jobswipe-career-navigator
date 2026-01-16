import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchJobById } from "@/lib/supabase";
import { Job } from "@/types/job";
import { Loader2, ArrowLeft } from "lucide-react";

const OffreFiche = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadJob(id);
    }
  }, [id]);

  const loadJob = async (jobId: string) => {
    try {
      // Vérifier d'abord dans le stockage local
      const localJobs: Job[] = JSON.parse(localStorage.getItem("JOBSWIPE_LOCAL_IMPORTED_JOBS") || "[]");
      const localJob = localJobs.find(j => j.id === jobId);
      
      if (localJob) {
        setJob(localJob);
        return;
      }

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

  const description = job.raw?.description || "Description détaillée à venir...";

  return (
    <div className="min-h-screen bg-background">
      <LogoHeader />
      
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Fiche du poste</CardTitle>
            <p className="text-muted-foreground">{job.company}</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4">{job.title}</h3>
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line">
                {description}
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

export default OffreFiche;
