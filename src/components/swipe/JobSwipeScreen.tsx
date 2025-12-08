import React from "react";
import { Job } from "@/types/job";
import { JobCard } from "./JobCard";
import { X, Heart } from "lucide-react";

interface JobSwipeScreenProps {
  offer: Job;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onOpenDetails?: () => void;
  formatSalary: (job: Job) => string | null;
  getJobDescription: (job: Job) => string;
  disabled?: boolean;
}

/**
 * Composant JobSwipeScreen qui gère la carte swipeable + les boutons mobile
 * - Affiche la carte JobCard
 * - Affiche deux gros boutons en bas sur mobile : "Passer" (dislike) et "Ajouter à mes offres" (like)
 * - Les boutons appellent les mêmes callbacks que le swipe
 */
export const JobSwipeScreen = ({
  offer,
  onSwipeRight,
  onSwipeLeft,
  onOpenDetails,
  formatSalary,
  getJobDescription,
  disabled = false,
}: JobSwipeScreenProps) => {
  return (
    <div className="flex flex-col h-full">
      {/* Carte swipeable */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <JobCard
          offer={offer}
          onSwipeRight={onSwipeRight}
          onSwipeLeft={onSwipeLeft}
          onOpenDetails={onOpenDetails}
          formatSalary={formatSalary}
          getJobDescription={getJobDescription}
          disabled={disabled}
        />
      </div>

      {/* Boutons d'action mobile - visibles uniquement sur mobile */}
      <div className="md:hidden pb-6 px-4">
        <div className="flex gap-4 max-w-[850px] mx-auto">
          {/* Bouton "Passer" (dislike) */}
          <button
            onClick={onSwipeLeft}
            disabled={disabled}
            className="flex-1 bg-white border-2 border-red-300 text-red-600 rounded-2xl py-4 px-6 font-semibold text-lg shadow-lg hover:bg-red-50 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <X className="w-6 h-6" strokeWidth={3} />
            <span>Passer</span>
          </button>

          {/* Bouton "Ajouter à mes offres" (like) */}
          <button
            onClick={onSwipeRight}
            disabled={disabled}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl py-4 px-6 font-semibold text-lg shadow-lg hover:from-emerald-600 hover:to-green-600 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Heart className="w-6 h-6" fill="currentColor" />
            <span>Ajouter à mes offres</span>
          </button>
        </div>
      </div>
    </div>
  );
};


