import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { Job } from "@/types/job";
import { superlikeJob, getSuperlikedJobs } from "@/lib/swipes";
import { Loader2, Heart, X, MapPin, Building2, Briefcase, ExternalLink, RotateCcw, Star, Home } from "lucide-react";
import { JobSwipeScreen } from "@/components/swipe/JobSwipeScreen";
import { OfferDetailModal } from "@/components/OfferDetailModal";

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

// Composant pour la page de swipe des offres (JobswipeOffers)
const JobswipeOffers = ({ userId }: OffresProps) => {
  const navigate = useNavigate();
  
  // State pour l'onglet actif
  const [activeTab, setActiveTab] = useState<"all" | "liked" | "superliked">("all");

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

  // State pour l'historique des swipes (pour le rewind)
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([]);

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
      const { count: likesCount, error: likesError } = await supabase
        .from("swipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("direction", "like")
        .eq("is_superlike", false)
        .gte("created_at", startOfDayUTC.toISOString())
        .lte("created_at", endOfDayUTC.toISOString());

      const { count: superlikesCount, error: superlikesError } = await supabase
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
      
      console.log(`[Daily Limit] swipes_today: ${swipesToday}, limitReached: ${isLimitReached}, limit: ${DAILY_LIKE_LIMIT}`);
      
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
      const { data: swipesData, error: swipesError } = await supabase
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
      let query = supabase
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

      console.log(`[Load Jobs] Total jobs fetched: ${jobsData?.length || 0}, Already swiped: ${swipedJobIds.length}, Available: ${unswipedJobs.length}`);
      
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
      const { data: swipesData, error: swipesError } = await supabase
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
      const { data: jobsData, error: jobsError } = await supabase
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

      setLikedJobs(sortedJobs);
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
      console.log(`[Save Swipe] Saving ${direction}${isSuperlike ? " (superlike)" : ""} for job ${jobId}`);
      const { data, error: swipeError } = await supabase.from("swipes").upsert(
        {
          user_id: userId,
          job_id: jobId,
          direction: direction,
          is_superlike: isSuperlike,
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

      console.log(`[Save Swipe] Successfully saved ${direction}${isSuperlike ? " (superlike)" : ""} for job ${jobId}`, data);

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

    console.log("Swipe right:", { currentIndex, offersLength: jobs.length, offerId: currentOffer.id });

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
      console.log("Index updated:", { prev, newIndex, hasMoreOffers: newIndex < jobs.length });
      
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

    console.log("Swipe left:", { currentIndex, offersLength: jobs.length, offerId: currentOffer.id });

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
      console.log("Index updated:", { prev, newIndex, hasMoreOffers: newIndex < jobs.length });
      
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
  const handleOpenDetails = () => {
    const currentOffer = jobs[currentIndex];
    console.log("handleOpenDetails appelé", { currentOffer, currentIndex, jobsLength: jobs.length });
    if (currentOffer) {
      setSelectedOffer(currentOffer);
      setIsDetailOpen(true);
      console.log("Modal ouvert avec l'offre:", currentOffer.id);
    } else {
      console.warn("Aucune offre disponible pour ouvrir les détails");
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
      const { error } = await supabase
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

    console.log("Superlike:", { currentIndex, offersLength: jobs.length, offerId: currentOffer.id });

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
      console.log("Index updated:", { prev, newIndex, hasMoreOffers: newIndex < jobs.length });
      
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

      console.log("[Load Superlikes] Loading superliked jobs for user:", userId);

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
      const { data: swipesData, error: swipesError } = await supabase
        .from("swipes")
        .select("job_id")
        .eq("user_id", userId);

      if (swipesError) {
        console.error("Error fetching swipes:", swipesError);
        return;
      }

      const swipedJobIds = swipesData?.map((swipe) => swipe.job_id) || [];

      // Récupérer plus de jobs
      const { data: jobsData, error: jobsError } = await supabase
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

      console.log(`[Load More] Total jobs fetched: ${jobsData?.length || 0}, Already swiped: ${swipedJobIds.length}, Available: ${unswipedJobs.length}`);
      
      setJobs(unswipedJobs);
    } catch (err) {
      console.error("Error loading more jobs:", err);
    } finally {
      setLoading(false);
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
      <div className="min-h-screen flex flex-col bg-ultra-light">
        <LogoHeader />
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-mint" />
            <p className="text-gray-dark">Chargement des offres...</p>
          </div>
        </div>
      </div>
    );
  }

  // Écran de chargement pour les offres likées
  if (loadingLiked && activeTab === "liked") {
    return (
      <div className="min-h-screen bg-ultra-light">
        <LogoHeader />
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-mint" />
            <p className="text-gray-dark">Chargement de vos offres likées...</p>
          </div>
        </div>
      </div>
    );
  }

  // Écran de chargement pour les offres superlikées
  if (loadingSuperliked && activeTab === "superliked") {
    return (
      <div className="min-h-screen bg-ultra-light">
        <LogoHeader />
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-mint" />
            <p className="text-gray-dark">Chargement de vos offres superlikées...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ultra-light relative">
      {/* Bordures colorées subtiles sur les côtés */}
      <div className="fixed left-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-rose-400 via-pink-500 via-purple-500 to-indigo-600 z-0 pointer-events-none" />
      <div className="fixed right-0 top-0 bottom-0 w-[5cm] bg-gradient-to-b from-rose-400 via-pink-500 via-purple-500 to-indigo-600 z-0 pointer-events-none" />
      
      {/* Bouton Accueil - Fixe en haut à gauche */}
      <motion.button
        onClick={() => navigate("/")}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-4 left-4 z-50 w-12 h-12 rounded-full bg-white/80 backdrop-blur-lg border border-white/50 shadow-lg flex items-center justify-center transition-all duration-200 ease-out hover:bg-white/95 hover:shadow-xl cursor-pointer"
        title="Retour à l'accueil"
        aria-label="Retour à l'accueil"
      >
        <Home className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
      </motion.button>
      
      <div className="flex-1 flex flex-col px-2 sm:px-3 py-4 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[900px] mx-auto space-y-4 pb-8">
          {/* Header d'onglets - Style amélioré */}
          <div className="flex gap-2 justify-center pt-2 flex-wrap">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ease-out ${
                activeTab === "all"
                  ? "bg-white text-indigo-600 shadow-lg scale-105 border-2 border-indigo-200"
                  : "bg-white/80 text-gray-600 hover:bg-white border border-gray-200"
              }`}
            >
              Toutes les offres
            </button>
            <button
              onClick={() => setActiveTab("liked")}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ease-out ${
                activeTab === "liked"
                  ? "bg-white text-indigo-600 shadow-lg scale-105 border-2 border-indigo-200"
                  : "bg-white/80 text-gray-600 hover:bg-white border border-gray-200"
              }`}
            >
              Offres likées
            </button>
            <button
              onClick={() => setActiveTab("superliked")}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ease-out ${
                activeTab === "superliked"
                  ? "bg-white text-indigo-600 shadow-lg scale-105 border-2 border-indigo-200"
                  : "bg-white/80 text-gray-600 hover:bg-white border border-gray-200"
              }`}
            >
              Superlikes
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
                  <div className="w-2 h-2 rounded-full bg-mint animate-pulse" />
                  <span className="text-gray-700 text-sm font-semibold">
                    {likesToday} / {DAILY_LIKE_LIMIT} swipes aujourd'hui
                  </span>
                </div>
                {/* Barre de progression */}
                <div className="w-full max-w-[200px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-mint to-indigo rounded-full transition-all duration-300 ease-out"
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
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-light mb-6">
                      <Briefcase className="w-16 h-16 mx-auto mb-4 text-mint" />
                      
                      {/* Afficher le message approprié selon la situation */}
                      {limitReached ? (
                        <>
                          <h2 className="text-2xl font-semibold mb-2 text-graphite">Limite quotidienne atteinte</h2>
                          <p className="text-gray-dark mb-6">
                            Tu as utilisé tes {DAILY_LIKE_LIMIT} likes pour aujourd'hui. Reviens demain pour découvrir de nouvelles offres !
                          </p>
                          
                          {/* Horloge de limite atteinte - Style Alan */}
                          <div className="mt-6 mb-6 p-6 rounded-2xl bg-white border border-indigo/20 shadow-sm">
                            <p className="text-graphite text-center mb-3 text-base font-semibold">
                              Tu as atteint tes {DAILY_LIKE_LIMIT} likes pour aujourd'hui 😅
                            </p>
                            <p className="text-gray-medium text-center text-sm mb-3">
                              Nouvelles offres disponibles dans :
                            </p>
                            <div className="text-center">
                              <p className="text-indigo text-4xl font-semibold font-mono tracking-wider">
                                {formatTimeRemaining(timeRemaining)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-medium text-center mt-3">
                              {likesToday}/{DAILY_LIKE_LIMIT} likes utilisés aujourd'hui
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <h2 className="text-2xl font-semibold mb-2 text-graphite">Plus d'offres disponibles</h2>
                          <p className="text-gray-dark mb-6">
                            Vous avez parcouru toutes les offres disponibles pour le moment. De nouvelles offres seront ajoutées prochainement.
                          </p>
                          
                          <button
                            onClick={loadMoreJobs}
                            className="px-6 py-3 rounded-2xl bg-mint text-white font-medium shadow-sm hover:bg-mint-dark transition-all duration-200 ease-out"
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
                        console.log("No current offer:", { currentIndex, jobsLength: jobs.length });
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
                          />

                        {/* Horloge de limite atteinte - Style Alan */}
                        {limitReached && (
                          <div className="mt-3 p-6 rounded-2xl bg-white border border-indigo/20 shadow-sm">
                            <p className="text-graphite text-center mb-3 text-base font-semibold">
                              Tu as atteint tes {DAILY_LIKE_LIMIT} likes pour aujourd'hui 😅
                            </p>
                            <p className="text-gray-medium text-center text-sm mb-3">
                              Nouvelles offres disponibles dans :
                            </p>
                            <div className="text-center">
                              <p className="text-indigo text-4xl font-semibold font-mono tracking-wider">
                                {formatTimeRemaining(timeRemaining)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-medium text-center mt-3">
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
                              <motion.button
                                onClick={handleRewind}
                                disabled={swipeHistory.length === 0 || swiping !== null}
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.1 }}
                                className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 shadow-lg flex items-center justify-center transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-white/30"
                                title={swipeHistory.length === 0 ? "Aucun swipe à annuler" : "Annuler le dernier swipe"}
                              >
                                <RotateCcw className="w-6 h-6 text-white" strokeWidth={2.5} />
                              </motion.button>

                              {/* Bouton Dislike */}
                              <motion.button
                                onClick={handleSwipeLeft}
                                disabled={swiping === currentOffer.id}
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.1 }}
                                className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center transition-all duration-200 ease-out hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-2 border-red-100"
                                title="Glisser vers la gauche ou cliquer pour passer"
                              >
                                <X className="w-9 h-9 text-red-500" strokeWidth={3} />
                              </motion.button>

                              {/* Bouton Superlike */}
                              <motion.button
                                onClick={handleSuperLike}
                                disabled={swiping === currentOffer.id || limitReached}
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.1 }}
                                className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                  limitReached 
                                    ? "bg-gray-200 border-2 border-gray-300" 
                                    : "bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white/30 hover:shadow-2xl"
                                }`}
                                title={limitReached ? `Limite de ${DAILY_LIKE_LIMIT} likes par jour atteinte` : "Superliker cette offre"}
                              >
                                <Star className={`w-9 h-9 ${limitReached ? "text-gray-500" : "text-white fill-white"}`} strokeWidth={2} />
                              </motion.button>

                              {/* Bouton Like */}
                              <motion.button
                                onClick={handleSwipeRight}
                                disabled={swiping === currentOffer.id || limitReached}
                                whileTap={{ scale: 0.9 }}
                                whileHover={{ scale: 1.1 }}
                                className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                  limitReached 
                                    ? "bg-gray-200 border-2 border-gray-300" 
                                    : "bg-gradient-to-br from-emerald-400 to-green-500 border-2 border-white/30 hover:shadow-2xl"
                                }`}
                                title={limitReached ? `Limite de ${DAILY_LIKE_LIMIT} likes par jour atteinte` : "Glisser vers la droite ou cliquer pour liker"}
                              >
                                <Heart className={`w-9 h-9 ${limitReached ? "text-gray-500" : "text-white fill-white"}`} strokeWidth={2.5} />
                              </motion.button>
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
                                  <Loader2 className="w-6 h-6 animate-spin text-mint mx-auto" />
                                </div>
                              )}

                              {/* Compteur d'offres restantes */}
                              {currentIndex < jobs.length - 1 && (
                                <p className="text-center text-sm text-gray-medium pt-1">
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
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-light mb-6">
                      <Heart className="w-16 h-16 mx-auto mb-4 text-mint" />
                      <h2 className="text-2xl font-semibold mb-2 text-graphite">Aucune offre likée</h2>
                      <p className="text-gray-dark mb-6">
                        Tu n'as pas encore liké d'offres. Va dans l'onglet "Toutes les offres" pour commencer à swiper.
                      </p>
                      <button
                        onClick={() => setActiveTab("all")}
                        className="px-6 py-3 rounded-2xl bg-mint text-white font-medium shadow-sm hover:bg-mint-dark transition-all duration-200 ease-out"
                      >
                        Voir toutes les offres
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {likedJobs.map((job) => (
                    <div key={job.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-light">
                      <div className="p-6 space-y-4">
                        {/* Titre */}
                        <div className="bg-mint-light rounded-2xl p-4 border border-mint/30">
                          <h2 className="text-2xl font-semibold text-graphite mb-2">
                            {job.title}
                          </h2>
                          <div className="flex items-center gap-2 text-gray-dark">
                            <Building2 className="w-4 h-4" />
                            <span className="text-base">{job.company}</span>
                            <span className="mx-1 text-gray-medium">•</span>
                            <MapPin className="w-4 h-4" />
                            <span className="text-base">{job.location}</span>
                          </div>
                        </div>

                        {/* Informations détaillées */}
                        <div className="space-y-2 pt-2 border-t border-gray-light">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-medium">Type de contrat:</span>
                              <span className="text-graphite">{job.contract_type || "Non spécifié"}</span>
                            </div>
                            {job.secteur && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-medium">Secteur:</span>
                                <span className="text-graphite">{job.secteur}</span>
                              </div>
                            )}
                            {job.niveau && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-medium">Niveau:</span>
                                <span className="text-graphite">{job.niveau}</span>
                              </div>
                            )}
                            {job.famille && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-medium">Famille:</span>
                                <span className="text-graphite">{job.famille}</span>
                              </div>
                            )}
                          </div>
                          {formatSalary(job) && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-medium">Salaire:</span>
                              <span className="text-mint-dark font-semibold">{formatSalary(job)}</span>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <div className="pt-2 border-t border-gray-light">
                          <h3 className="font-semibold text-graphite mb-2">Résumé / Description</h3>
                          <p className="text-sm text-gray-dark leading-relaxed">
                            {getJobDescriptionShort(job)}
                          </p>
                        </div>

                        {/* Bouton pour voir la fiche */}
                        <div className="pt-2">
                          <button
                            onClick={() => window.open(job.redirect_url, "_blank")}
                            className="w-full px-6 py-3 rounded-2xl bg-indigo text-white font-medium shadow-sm hover:bg-indigo/90 transition-all duration-200 ease-out flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Voir la fiche de poste
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
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-light mb-6">
                      <Star className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
                      <h2 className="text-2xl font-semibold mb-2 text-graphite">Aucune offre superlikée</h2>
                      <p className="text-gray-dark mb-6">
                        Aucune offre superlikée pour le moment. Utilisez l'étoile pour superliker une offre !
                      </p>
                      <button
                        onClick={() => setActiveTab("all")}
                        className="px-6 py-3 rounded-2xl bg-mint text-white font-medium shadow-sm hover:bg-mint-dark transition-all duration-200 ease-out"
                      >
                        Voir toutes les offres
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {superlikedJobs.map((job) => (
                    <div key={job.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-light">
                      <div className="p-6 space-y-4">
                        {/* Titre avec badge Superlike */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-indigo/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Superlike</span>
                          </div>
                          <h2 className="text-2xl font-semibold text-graphite mb-2">
                            {job.title}
                          </h2>
                          <div className="flex items-center gap-2 text-gray-dark">
                            <Building2 className="w-4 h-4" />
                            <span className="text-base">{job.company}</span>
                            <span className="mx-1 text-gray-medium">•</span>
                            <MapPin className="w-4 h-4" />
                            <span className="text-base">{job.location}</span>
                          </div>
                        </div>

                        {/* Informations détaillées */}
                        <div className="space-y-2 pt-2 border-t border-gray-light">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-medium">Type de contrat:</span>
                              <span className="text-graphite">{job.contract_type || "Non spécifié"}</span>
                            </div>
                            {job.secteur && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-medium">Secteur:</span>
                                <span className="text-graphite">{job.secteur}</span>
                              </div>
                            )}
                            {job.niveau && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-medium">Niveau:</span>
                                <span className="text-graphite">{job.niveau}</span>
                              </div>
                            )}
                            {job.famille && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-medium">Famille:</span>
                                <span className="text-graphite">{job.famille}</span>
                              </div>
                            )}
                          </div>
                          {formatSalary(job) && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-medium">Salaire:</span>
                              <span className="text-mint-dark font-semibold">{formatSalary(job)}</span>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <div className="pt-2 border-t border-gray-light">
                          <h3 className="font-semibold text-graphite mb-2">Résumé / Description</h3>
                          <p className="text-sm text-gray-dark leading-relaxed">
                            {getJobDescriptionShort(job)}
                          </p>
                        </div>

                        {/* Bouton pour voir la fiche */}
                        <div className="pt-2">
                          <button
                            onClick={() => window.open(job.redirect_url, "_blank")}
                            className="w-full px-6 py-3 rounded-2xl bg-indigo text-white font-medium shadow-sm hover:bg-indigo/90 transition-all duration-200 ease-out flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Voir la fiche de poste
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
    </div>
  );
};

export default JobswipeOffers;
