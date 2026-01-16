import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { Job } from "@/types/job";
import { superlikeJob, getSuperlikedJobs } from "@/lib/swipes";
import { Loader2, Heart, X, MapPin, Building2, Briefcase, ExternalLink, RotateCcw, Star, Home, Download, Trash2, User, LayoutDashboard } from "lucide-react";
import { JobSwipeScreen } from "@/components/swipe";
import { OfferDetailModal } from "@/components/OfferDetailModal";
import { useToast } from "@/hooks/use-toast";

interface OffresProps {
  userId: string;
}

// TODO: Remettre à 20 après les tests
const DAILY_LIKE_LIMIT = 10; // Limite de likes par jour (actuellement à 10 pour les tests, remettre à 20 en production)

// Types pour l'historique des swipes
type SwipeAction = "like" | "dislike" | "superlike";

interface SwipeHistoryItem {
  offer: Job;
  action: SwipeAction;
  jobId: string;
}

// Composant pour afficher le score de compatibilité dans les listes
const JobScore = ({ job, cvData }: { job: Job; cvData: any }) => {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!job || !cvData) return;

    const fetchScore = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API_URL}/score-fast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // On fusionne job et job.raw pour s'assurer d'avoir les hard_skills pour le scoring
          body: JSON.stringify({ cv_data: cvData, offer_data: { ...job, ...(job.raw || {}) } }),
        });
        if (res.ok) {
          const data = await res.json();
          setScore(data.score);
        }
      } catch (e) {
        console.error("Erreur fetch score:", e);
      }
    };
    fetchScore();
  }, [job, cvData]);

  if (score === null) return null;

  // Calcul de la couleur dynamique (Rouge 0 -> Vert 120)
  const hue = Math.min(120, Math.max(0, (score / 100) * 120));
  const style = {
    backgroundColor: `hsl(${hue}, 85%, 96%)`,
    color: `hsl(${hue}, 90%, 35%)`,
    borderColor: `hsl(${hue}, 80%, 80%)`,
  };

  return (
    <div 
      className="absolute top-4 left-4 px-3 py-1 rounded-full border font-bold text-sm z-20 shadow-sm flex items-center gap-1"
      style={style}
    >
      <span className="text-xs font-normal opacity-80">Match</span>
      {score}%
    </div>
  );
};

// Composant pour la page de swipe des offres (JobswipeOffers)
const JobswipeOffers = ({ userId }: OffresProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // State pour l'onglet actif
  const [activeTab, setActiveTab] = useState<"all" | "liked" | "superliked">("all");

  useEffect(() => {
    if (location.state?.initialView) {
      const { initialView } = location.state;
      if (initialView === 'liked' || initialView === 'superliked') {
        setActiveTab(initialView);
      }
    }
  }, [location.state]);

  // States pour "Toutes les offres"
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [swiping, setSwiping] = useState<string | null>(null);

  // States pour "Offres likées"
  const [likedJobs, setLikedJobs] = useState<Job[]>([]);
  const [loadingLiked, setLoadingLiked] = useState(false);

  // States pour "Offres superlikées"
  const [superlikedJobs, setSuperlikedJobs] = useState<Job[]>([]);
  const [loadingSuperliked, setLoadingSuperliked] = useState(false);

  // States communs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States pour la limite de likes par jour
  const [likesToday, setLikesToday] = useState<number>(0);
  const [limitReached, setLimitReached] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // en secondes

  // States pour la vue détaillée
  const [selectedOffer, setSelectedOffer] = useState<Job | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // State pour la confirmation de suppression
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // State pour l'historique des swipes (pour le rewind)
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([]);

  // State pour les données CV et le score courant
  const [userCvData, setUserCvData] = useState<any>(null);
  const [currentScore, setCurrentScore] = useState<number | null>(null);

  // Fonction utilitaire : obtenir le début de la journée (minuit local)
  const getStartOfDay = (): Date => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  };

  // Fonction utilitaire : obtenir le prochain minuit
  const getNextMidnight = (): Date => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    return nextMidnight;
  };

  // Fonction utilitaire : calculer le temps restant en secondes
  const calculateTimeRemaining = (): number => {
    const now = new Date();
    const nextMidnight = getNextMidnight();
    const diff = Math.floor((nextMidnight.getTime() - now.getTime()) / 1000);
    return Math.max(0, diff);
  };

  // Fonction utilitaire : formater le temps en HH:MM:SS
  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Récupérer le nombre de likes du jour depuis Supabase
  // Utilise la date de la base de données (created_at::date = current_date) pour éviter les problèmes de timezone
  const loadLikesToday = async () => {
    try {
      // Utiliser une fonction RPC ou une requête qui compare les dates côté serveur
      // Pour Supabase, on peut utiliser une requête avec filtrage par date
      // Note: Supabase PostgREST ne supporte pas directement created_at::date dans les filtres
      // On va utiliser une plage de dates basée sur UTC pour être sûr
      const now = new Date();
      const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const endOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      
      // Compter les likes ET les superlikes pour la limite quotidienne
      // Les superlikes sont des likes avec is_superlike = true
      const { count: likesCount, error: likesError } = await (supabase as any)
        .from("swipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("direction", "like")
        .eq("is_superlike", false)
        .gte("created_at", startOfDayUTC.toISOString())
        .lte("created_at", endOfDayUTC.toISOString());

      const { count: superlikesCount, error: superlikesError } = await (supabase as any)
        .from("swipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("direction", "like")
        .eq("is_superlike", true)
        .gte("created_at", startOfDayUTC.toISOString())
        .lte("created_at", endOfDayUTC.toISOString());

      if (likesError || superlikesError) {
        console.error("Error fetching likes/superlikes today:", likesError || superlikesError);
        return;
      }

      const swipesToday = (likesCount || 0) + (superlikesCount || 0);
      const isLimitReached = swipesToday >= DAILY_LIKE_LIMIT;
      
      setLikesToday(swipesToday);
      setLimitReached(isLimitReached);

      // Si la limite est atteinte, initialiser le temps restant
      if (isLimitReached) {
        setTimeRemaining(calculateTimeRemaining());
      }
    } catch (err) {
      console.error("Error loading likes today:", err);
    }
  };

  // Charger les données CV de l'utilisateur (requis pour le scoring)
  useEffect(() => {
    const loadUserCv = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (data) {
          // Transformation des données de la table 'profiles' au format attendu par le backend
          const formattedCvData = {
            skills: {
              hard_skills: data.hard_skills || [],
              soft_skills: data.soft_skills || [],
            },
            professional_experiences: (data.experiences || []).map((exp: any) => ({
              title: exp.role || "", 
              company: exp.company || "",
              description: exp.description || ""
            })),
            raw_summary: data.target_role || "",
          };
          setUserCvData(formattedCvData);
        }
      } catch (err) {
        console.error("Erreur chargement CV:", err);
      }
    };
    loadUserCv();
  }, [userId]);

  // Calculer le score pour l'offre courante (Swipe view)
  useEffect(() => {
    const currentOffer = jobs[currentIndex];
    if (!currentOffer || !userCvData) {
      setCurrentScore(null);
      return;
    }

    const fetchCurrentScore = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API_URL}/score-fast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cv_data: userCvData, offer_data: { ...currentOffer, ...(currentOffer.raw || {}) } }),
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentScore(data.score);
        }
      } catch (e) {
        console.error("Erreur fetch score courant:", e);
      }
    };
    fetchCurrentScore();
  }, [currentIndex, jobs, userCvData]);

  // Charger les offres non swipées au montage si onglet "all"
  useEffect(() => {
    if (activeTab === "all") {
      loadUnswipedJobs();
      loadLikesToday();
    }
  }, [userId, activeTab]);

  // Charger les offres likées quand on passe à l'onglet "liked"
  useEffect(() => {
    if (activeTab === "liked") {
      loadLikedJobs();
    }
  }, [activeTab, userId]);

  // Charger les offres superlikées quand on passe à l'onglet "superliked"
  useEffect(() => {
    if (activeTab === "superliked") {
      loadSuperlikedJobs();
    }
  }, [activeTab, userId]);

  // Compte à rebours jusqu'à minuit quand la limite est atteinte
  useEffect(() => {
    if (!limitReached) return;

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Si on atteint 0, c'est minuit, on reset
      if (remaining <= 0) {
        setLikesToday(0);
        setLimitReached(false);
        setTimeRemaining(0);
        // Recharger les offres et les likes du jour
        if (activeTab === "all") {
          loadUnswipedJobs();
          loadLikesToday();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [limitReached, activeTab]);

  const loadUnswipedJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les job_id déjà swipés par l'utilisateur (tous les temps, pas seulement aujourd'hui)
      const { data: swipesData, error: swipesError } = await (supabase as any)
        .from("swipes")
        .select("job_id")
        .eq("user_id", userId);

      if (swipesError) {
        console.error("Error fetching swipes:", swipesError);
        setError("Erreur lors du chargement des swipes");
        return;
      }

      const swipedJobIds = swipesData?.map((swipe) => swipe.job_id) || [];

      // Récupérer les jobs non swipés en excluant ceux déjà swipés dans la requête
      let query = (supabase as any)
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50); // Récupérer plus pour avoir assez après filtrage

      const { data: jobsData, error: jobsError } = await query;

      if (jobsError) {
        console.error("Error fetching jobs:", jobsError);
        setError("Erreur lors du chargement des offres");
        return;
      }

      // Filtrer côté JS pour n'afficher que les jobs non swipés (tous les temps)
      const unswipedJobs = (jobsData || []).filter(
        (job) => !swipedJobIds.includes(job.id)
      ).slice(0, 20); // Limiter à 20 après filtrage

      setJobs(unswipedJobs);
      setCurrentIndex(0); // Reset l'index quand on charge de nouvelles offres
    } catch (err) {
      console.error("Error loading jobs:", err);
      setError("Une erreur inattendue s'est produite");
    } finally {
      setLoading(false);
    }
  };

  const loadLikedJobs = async () => {
    try {
      setLoadingLiked(true);
      setError(null);

      // Récupérer les swipes avec direction = 'like' et is_superlike = false (likes normaux uniquement)
      const { data: swipesData, error: swipesError } = await (supabase as any)
        .from("swipes")
        .select("job_id, created_at")
        .eq("user_id", userId)
        .eq("direction", "like")
        .eq("is_superlike", false)
        .order("created_at", { ascending: false });

      if (swipesError) {
        console.error("Error fetching liked swipes:", swipesError);
        setError("Erreur lors du chargement des offres likées");
        return;
      }

      if (!swipesData || swipesData.length === 0) {
        setLikedJobs([]);
        return;
      }

      // Récupérer les job_id likés
      const likedJobIds = swipesData.map((swipe) => swipe.job_id);

      // Récupérer les jobs correspondants
      const { data: jobsData, error: jobsError } = await (supabase as any)
        .from("jobs")
        .select("*")
        .in("id", likedJobIds);

      if (jobsError) {
        console.error("Error fetching liked jobs:", jobsError);
        setError("Erreur lors du chargement des offres likées");
        return;
      }

      // Trier les jobs selon l'ordre des swipes (plus récent en premier)
      const sortedJobs = (jobsData || []).sort((a, b) => {
        const aSwipe = swipesData.find((s) => s.job_id === a.id);
        const bSwipe = swipesData.find((s) => s.job_id === b.id);
        if (!aSwipe || !bSwipe) return 0;
        return new Date(bSwipe.created_at).getTime() - new Date(aSwipe.created_at).getTime();
      });

      // Récupérer les offres locales
      const localJobs: Job[] = JSON.parse(localStorage.getItem("JOBSWIPE_LOCAL_IMPORTED_JOBS") || "[]");
      
      // Fusionner et trier par date de création (plus récent en premier)
      const allJobs = [...localJobs, ...sortedJobs].sort((a, b) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      setLikedJobs(allJobs);
    } catch (err) {
      console.error("Error loading liked jobs:", err);
      setError("Une erreur inattendue s'est produite");
    } finally {
      setLoadingLiked(false);
    }
  };

  // Fonction pour sauvegarder le swipe dans Supabase (appelée de manière asynchrone)
  const saveSwipeToSupabase = async (direction: "like" | "dislike", jobId: string, isSuperlike: boolean = false) => {
    try {
      const { data, error: swipeError } = await (supabase as any).from("swipes").upsert(
        {
          user_id: userId,
          job_id: jobId,
          direction: direction,
          is_superlike: isSuperlike,
          created_at: new Date().toISOString(), // Force update timestamp to bring it to top
        },
        {
          onConflict: "user_id,job_id",
        }
      );

      if (swipeError) {
        console.error("Error saving swipe:", swipeError);
        setError(`Erreur lors de l'enregistrement du swipe: ${swipeError.message}`);
        return;
      }

      // Si c'est un like (normal ou superlike), recharger le compteur depuis la base de données
      if (direction === "like") {
        await loadLikesToday();
      }
    } catch (err) {
      console.error("Error in saveSwipeToSupabase:", err);
      setError("Une erreur inattendue s'est produite");
    }
  };

  // Handlers pour le swipe interactif avec optimistic UI
  const handleSwipeRight = () => {
    const currentOffer = jobs[currentIndex];
    if (!currentOffer || swiping) return;
    
    // Empêcher les likes si la limite est atteinte
    if (limitReached) {
      return;
    }

    // Ajouter à l'historique AVANT de passer à l'offre suivante
    setSwipeHistory((prev) => [
      ...prev,
      {
        offer: currentOffer,
        action: "like",
        jobId: currentOffer.id,
      },
    ]);

    // Avancer immédiatement l'index (optimistic UI)
    setCurrentIndex((prev) => {
      const newIndex = prev + 1;
      
      // Si on arrive à la fin, recharger plus d'offres
      if (newIndex >= jobs.length - 1) {
        // Recharger en arrière-plan sans bloquer
        loadMoreJobs();
      }
      
      return newIndex;
    });

    setSwiping(currentOffer.id);

    // Sauvegarder dans Supabase de manière asynchrone (ne bloque pas l'UI)
    void saveSwipeToSupabase("like", currentOffer.id, false).finally(() => {
      setSwiping(null);
    });
  };

  const handleSwipeLeft = () => {
    const currentOffer = jobs[currentIndex];
    if (!currentOffer || swiping) return;

    // Ajouter à l'historique AVANT de passer à l'offre suivante
    setSwipeHistory((prev) => [
      ...prev,
      {
        offer: currentOffer,
        action: "dislike",
        jobId: currentOffer.id,
      },
    ]);

    // Avancer immédiatement l'index (optimistic UI)
    setCurrentIndex((prev) => {
      const newIndex = prev + 1;
      
      // Si on arrive à la fin, recharger plus d'offres
      if (newIndex >= jobs.length - 1) {
        // Recharger en arrière-plan sans bloquer
        loadMoreJobs();
      }
      
      return newIndex;
    });

    setSwiping(currentOffer.id);

    // Sauvegarder dans Supabase de manière asynchrone (ne bloque pas l'UI)
    void saveSwipeToSupabase("dislike", currentOffer.id).finally(() => {
      setSwiping(null);
    });
  };

  // Handler pour ouvrir la vue détaillée
  const handleOpenDetails = (job?: Job | any) => {
    // Si l'argument est un Job (a une propriété 'company'), on l'utilise.
    // Sinon (undefined ou event venant du swipe), on utilise le job courant.
    const currentOffer = (job && typeof job === 'object' && 'company' in job) ? (job as Job) : jobs[currentIndex];
    if (currentOffer) {
      setSelectedOffer(currentOffer);
      setIsDetailOpen(true);
    }
  };

  // Handler pour fermer la vue détaillée
  const handleCloseDetails = () => {
    setIsDetailOpen(false);
    // Ne pas réinitialiser selectedOffer immédiatement pour éviter le flash
    setTimeout(() => setSelectedOffer(null), 200);
  };

  // Handler pour le retour en arrière (rewind)
  const handleRewind = async () => {
    // Si l'historique est vide, ne rien faire
    if (swipeHistory.length === 0) {
      return;
    }

    // Récupérer le dernier swipe de l'historique
    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    
    // Retirer le dernier élément de l'historique
    setSwipeHistory((prev) => prev.slice(0, -1));

    // Revenir à l'offre précédente
    setCurrentIndex((prev) => {
      const newIndex = Math.max(0, prev - 1);
      return newIndex;
    });

    // Supprimer le swipe de Supabase
    try {
      const { error } = await (supabase as any)
        .from("swipes")
        .delete()
        .eq("user_id", userId)
        .eq("job_id", lastSwipe.jobId);

      if (error) {
        console.error("Error deleting swipe:", error);
        setError("Erreur lors de la suppression du swipe");
      } else {
        // Si c'était un like ou superlike, recharger le compteur
        if (lastSwipe.action === "like" || lastSwipe.action === "superlike") {
          await loadLikesToday();
        }
        // Si on est sur l'onglet superliked, recharger les superlikes
        if (activeTab === "superliked") {
          await loadSuperlikedJobs();
        }
        // Si on est sur l'onglet liked, recharger les likes
        if (activeTab === "liked") {
          await loadLikedJobs();
        }
      }
    } catch (err) {
      console.error("Error in handleRewind:", err);
      setError("Une erreur inattendue s'est produite lors du retour en arrière");
    }
  };

  // Handler pour le superlike
  const handleSuperLike = () => {
    const currentOffer = jobs[currentIndex];
    if (!currentOffer || swiping) return;
    
    // Empêcher les superlikes si la limite est atteinte
    if (limitReached) {
      return;
    }

    // Ajouter à l'historique AVANT de passer à l'offre suivante
    setSwipeHistory((prev) => [
      ...prev,
      {
        offer: currentOffer,
        action: "superlike",
        jobId: currentOffer.id,
      },
    ]);

    // Avancer immédiatement l'index (optimistic UI)
    setCurrentIndex((prev) => {
      const newIndex = prev + 1;
      
      // Si on arrive à la fin, recharger plus d'offres
      if (newIndex >= jobs.length - 1) {
        // Recharger en arrière-plan sans bloquer
        loadMoreJobs();
      }
      
      return newIndex;
    });

    setSwiping(currentOffer.id);

    // Sauvegarder dans Supabase de manière asynchrone (ne bloque pas l'UI)
    // Utiliser la fonction helper superlikeJob
    void superlikeJob(userId, currentOffer.id)
      .then(async () => {
        // Recharger les superlikes pour que la liste soit à jour
        // (même si on n'est pas sur l'onglet superliked, cela permet d'avoir la liste à jour quand on y va)
        await loadSuperlikedJobs();
        // Recharger le compteur de likes du jour
        await loadLikesToday();
      })
      .catch((err) => {
        console.error("Error in handleSuperLike:", err);
        setError(err instanceof Error ? err.message : "Erreur lors du superlike");
      })
      .finally(() => {
        setSwiping(null);
      });
  };

  // Fonction pour charger les offres superlikées
  const loadSuperlikedJobs = async () => {
    try {
      setLoadingSuperliked(true);
      setError(null);

      // Utiliser la fonction helper getSuperlikedJobs
      const jobs = await getSuperlikedJobs(userId);
      setSuperlikedJobs(jobs);
    } catch (err) {
      console.error("Error loading superliked jobs:", err);
      setError(err instanceof Error ? err.message : "Une erreur inattendue s'est produite");
    } finally {
      setLoadingSuperliked(false);
    }
  };

  const loadMoreJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les job_id déjà swipés (tous les temps)
      const { data: swipesData, error: swipesError } = await (supabase as any)
        .from("swipes")
        .select("job_id")
        .eq("user_id", userId);

      if (swipesError) {
        console.error("Error fetching swipes:", swipesError);
        return;
      }

      const swipedJobIds = swipesData?.map((swipe) => swipe.job_id) || [];

      // Récupérer plus de jobs
      const { data: jobsData, error: jobsError } = await (supabase as any)
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50); // Récupérer plus pour avoir assez après filtrage

      if (jobsError) {
        console.error("Error fetching jobs:", jobsError);
        return;
      }

      // Filtrer les jobs non swipés (tous les temps)
      const unswipedJobs = (jobsData || []).filter(
        (job) => !swipedJobIds.includes(job.id)
      ).slice(0, 20); // Limiter à 20 après filtrage

      setJobs(unswipedJobs);
    } catch (err) {
      console.error("Error loading more jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportOffer = () => {
      // Demander l'offre à l'extension
      window.postMessage({ type: "JOBSWIPE_REQUEST_OFFER" }, "*");
      
      // Écouter la réponse (une seule fois)
      const handler = async (event: MessageEvent) => {
          if (event.source !== window) return;
          if (event.data.type === "JOBSWIPE_OFFER_DATA") {
              window.removeEventListener("message", handler);
              const offerData = event.data.payload;
              
              console.log("📦 [JobSwipe Import] Données reçues de l'extension :", offerData);
              
              if (!offerData) {
                  console.warn("Aucune donnée d'offre reçue de l'extension.");
                  toast({ variant: "destructive", description: "Aucune offre scannée trouvée dans l'extension." });
                  return;
              }
              
              
              try {
                  setLoading(true);
                  toast({ description: "Analyse de l'offre importée..." });
                  
                  // 1. Parser l'offre via le backend
                  const API_URL = import.meta.env.VITE_API_URL;
                  const res = await fetch(`${API_URL}/parse-job`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: offerData.description })
                  });
                  
                  if (!res.ok) {
                      if (res.status === 404) {
                          throw new Error("Le serveur backend ne connaît pas la route /parse-job. Veuillez le redémarrer pour prendre en compte les modifications.");
                      }
                      throw new Error(`Erreur API (${res.status}): ${await res.text()}`);
                  }
                  const parsedJob = await res.json();
                  
                  // 2. Créer le job LOCALEMENT (localStorage) au lieu de Supabase
                  
                  // On prépare la description et on l'ajoute au JSON raw pour être sûr de la conserver
                  const descriptionContent = parsedJob.missions?.join('\n') || offerData.description;
                  const rawData = { 
                    ...parsedJob, 
                    description: descriptionContent,
                    source: "extension_import_local" 
                  };

                  const newJob: any = {
                    id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
                    title: parsedJob.title || offerData.title,
                    company: parsedJob.company_name || offerData.company || "Entreprise inconnue",
                    location: parsedJob.location || "Non spécifié",
                    contract_type: parsedJob.contract_type,
                    description: descriptionContent,
                    raw: rawData,
                    redirect_url: offerData.url,
                    created_at: new Date().toISOString(),
                    secteur: parsedJob.secteur,
                    niveau: parsedJob.seniority_level,
                    famille: parsedJob.famille
                  };
                  
                  // 3. Sauvegarder dans le localStorage
                  const localJobs = JSON.parse(localStorage.getItem("JOBSWIPE_LOCAL_IMPORTED_JOBS") || "[]");
                  localJobs.push(newJob);
                  localStorage.setItem("JOBSWIPE_LOCAL_IMPORTED_JOBS", JSON.stringify(localJobs));
                  
                  toast({ description: "Offre importée localement et ajoutée aux likes !" });
                  
                  // Recharger les likes si on est sur l'onglet liked
                  setActiveTab("liked");
                  loadLikedJobs();
                  
              } catch (e) {
                  console.error("Erreur lors de l'importation :", e);
                  toast({ variant: "destructive", description: "Erreur lors de l'importation de l'offre." });
              } finally {
                  setLoading(false);
              }
          }
      };
      
      window.addEventListener("message", handler);
      // Timeout de sécurité
      setTimeout(() => window.removeEventListener("message", handler), 5000);
  };

  // Handler pour initier la suppression (ouvre la modale)
  const handleRemoveSwipe = (jobId: string) => {
    setConfirmDeleteId(jobId);
  };

  // Handler pour exécuter la suppression après confirmation
  const executeRemoveSwipe = async () => {
    if (!confirmDeleteId) return;
    const jobId = confirmDeleteId;
    setConfirmDeleteId(null);

    // Vérifier si c'est une offre locale
    const localJobs: any[] = JSON.parse(localStorage.getItem("JOBSWIPE_LOCAL_IMPORTED_JOBS") || "[]");
    const localIndex = localJobs.findIndex(j => j.id === jobId);

    if (localIndex !== -1) {
      localJobs.splice(localIndex, 1);
      localStorage.setItem("JOBSWIPE_LOCAL_IMPORTED_JOBS", JSON.stringify(localJobs));
      toast({ description: "Offre locale retirée avec succès." });
      await Promise.all([
        loadLikedJobs(),
        loadSuperlikedJobs()
      ]);
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("swipes")
        .update({ direction: "dislike", is_superlike: false })
        .match({ user_id: userId, job_id: jobId });

      if (error) {
        console.error("Error updating swipe:", error);
        toast({ variant: "destructive", description: "Erreur lors de la suppression." });
      } else {
        toast({ description: "Offre retirée avec succès." });
        
        // Mise à jour de l'état local : on recharge les deux listes pour garantir la cohérence
        await Promise.all([
          loadLikedJobs(),
          loadSuperlikedJobs()
        ]);
        
        // Recharger le compteur de likes du jour
        await loadLikesToday();
      }
    } catch (err) {
      console.error("Error in executeRemoveSwipe:", err);
      toast({ variant: "destructive", description: "Une erreur inattendue s'est produite." });
    }
  };

  const formatSalary = (job: Job) => {
    if (job.salary_min && job.salary_max) {
      return `${job.salary_min}€ - ${job.salary_max}€`;
    } else if (job.salary_min) {
      return `À partir de ${job.salary_min}€`;
    } else if (job.salary_max) {
      return `Jusqu'à ${job.salary_max}€`;
    }
    if (job.raw?.salary) {
      return job.raw.salary;
    }
    return null;
  };

  // Version courte pour la carte swipe (résumé)
  const getJobDescriptionShort = (job: Job): string => {
    // Essayer d'extraire une description du champ raw
    if (job.raw?.description) {
      // Limiter à 200 caractères pour l'affichage dans la carte
      const desc = job.raw.description;
      return desc.length > 200 ? desc.substring(0, 200) + "..." : desc;
    }
    return "Aucune description disponible pour cette offre.";
  };

  // Version complète pour la modale (sans troncature)
  const getJobDescriptionFull = (job: Job): string => {
    // Retourner la description complète sans aucune troncature
    if (job.raw?.description) {
      return job.raw.description;
    }
    return "Aucune description disponible pour cette offre.";
  };

  // Écran de chargement initial
  if (loading && activeTab === "all" && jobs.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <LogoHeader />
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-slate-600">Chargement des offres...</p>
          </div>
        </div>
      </div>
    );
  }

  // Écran de chargement pour les offres likées
  if (loadingLiked && activeTab === "liked") {
    return (
      <div className="min-h-screen bg-slate-50">
        <LogoHeader />
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-slate-600">Chargement de vos offres likées...</p>
          </div>
        </div>
      </div>
    );
  }

  // Écran de chargement pour les offres superlikées
  if (loadingSuperliked && activeTab === "superliked") {
    return (
      <div className="min-h-screen bg-slate-50">
        <LogoHeader />
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-slate-600">Chargement de vos offres superlikées...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative">
      {/* Bordures colorées subtiles sur les côtés */}
      <div className="fixed left-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-violet-200 via-purple-200 to-indigo-200 opacity-50 blur-3xl z-0 pointer-events-none" />
      <div className="fixed right-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-blue-200 via-indigo-200 to-violet-200 opacity-50 blur-3xl z-0 pointer-events-none" />
      
      {/* Navigation - Fixe en haut à droite */}
      <div className="fixed top-4 right-4 z-50 flex gap-3">
        <button
          onClick={() => navigate("/application-dashboard")}
          className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-lg border border-white/50 shadow-lg flex items-center justify-center transition-all duration-200 ease-out hover:bg-white/95 hover:shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
          title="Tableau de bord"
        >
          <LayoutDashboard className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => navigate("/profil")}
          className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-lg border border-white/50 shadow-lg flex items-center justify-center transition-all duration-200 ease-out hover:bg-white/95 hover:shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
          title="Profil"
        >
          <User className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
        </button>
        <button
          onClick={() => navigate("/")}
          className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-lg border border-white/50 shadow-lg flex items-center justify-center transition-all duration-200 ease-out hover:bg-white/95 hover:shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
          title="Accueil"
        >
          <Home className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
        </button>
      </div>

      <div className="relative z-10">
        <LogoHeader />
      </div>
      
      <div className="flex-1 flex flex-col px-2 sm:px-3 py-4 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[900px] mx-auto space-y-4 pb-8">
          {/* Header d'onglets - Style amélioré */}
          <div className="flex gap-2 justify-center pt-2 flex-wrap">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ease-out ${
                activeTab === "all"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105 cursor-default"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:scale-105 cursor-pointer"
              }`}
            >
              Toutes les offres
            </button>
            <button
              onClick={() => setActiveTab("liked")}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ease-out ${
                activeTab === "liked"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105 cursor-default"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:scale-105 cursor-pointer"
              }`}
            >
              Offres likées
            </button>
            <button
              onClick={() => setActiveTab("superliked")}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ease-out ${
                activeTab === "superliked"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105 cursor-default"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:scale-105 cursor-pointer"
              }`}
            >
              Superlikes
            </button>
            <button
              onClick={handleImportOffer}
              className="px-4 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ease-out bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:scale-105 cursor-pointer flex items-center gap-2"
              title="Importer la dernière offre scannée par l'extension"
            >
              <Download className="w-4 h-4" />
              Importer
            </button>
          </div>

          {/* Message d'erreur - Style amélioré */}
          {error && (
            <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-lg border border-red-200 text-red-600 text-sm text-center shadow-xl">
              {error}
            </div>
          )}

          {/* Indicateur de progression - Style amélioré */}
          {activeTab === "all" && !limitReached && (
            <div className="text-center mb-3">
              <div className="inline-flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-700 text-sm font-semibold">
                    {likesToday} / {DAILY_LIKE_LIMIT} swipes aujourd'hui
                  </span>
                </div>
                {/* Barre de progression */}
                <div className="w-full max-w-[200px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(likesToday / DAILY_LIKE_LIMIT) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contenu selon l'onglet actif */}
          {activeTab === "all" ? (
            // Onglet "Toutes les offres" - Style app de dating
            <div className="flex items-start justify-center py-4 min-h-0">
              <div className="w-full max-w-[850px] mx-auto">
                {jobs.length === 0 || currentIndex >= jobs.length ? (
                  <div className="text-center py-12">
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-6">
                      <Briefcase className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
                      
                      {/* Afficher le message approprié selon la situation */}
                      {limitReached ? (
                        <>
                          <h2 className="text-2xl font-semibold mb-2 text-slate-800">Limite quotidienne atteinte</h2>
                          <p className="text-slate-600 mb-6">
                            Tu as utilisé tes {DAILY_LIKE_LIMIT} likes pour aujourd'hui. Reviens demain pour découvrir de nouvelles offres !
                          </p>
                          
                          {/* Horloge de limite atteinte - Style Alan */}
                          <div className="mt-6 mb-6 p-6 rounded-2xl bg-white border border-indigo-100 shadow-sm">
                            <p className="text-slate-800 text-center mb-3 text-base font-semibold">
                              Tu as atteint tes {DAILY_LIKE_LIMIT} likes pour aujourd'hui 😅
                            </p>
                            <p className="text-slate-500 text-center text-sm mb-3">
                              Nouvelles offres disponibles dans :
                            </p>
                            <div className="text-center">
                              <p className="text-indigo-600 text-4xl font-semibold font-mono tracking-wider">
                                {formatTimeRemaining(timeRemaining)}
                              </p>
                            </div>
                            <p className="text-xs text-slate-400 text-center mt-3">
                              {likesToday}/{DAILY_LIKE_LIMIT} likes utilisés aujourd'hui
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <h2 className="text-2xl font-semibold mb-2 text-slate-800">Plus d'offres disponibles</h2>
                          <p className="text-slate-600 mb-6">
                            Vous avez parcouru toutes les offres disponibles pour le moment. De nouvelles offres seront ajoutées prochainement.
                          </p>
                          
                          <button
                            onClick={loadMoreJobs}
                            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer transition-all duration-200 ease-out"
                          >
                            Recharger les offres
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 py-4">
                    {/* Carte swipeable - Style Tinder */}
                    {(() => {
                      const currentOffer = jobs[currentIndex];
                      if (!currentOffer) {
                        return null;
                      }
                      return (
                        <>
                          <JobSwipeScreen
                            offer={currentOffer}
                            onSwipeRight={handleSwipeRight}
                            onSwipeLeft={handleSwipeLeft}
                            onOpenDetails={handleOpenDetails}
                            formatSalary={formatSalary}
                            getJobDescription={getJobDescriptionShort}
                            disabled={swiping === currentOffer.id || (limitReached && false)}
                            score={currentScore}
                          />

                        {/* Horloge de limite atteinte - Style Alan */}
                        {limitReached && (
                          <div className="mt-3 p-6 rounded-2xl bg-white border border-indigo-100 shadow-sm">
                            <p className="text-slate-800 text-center mb-3 text-base font-semibold">
                              Tu as atteint tes {DAILY_LIKE_LIMIT} likes pour aujourd'hui 😅
                            </p>
                            <p className="text-slate-500 text-center text-sm mb-3">
                              Nouvelles offres disponibles dans :
                            </p>
                            <div className="text-center">
                              <p className="text-indigo-600 text-4xl font-semibold font-mono tracking-wider">
                                {formatTimeRemaining(timeRemaining)}
                              </p>
                            </div>
                            <p className="text-xs text-slate-400 text-center mt-3">
                              {likesToday}/{DAILY_LIKE_LIMIT} likes utilisés aujourd'hui
                            </p>
                          </div>
                        )}

                        {/* Boutons de contrôle - Style Tinder premium (desktop uniquement, mobile utilise JobSwipeScreen) */}
                        {(() => {
                          const currentOffer = jobs[currentIndex];
                          if (!currentOffer) return null;
                          return (
                            <div className="hidden md:flex justify-center items-center gap-3 pt-4 pb-2">
                              {/* Bouton Rewind (retour en arrière) */}
                              <button
                                onClick={handleRewind}
                                disabled={swipeHistory.length === 0 || swiping !== null}
                                className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg flex items-center justify-center transition-all duration-200 ease-out hover:scale-110 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 border-2 border-white/30"
                                title={swipeHistory.length === 0 ? "Aucun swipe à annuler" : "Annuler le dernier swipe"}
                              >
                                <RotateCcw className="w-6 h-6 text-white" strokeWidth={2.5} />
                              </button>

                              {/* Bouton Dislike */}
                              <button
                                onClick={handleSwipeLeft}
                                disabled={swiping === currentOffer.id}
                                className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center transition-all duration-200 ease-out hover:shadow-2xl hover:scale-110 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 border-2 border-rose-100 text-rose-500 hover:bg-rose-50"
                                title="Glisser vers la gauche ou cliquer pour passer"
                              >
                                <X className="w-9 h-9" strokeWidth={3} />
                              </button>

                              {/* Bouton Superlike */}
                              <button
                                onClick={handleSuperLike}
                                disabled={swiping === currentOffer.id || limitReached}
                                className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ease-out hover:scale-110 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 ${
                                  limitReached 
                                    ? "bg-gray-200 border-2 border-gray-300" 
                                    : "bg-gradient-to-br from-sky-400 to-blue-500 border-2 border-white/30 hover:shadow-2xl"
                                }`}
                                title={limitReached ? `Limite de ${DAILY_LIKE_LIMIT} likes par jour atteinte` : "Superliker cette offre"}
                              >
                                <Star className={`w-9 h-9 ${limitReached ? "text-gray-500" : "text-white fill-white"}`} strokeWidth={2} />
                              </button>

                              {/* Bouton Like */}
                              <button
                                onClick={handleSwipeRight}
                                disabled={swiping === currentOffer.id || limitReached}
                                className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ease-out hover:scale-110 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 ${
                                  limitReached 
                                    ? "bg-gray-200 border-2 border-gray-300" 
                                    : "bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white/30 hover:shadow-2xl"
                                }`}
                                title={limitReached ? `Limite de ${DAILY_LIKE_LIMIT} likes par jour atteinte` : "Glisser vers la droite ou cliquer pour liker"}
                              >
                                <Heart className={`w-9 h-9 ${limitReached ? "text-gray-500" : "text-white fill-white"}`} strokeWidth={2.5} />
                              </button>
                            </div>
                          );
                        })()}

                        {/* Indicateur de chargement pendant le swipe */}
                        {(() => {
                          const currentOffer = jobs[currentIndex];
                          if (!currentOffer) return null;
                          return (
                            <>
                              {swiping === currentOffer.id && (
                                <div className="text-center pt-2">
                                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                                </div>
                              )}

                              {/* Compteur d'offres restantes */}
                              {currentIndex < jobs.length - 1 && (
                                <p className="text-center text-sm text-slate-400 pt-1">
                                  {jobs.length - currentIndex - 1} offre{jobs.length - currentIndex - 1 > 1 ? "s" : ""} restante{jobs.length - currentIndex - 1 > 1 ? "s" : ""}
                                </p>
                              )}
                            </>
                          );
                        })()}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "liked" ? (
            // Onglet "Offres likées" - Style Alan
            <>
              {likedJobs.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-md px-6">
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-6">
                      <Heart className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
                      <h2 className="text-2xl font-semibold mb-2 text-slate-800">Aucune offre likée</h2>
                      <p className="text-slate-600 mb-6">
                        Tu n'as pas encore liké d'offres. Va dans l'onglet "Toutes les offres" pour commencer à swiper.
                      </p>
                      <button
                        onClick={() => setActiveTab("all")}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-medium shadow-sm hover:bg-indigo-700 transition-all duration-200 ease-out"
                      >
                        Voir toutes les offres
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {likedJobs.map((job) => (
                    <div key={job.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 relative hover:shadow-md hover:scale-[1.01] transition-all duration-200">
                      {userCvData && <JobScore job={job} cvData={userCvData} />}
                      <div className="p-6 space-y-4">
                        {/* Titre */}
                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl p-4 border border-indigo-100">
                          <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                            {job.title}
                          </h2>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-4 h-4" />
                            <span className="text-base">{job.company}</span>
                            <span className="mx-1 text-slate-400">•</span>
                            <MapPin className="w-4 h-4" />
                            <span className="text-base">{job.location}</span>
                          </div>
                        </div>

                        {/* Informations détaillées */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-slate-500">Type de contrat:</span>
                              <span className="text-slate-800">{job.contract_type || "Non spécifié"}</span>
                            </div>
                            {job.secteur && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-slate-500">Secteur:</span>
                                <span className="text-slate-800">{job.secteur}</span>
                              </div>
                            )}
                            {(job.niveau || job.raw?.seniority_level) && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-slate-500">Niveau:</span>
                                <span className="text-slate-800">{job.niveau || job.raw?.seniority_level}</span>
                              </div>
                            )}
                            {job.famille && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-slate-500">Famille:</span>
                                <span className="text-slate-800">{job.famille}</span>
                              </div>
                            )}
                          </div>
                          {formatSalary(job) && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-slate-500">Salaire:</span>
                              <span className="text-emerald-600 font-semibold">{formatSalary(job)}</span>
                            </div>
                          )}
                        </div>

                        {/* Mots clés */}
                        {job.raw?.keywords && Array.isArray(job.raw.keywords) && job.raw.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-2">
                            {job.raw.keywords.slice(0, 5).map((keyword: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs font-normal bg-slate-50 text-slate-600 border-slate-200">{keyword}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Description */}
                        <div className="pt-2 border-t border-slate-100">
                          <h3 className="font-semibold text-slate-800 mb-2">Résumé / Description</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {getJobDescriptionShort(job)}
                          </p>
                        </div>

                        {/* Bouton pour voir la fiche */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => navigate(`/offres/${job.id}`)}
                            className="flex-1 px-6 py-3 rounded-2xl bg-white text-slate-800 border border-slate-200 font-medium shadow-sm hover:bg-slate-50 hover:scale-105 cursor-pointer transition-all duration-200 ease-out flex items-center justify-center gap-2"
                          >
                            🔍 Détails
                          </button>
                          <button
                            onClick={() => window.open(job.redirect_url, "_blank")}
                            className="flex-1 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-medium shadow-sm hover:bg-indigo-700 hover:scale-105 cursor-pointer transition-all duration-200 ease-out flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Voir la fiche
                          </button>
                          <button
                            onClick={() => handleRemoveSwipe(job.id)}
                            className="px-4 py-3 rounded-2xl bg-red-50 text-red-600 border border-red-100 font-medium shadow-sm hover:bg-red-100 hover:scale-105 cursor-pointer transition-all duration-200 ease-out flex items-center justify-center"
                            title="Retirer des favoris"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Onglet "Superlikes" - Style Alan
            <>
              {superlikedJobs.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-md px-6">
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-6">
                      <Star className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
                      <h2 className="text-2xl font-semibold mb-2 text-slate-800">Aucune offre superlikée</h2>
                      <p className="text-slate-600 mb-6">
                        Aucune offre superlikée pour le moment. Utilisez l'étoile pour superliker une offre !
                      </p>
                      <button
                        onClick={() => setActiveTab("all")}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-medium shadow-sm hover:bg-indigo-700 transition-all duration-200 ease-out"
                      >
                        Voir toutes les offres
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {superlikedJobs.map((job) => (
                    <div key={job.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 relative hover:shadow-md hover:scale-[1.01] transition-all duration-200">
                      {userCvData && <JobScore job={job} cvData={userCvData} />}
                      <div className="p-6 space-y-4">
                        {/* Titre avec badge Superlike */}
                        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-4 border border-indigo-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Superlike</span>
                          </div>
                          <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                            {job.title}
                          </h2>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-4 h-4" />
                            <span className="text-base">{job.company}</span>
                            <span className="mx-1 text-slate-400">•</span>
                            <MapPin className="w-4 h-4" />
                            <span className="text-base">{job.location}</span>
                          </div>
                        </div>

                        {/* Informations détaillées */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-slate-500">Type de contrat:</span>
                              <span className="text-slate-800">{job.contract_type || "Non spécifié"}</span>
                            </div>
                            {job.secteur && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-slate-500">Secteur:</span>
                                <span className="text-slate-800">{job.secteur}</span>
                              </div>
                            )}
                            {(job.niveau || job.raw?.seniority_level) && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-slate-500">Niveau:</span>
                                <span className="text-slate-800">{job.niveau || job.raw?.seniority_level}</span>
                              </div>
                            )}
                            {job.famille && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-slate-500">Famille:</span>
                                <span className="text-slate-800">{job.famille}</span>
                              </div>
                            )}
                          </div>
                          {formatSalary(job) && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-slate-500">Salaire:</span>
                              <span className="text-emerald-600 font-semibold">{formatSalary(job)}</span>
                            </div>
                          )}
                        </div>

                        {/* Mots clés */}
                        {job.raw?.keywords && Array.isArray(job.raw.keywords) && job.raw.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-2">
                            {job.raw.keywords.slice(0, 5).map((keyword: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs font-normal bg-slate-50 text-slate-600 border-slate-200">{keyword}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Description */}
                        <div className="pt-2 border-t border-slate-100">
                          <h3 className="font-semibold text-slate-800 mb-2">Résumé / Description</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {getJobDescriptionShort(job)}
                          </p>
                        </div>

                        {/* Bouton pour voir la fiche */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => navigate(`/offres/${job.id}`)}
                            className="flex-1 px-6 py-3 rounded-2xl bg-white text-slate-800 border border-slate-200 font-medium shadow-sm hover:bg-slate-50 hover:scale-105 cursor-pointer transition-all duration-200 ease-out flex items-center justify-center gap-2"
                          >
                            🔍 Détails
                          </button>
                          <button
                            onClick={() => window.open(job.redirect_url, "_blank")}
                            className="flex-1 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-medium shadow-sm hover:bg-indigo-700 hover:scale-105 cursor-pointer transition-all duration-200 ease-out flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Voir la fiche de poste
                          </button>
                          <button
                            onClick={() => handleRemoveSwipe(job.id)}
                            className="px-4 py-3 rounded-2xl bg-red-50 text-red-600 border border-red-100 font-medium shadow-sm hover:bg-red-100 hover:scale-105 cursor-pointer transition-all duration-200 ease-out flex items-center justify-center"
                            title="Retirer des superlikes"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de détail de l'offre */}
      <OfferDetailModal
        offer={selectedOffer}
        isOpen={isDetailOpen}
        onClose={handleCloseDetails}
        formatSalary={formatSalary}
        getJobDescription={getJobDescriptionFull}
      />

      {/* Modal de confirmation de suppression */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 p-6 border border-slate-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Retirer cette offre ?</h3>
              <p className="text-slate-600">
                Êtes-vous sûr de vouloir retirer cette offre de votre liste ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all duration-200"
              >
                Annuler
              </button>
              <button
                onClick={executeRemoveSwipe}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-lg shadow-red-200 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobswipeOffers;
