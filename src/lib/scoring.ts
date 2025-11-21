import { Job, UserProfile } from "@/types/job";

export const calculateCompatibilityScore = (job: Job, profile: UserProfile | null): number => {
  if (!profile) return 50;

  let score = 60; // Base score

  // Check if competences match famille
  const competences = profile.competences.toLowerCase();
  const famille = job.famille.toLowerCase();
  
  if (competences.includes(famille) || famille.includes("data") && competences.includes("data")) {
    score += 20;
  }

  // Check if experiences are relevant
  const experiences = profile.experiences.toLowerCase();
  if (experiences.length > 100) {
    score += 10;
  }

  // Check formations
  const formations = profile.formations.toLowerCase();
  if (formations.includes("ingénieur") || formations.includes("master")) {
    score += 10;
  }

  return Math.min(100, score);
};

export const getScoreAnalysis = (job: Job, profile: UserProfile | null) => {
  if (!profile) {
    return {
      competences: [],
      experiences: "Aucune expérience renseignée",
      analysis: "Veuillez compléter votre profil pour une analyse détaillée.",
    };
  }

  return {
    competences: profile.competences.split(",").map(c => c.trim()).filter(Boolean),
    experiences: profile.experiences,
    analysis: `Votre profil correspond bien à ce poste dans le domaine ${job.famille}. Vos compétences en ${profile.competences.split(",")[0]} sont particulièrement pertinentes pour cette offre.`,
  };
};
