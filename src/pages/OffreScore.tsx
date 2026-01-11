import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJobById } from "@/lib/supabase";
import { supabase } from "@/lib/supabaseClient";
import { Job } from "@/types/job";
import { Profile } from "@/types/profile";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Lightbulb, Briefcase, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OffreScore = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState<any | null>(null);

  useEffect(() => {
    if (id) {
      loadJobAndCalculateScore(id);
    }
  }, [id]);

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
      missions: [], 
      requirements: [],
      hard_skills: [],
      soft_skills: [],
      language: "fr"
    };
  };

  const loadJobAndCalculateScore = async (jobId: string) => {
    try {
      setLoading(true);
      
      // 1. Charger l'offre
      const jobData = await fetchJobById(jobId);
      setJob(jobData);

      // 2. Charger le profil complet
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileData) return;

      // 3. Préparer les données
      const profile = { ...profileData } as Profile; // Cast simple car la structure correspond
      const cvData = formatProfileForBackend(profile);
      const offerData = formatJobForBackend(jobData);

      // 4. Appeler l'API de scoring
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/score-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_data: cvData, offer_data: offerData, gender: (profile as any)?.gender || "M" })
      });

      if (!response.ok) throw new Error("Erreur lors du calcul du score");
      
      const result = await response.json();
      setScoreData(result);

    } catch (error) {
      console.error("Error loading job:", error);
      toast({ variant: "destructive", description: "Impossible de calculer le score IA." });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <LogoHeader />
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Analyse de compatibilité par l'IA...</p>
        </div>
      </div>
    );
  }

  if (!job || !scoreData) {
    return (
      <div className="min-h-screen bg-background">
        <LogoHeader />
        <div className="px-6 py-8 text-center">
          <p className="text-muted-foreground">Offre non trouvée ou analyse impossible.</p>
          <PrimaryButton onClick={() => navigate(`/offres/${id}`)} className="mt-4">
            Retour
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const score = scoreData.overall_score || 0;
  
  // Déterminer la couleur du badge selon le score
  const getScoreColor = (s: number) => {
    if (s >= 80) return "bg-green-500 hover:bg-green-600";
    if (s >= 50) return "bg-yellow-500 hover:bg-yellow-600";
    return "bg-red-500 hover:bg-red-600";
  };

  return (
    <div className="min-h-screen bg-background">
      <LogoHeader />
      
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold mb-6">Analyse de Compatibilité IA</CardTitle>
            <div className="flex justify-center">
              <div className={`flex items-center justify-center w-32 h-32 rounded-full border-8 ${score >= 80 ? 'border-green-500 text-green-600' : score >= 50 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'} bg-white shadow-xl`}>
                <span className="text-4xl font-bold">{score}%</span>
              </div>
            </div>
            <p className="text-base text-muted-foreground mt-6 italic px-4">
              "{scoreData.summary}"
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Détail des scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Compétences</span>
                  <span>{scoreData.scores?.skills_match}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${scoreData.scores?.skills_match}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Expérience</span>
                  <span>{scoreData.scores?.experience_match}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${scoreData.scores?.experience_match}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Formation</span>
                  <span>{scoreData.scores?.education_match}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-purple-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${scoreData.scores?.education_match}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Langues</span>
                  <span>{scoreData.scores?.language_match}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${scoreData.scores?.language_match}%` }}></div>
                </div>
              </div>
            </div>
            
            {/* Points Forts */}
            {scoreData.key_strengths && scoreData.key_strengths.length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Points Forts
                </h3>
                <ul className="space-y-2">
                  {scoreData.key_strengths.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-green-700 flex items-start">
                      <span className="mr-2">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lacunes / Gaps */}
            {scoreData.key_gaps && scoreData.key_gaps.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center">
                  <XCircle className="w-5 h-5 mr-2" />
                  Points d'attention
                </h3>
                <ul className="space-y-2">
                  {scoreData.key_gaps.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-red-700 flex items-start">
                      <span className="mr-2">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compétences manquantes */}
            {(scoreData.missing_hard_skills?.length > 0 || scoreData.missing_soft_skills?.length > 0) && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Compétences manquantes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {scoreData.missing_hard_skills?.map((skill: string, idx: number) => (
                    <Badge key={`hard-${idx}`} variant="outline" className="bg-white text-orange-700 border-orange-200">
                      {skill}
                    </Badge>
                  ))}
                  {scoreData.missing_soft_skills?.map((skill: string, idx: number) => (
                    <Badge key={`soft-${idx}`} variant="outline" className="bg-white text-orange-600 border-orange-200 italic">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Conseils d'amélioration */}
            {scoreData.recommended_improvements && scoreData.recommended_improvements.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Conseils pour améliorer votre profil
                </h3>
                <ul className="space-y-2">
                  {scoreData.recommended_improvements.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-blue-700 flex items-start">
                      <span className="mr-2">→</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Projets recommandés */}
            {scoreData.recommended_projects_or_experiences && scoreData.recommended_projects_or_experiences.length > 0 && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2" />
                  Projets ou expériences recommandés
                </h3>
                <ul className="space-y-2">
                  {scoreData.recommended_projects_or_experiences.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-purple-700 flex items-start">
                      <span className="mr-2">→</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Formations recommandées */}
            {scoreData.recommended_courses_or_certifications && scoreData.recommended_courses_or_certifications.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <h3 className="font-semibold text-indigo-800 mb-3 flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  Formations ou certifications recommandées
                </h3>
                <ul className="space-y-2">
                  {scoreData.recommended_courses_or_certifications.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-indigo-700 flex items-start">
                      <span className="mr-2">→</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
