/**
 * Types TypeScript pour le profil utilisateur complet (CV)
 */

export type ExperienceLevel = "junior" | "intermediate" | "senior";

export interface Education {
  school: string;
  degree: string;
  location: string;
  startDate: string;
  endDate: string;
  details?: string;
}

export interface Experience {
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Project {
  name: string;
  role: string;
  description: string;
  skills: string;
}

export interface Language {
  name: string;
  level: string;
}

/**
 * Profil utilisateur complet avec toutes les informations d'un CV
 */
export interface Profile {
  // Informations de base (existant dans Supabase)
  id: string;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  target_role: string | null;
  experience_level: string | null;
  created_at: string;

  // Nouveaux champs (à ajouter à la table Supabase)
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  availability?: string | null;
  
  // Arrays stockés en JSONB dans Supabase
  education?: Education[];
  experiences?: Experience[];
  projects?: Project[];
  languages?: Language[];
  hardSkills?: string[];
  softSkills?: string[];
  interests?: string[];
  activities?: string[];
}

/**
 * Type pour les données de profil à envoyer à Supabase
 * (conversion des arrays en JSON)
 */
export interface ProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  target_role?: string | null;
  experience_level?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  availability?: string | null;
  education?: string; // JSON string
  experiences?: string; // JSON string
  projects?: string; // JSON string
  languages?: string; // JSON string
  hard_skills?: string; // JSON string
  soft_skills?: string; // JSON string
  interests?: string; // JSON string
  activities?: string; // JSON string
}


