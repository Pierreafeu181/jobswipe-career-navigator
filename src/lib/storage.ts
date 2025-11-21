import { UserProfile, FavoriteJob } from "@/types/job";

const PROFILE_KEY = "jobswipe_profile";
const FAVORITES_KEY = "jobswipe_favorites";

export const saveProfile = (profile: UserProfile): void => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const loadProfile = (): UserProfile | null => {
  const data = localStorage.getItem(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveFavorites = (favorites: FavoriteJob[]): void => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

export const loadFavorites = (): FavoriteJob[] => {
  const data = localStorage.getItem(FAVORITES_KEY);
  return data ? JSON.parse(data) : [];
};

export const addFavorite = (jobId: string): void => {
  const favorites = loadFavorites();
  if (!favorites.find(f => f.jobId === jobId)) {
    favorites.push({ jobId, addedAt: new Date().toISOString() });
    saveFavorites(favorites);
  }
};

export const removeFavorite = (jobId: string): void => {
  const favorites = loadFavorites();
  saveFavorites(favorites.filter(f => f.jobId !== jobId));
};

export const isFavorite = (jobId: string): boolean => {
  const favorites = loadFavorites();
  return favorites.some(f => f.jobId === jobId);
};
