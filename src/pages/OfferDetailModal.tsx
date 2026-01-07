import React from "react";
import { X, FileText, PenTool, Building2, MapPin, ExternalLink } from "lucide-react";
import { Job } from "@/types/job";

interface OfferDetailModalProps {
  offer: Job | null;
  isOpen: boolean;
  onClose: () => void;
  formatSalary: (job: Job) => string | null;
  getJobDescription: (job: Job) => string;
}

export const OfferDetailModal = ({
  offer,
  isOpen,
  onClose,
  formatSalary,
  getJobDescription,
}: OfferDetailModalProps) => {
  if (!isOpen || !offer) return null;

  const handleGenerateCV = () => {
    console.log("Génération du CV pour l'offre :", offer.id);
    alert("Génération du CV lancée !");
    // TODO: Appeler votre backend ici
  };

  const handleGenerateCoverLetter = () => {
    console.log("Génération de la Lettre de Motivation pour l'offre :", offer.id);
    alert("Génération de la Lettre de Motivation lancée !");
    // TODO: Appeler votre backend ici
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/80 px-6 py-4 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-gray-900">Détails de l'offre</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* En-tête de l'offre */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{offer.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-gray-600">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>{offer.company}</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{offer.location}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {offer.contract_type && (
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                {offer.contract_type}
              </span>
            )}
            {formatSalary(offer) && (
              <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium">
                {formatSalary(offer)}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="prose prose-sm max-w-none text-gray-600">
            <h3 className="text-gray-900 font-semibold mb-2">Description du poste</h3>
            <div className="whitespace-pre-wrap">{getJobDescription(offer)}</div>
          </div>

          {/* Actions de génération */}
          <div className="flex flex-col gap-3 pt-6 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900">Outils de candidature</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleGenerateCV}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
              >
                <FileText className="w-5 h-5" />
                Générer CV adapté
              </button>
              <button
                onClick={handleGenerateCoverLetter}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md"
              >
                <PenTool className="w-5 h-5" />
                Générer Lettre de Motiv.
              </button>
            </div>
          </div>

          {/* Lien externe */}
          <div className="pt-2">
            <button
              onClick={() => window.open(offer.redirect_url, "_blank")}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Voir l'offre originale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};