import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJobById } from "@/lib/supabase";
import { supabase } from "@/lib/supabaseClient";
import { addFavorite, removeFavorite, isFavorite } from "@/lib/storage";
import { calculateCompatibilityScore } from "@/lib/scoring";
import { downloadFile } from "@/lib/utils";
import { Job, UserProfile } from "@/types/job";
import { Profile } from "@/types/profile";
import { Loader2, ExternalLink, FileText, TrendingUp, Heart, Mail, Sparkles, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OffreDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingCV, setGeneratingCV] = useState(false);
  const [generatingCL, setGeneratingCL] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (data) {
          const loaded: Profile = {
            id: data.id,
            first_name: data.first_name,
            last_name: data.last_name,
            city: data.city,
            target_role: data.target_role,
            experience_level: data.experience_level,
            created_at: data.created_at,
            email: data.email,
            phone: data.phone,
            linkedin: data.linkedin,
            availability: data.availability,
            education: Array.isArray(data.education) ? data.education : [],
            experiences: Array.isArray(data.experiences) ? data.experiences : [],
            projects: Array.isArray(data.projects) ? data.projects : [],
            languages: Array.isArray(data.languages) ? data.languages : [],
            hardSkills: Array.isArray(data.hard_skills) ? data.hard_skills : [],
            softSkills: Array.isArray(data.soft_skills) ? data.soft_skills : [],
            interests: Array.isArray(data.interests) ? data.interests : [],
            activities: Array.isArray(data.activities) ? data.activities : [],
          };
          setUserProfile(loaded);
        }
      }
    };
    fetchProfile();
  }, []);

  const profile: UserProfile = userProfile
    ? {
        firstName: userProfile.first_name || "Utilisateur",
        lastName: userProfile.last_name || "",
        formations: userProfile.education && userProfile.education.length > 0
          ? userProfile.education.map(e => `${e.degree} - ${e.school} (${e.startDate} - ${e.endDate})`).join('\n')
          : "Aucune formation renseignée.",
        experiences: userProfile.experiences && userProfile.experiences.length > 0
          ? userProfile.experiences.map(e => `${e.role} chez ${e.company} (${e.startDate} - ${e.endDate})\n${e.description}`).join('\n\n')
          : "Aucune expérience renseignée.",
        competences: [
          ...(userProfile.hardSkills || []),
          ...(userProfile.softSkills || []),
          ...(userProfile.languages?.map(l => `${l.name} (${l.level})`) || [])
        ].join(', ') || "Aucune compétence renseignée.",
        contact: [userProfile.email, userProfile.phone, userProfile.city, userProfile.linkedin].filter(Boolean).join(' | ') || "Aucun contact renseigné."
      }
    : {
        firstName: "Utilisateur",
        lastName: "Exemple",
        formations: "Aucune formation renseignée. Allez sur la page de profil pour en ajouter.",
        experiences: "Aucune expérience renseignée. Allez sur la page de profil pour en ajouter.",
        competences: "Aucune compétence renseignée. Allez sur la page de profil pour en ajouter.",
        contact: "Aucun contact renseigné. Allez sur la page de profil pour en ajouter.",
      };

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

  const formatProfileForBackend = (profile: Profile) => {
    return {
      first_name: profile.first_name,
      last_name: profile.last_name,
      full_name: `${profile.first_name} ${profile.last_name}`,
      contacts: {
        emails: [profile.email],
        phones: [profile.phone],
        locations: [profile.city]
      },
      social_links: profile.linkedin ? [{ platform: "LinkedIn", url: profile.linkedin }] : [],
      raw_summary: `${profile.target_role} - ${profile.experience_level}`,
      professional_experiences: profile.experiences.map(e => ({
        title: e.role,
        company: e.company,
        start_date: e.startDate,
        end_date: e.endDate,
        description: e.description,
        location: "" 
      })),
      education: profile.education.map(e => ({
        degree: e.degree,
        school: e.school,
        start_date: e.startDate,
        end_date: e.endDate,
        description: ""
      })),
      skills: {
        hard_skills: profile.hardSkills,
        soft_skills: profile.softSkills,
        languages: profile.languages.map(l => `${l.name} (${l.level})`)
      },
      interests: profile.interests,
      academic_projects: profile.projects || []
    };
  };

  const formatJobForBackend = (job: Job) => {
    return {
      title: job.title,
      company_name: job.company,
      location: job.location,
      contract_type: job.contract_type,
      seniority_level: job.niveau,
      description: job.description || job.raw?.description,
      // Champs optionnels pour le générateur
      missions: [], 
      requirements: [],
      hard_skills: [],
      soft_skills: [],
      language: "fr"
    };
  };

  // Fonction robuste pour télécharger un PDF depuis une chaîne Base64
  const downloadBase64Pdf = (filename: string, base64Data: string) => {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erreur téléchargement PDF:", e);
      toast({ variant: "destructive", description: "Erreur lors de la création du fichier PDF." });
    }
  };

  const handleGenerateApplication = async () => {
    if (!job || !userProfile) {
      toast({ variant: "destructive", description: "Profil ou offre manquant" });
      return;
    }

    setGenerating(true);
    toast({ description: "Démarrage du Pack Candidature IA..." });

    try {
      const cvData = formatProfileForBackend(userProfile);
      const offerData = formatJobForBackend(job);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // --- ÉTAPE 1 : CV ---
      toast({ description: "1/2 Génération du CV optimisé..." });
      const resCV = await fetch(`${API_URL}/generate-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_data: cvData, offer_data: offerData, gender: "M" })
      });

      if (!resCV.ok) throw new Error("Erreur lors de la génération du CV");
      const dataCV = await resCV.json();

      if (dataCV.files?.cv_pdf) {
        downloadBase64Pdf(`CV_Optimise_${job.company}.pdf`, dataCV.files.cv_pdf);
      }

      // --- ÉTAPE 2 : Lettre de motivation ---
      toast({ description: "2/2 Génération de la lettre de motivation..." });
      const resCL = await fetch(`${API_URL}/generate-cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_data: cvData, offer_data: offerData, gender: "M" })
      });

      if (!resCL.ok) throw new Error("Erreur lors de la génération de la lettre");
      const dataCL = await resCL.json();

      if (dataCL.files?.cl_pdf) {
        downloadBase64Pdf(`Lettre_Motivation_${job.company}.pdf`, dataCL.files.cl_pdf);
      }

      toast({ description: "Pack Candidature complet téléchargé !" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", description: error instanceof Error ? error.message : "Erreur technique" });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateCV = async () => {
    if (!job || !userProfile) {
      toast({ variant: "destructive", description: "Profil ou offre manquant" });
      return;
    }

    setGeneratingCV(true);
    toast({ description: "Génération de votre CV par l'IA en cours..." });

    try {
      const cvData = formatProfileForBackend(userProfile);
      const offerData = formatJobForBackend(job);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/generate-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_data: cvData, offer_data: offerData, gender: "M" })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de la génération du CV");
      }

      const data = await response.json();

      if (data.files?.cv_pdf) {
        downloadBase64Pdf(`CV_Optimise_${job.company}.pdf`, data.files.cv_pdf);
        toast({ description: "CV généré et téléchargé avec succès !" });
      } else {
        throw new Error("Le fichier CV PDF n'a pas été retourné par l'API.");
      }

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", description: error instanceof Error ? error.message : "Erreur technique" });
    } finally {
      setGeneratingCV(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!job || !userProfile) {
      toast({ variant: "destructive", description: "Profil ou offre manquant" });
      return;
    }

    setGeneratingCL(true);
    toast({ description: "Génération de votre lettre de motivation par l'IA en cours..." });

    try {
      const cvData = formatProfileForBackend(userProfile);
      const offerData = formatJobForBackend(job);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/generate-cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_data: cvData, offer_data: offerData, gender: "M" })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erreur lors de la génération de la lettre");
      }

      const data = await response.json();

      if (data.files?.cl_pdf) {
        downloadBase64Pdf(`Lettre_Motivation_${job.company}.pdf`, data.files.cl_pdf);
        toast({ description: "Lettre de motivation générée et téléchargée avec succès !" });
      } else {
        throw new Error("Le fichier de lettre de motivation PDF n'a pas été retourné par l'API.");
      }

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", description: error instanceof Error ? error.message : "Erreur technique" });
    } finally {
      setGeneratingCL(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <LogoHeader />
        <div className="flex items-center justify-center min-h-screen">
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
            {userProfile && (
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
              
              <div className="grid grid-cols-2 gap-3">
                <PrimaryButton
                  onClick={handleGenerateCV}
                  disabled={generatingCV || generating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {generatingCV ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  {generatingCV ? "Génération..." : "Générer CV"}
                </PrimaryButton>

                <PrimaryButton
                  onClick={handleGenerateCoverLetter}
                  disabled={generatingCL || generating}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {generatingCL ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PenTool className="w-4 h-4 mr-2" />}
                  {generatingCL ? "Génération..." : "Générer Lettre"}
                </PrimaryButton>
              </div>

              <PrimaryButton
                onClick={handleGenerateApplication}
                disabled={generating || generatingCV || generatingCL}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
              >
                {generating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                {generating ? "Génération IA en cours..." : "Générer Pack Candidature IA"}
              </PrimaryButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OffreDetail;
