export interface Job {
  id: string;
  adzuna_id: string;
  title: string;
  company: string;
  location: string;
  contract_type: string;
  salary_min: number | null;
  salary_max: number | null;
  redirect_url: string;
  niveau: string;
  famille: string;
  secteur: string;
  created_at: string;
  raw: {
    description?: string;
    [key: string]: any;
  };
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  formations: string;
  experiences: string;
  competences: string;
  contact: string;
}

export interface FavoriteJob {
  jobId: string;
  addedAt: string;
}
