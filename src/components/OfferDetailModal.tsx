import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Job } from "@/types/job";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X, Building2, MapPin, ExternalLink, Briefcase, CheckSquare, GraduationCap } from "lucide-react";

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
  const { toast } = useToast();

  // Fermer avec la touche ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Empêcher le scroll du body quand le modal est ouvert
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && offer) {
      console.log("OfferDetailModal ouvert avec l'offre:", offer.id, offer.title);
    }
  }, [isOpen, offer]);

  const handleStatusUpdate = (status: 'applied' | 'response_received' | 'interview') => {
    if (!offer) return;
    
    let statusLabel = '';
    switch(status) {
        case 'applied': statusLabel = "Postulée"; break;
        case 'response_received': statusLabel = "Réponse Reçue"; break;
        case 'interview': statusLabel = "Entretien"; break;
    }

    toast({
        title: "Statut de la candidature mis à jour",
        description: `L'offre "${offer.title}" a été marquée comme "${statusLabel}".`,
    });
    // In a real app, you would call a function passed via props here
    // to update the application state globally.
    // e.g., onStatusUpdate(offer.id, status);
  };

  if (!offer) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay avec backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-gray-light w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4"
            >
              {/* Header avec bouton fermer */}
              <div className="relative p-6 border-b border-gray-light bg-gradient-mint/10">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white border border-gray-light flex items-center justify-center hover:bg-gray-light transition-colors duration-200 shadow-sm"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 text-gray-dark" />
                </button>

                {/* Titre principal (intitulé de mission) */}
                <div className="pr-12">
                  <h2 className="text-3xl font-semibold text-graphite mb-3 leading-tight">
                    {offer.title}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-dark text-lg">
                    <Building2 className="w-5 h-5" />
                    <span className="font-medium">{offer.company}</span>
                    <span className="mx-1 text-gray-medium">•</span>
                    <MapPin className="w-5 h-5" />
                    <span>{offer.location}</span>
                  </div>
                </div>
              </div>

              {/* Contenu scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {offer.contract_type && (
                    <Badge className="bg-mint-light text-mint-dark border border-mint px-3 py-1.5 rounded-xl text-sm font-medium">
                      {offer.contract_type}
                    </Badge>
                  )}
                  {offer.secteur && (
                    <Badge className="bg-indigo/10 text-indigo border border-indigo/20 px-3 py-1.5 rounded-xl text-sm font-medium">
                      {offer.secteur}
                    </Badge>
                  )}
                  {offer.famille && (
                    <Badge className="bg-gray-light text-gray-dark border border-gray-medium px-3 py-1.5 rounded-xl text-sm font-medium">
                      {offer.famille}
                    </Badge>
                  )}
                </div>

                {/* Salaire et Niveau de formation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formatSalary(offer) && (
                      <div className="p-4 rounded-2xl bg-mint-light border border-mint/30">
                        <p className="text-sm font-medium text-gray-medium mb-1">Salaire</p>
                        <p className="text-2xl font-semibold text-mint-dark">
                          {formatSalary(offer)}
                        </p>
                      </div>
                    )}
                    {(offer.niveau || offer.raw?.seniority_level) && (
                      <div className="p-4 rounded-2xl bg-indigo/5 border border-indigo/20 flex flex-col justify-center">
                        <p className="text-sm font-medium text-gray-medium mb-1">Niveau d'études</p>
                        <p className="text-xl font-semibold text-indigo">
                          {offer.niveau || offer.raw?.seniority_level}
                        </p>
                      </div>
                    )}
                </div>
                
                {/* Suivi de candidature */}
                <div className="space-y-3 pt-4 border-t border-gray-light">
                  <h3 className="text-xl font-semibold text-graphite flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-mint" />
                    Suivi de candidature
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button variant="outline" onClick={() => handleStatusUpdate('applied')}>J'ai postulé</Button>
                    <Button variant="outline" onClick={() => handleStatusUpdate('response_received')}>J'ai eu une réponse</Button>
                    <Button variant="outline" onClick={() => handleStatusUpdate('interview')}>J'ai un entretien</Button>
                  </div>
                </div>

                {/* Missions et responsabilités */}
                <div className="space-y-3 pt-4 border-t border-gray-light">
                  <h3 className="text-xl font-semibold text-graphite flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-mint" />
                    Missions et responsabilités
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    {offer.raw?.missions && Array.isArray(offer.raw.missions) && offer.raw.missions.length > 0 ? (
                      <ul className="list-disc pl-5 text-gray-dark leading-relaxed">
                        {offer.raw.missions.map((mission: string, index: number) => (
                          <li key={index}>{mission}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-dark leading-relaxed whitespace-pre-wrap">
                        {getJobDescription(offer)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Informations complémentaires */}
                <div className="space-y-3 pt-4 border-t border-gray-light">
                  <h3 className="text-lg font-semibold text-graphite">Informations complémentaires</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {offer.location && (
                      <div className="flex items-center gap-2 text-gray-dark">
                        <MapPin className="w-4 h-4 text-mint" />
                        <span><strong>Localisation:</strong> {offer.location}</span>
                      </div>
                    )}
                    {offer.contract_type && (
                      <div className="flex items-center gap-2 text-gray-dark">
                        <Briefcase className="w-4 h-4 text-mint" />
                        <span><strong>Type de contrat:</strong> {offer.contract_type}</span>
                      </div>
                    )}
                    {(offer.niveau || offer.raw?.seniority_level) && (
                      <div className="flex items-center gap-2 text-gray-dark">
                         <GraduationCap className="w-4 h-4 text-mint" />
                        <span><strong>Niveau:</strong> {offer.niveau || offer.raw?.seniority_level}</span>
                      </div>
                    )}
                    {offer.famille && (
                      <div className="flex items-center gap-2 text-gray-dark">
                        <span className="text-mint">💼</span>
                        <span><strong>Famille:</strong> {offer.famille}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer avec bouton d'action */}
              <div className="p-6 border-t border-gray-light bg-gray-light/30">
                {offer.redirect_url && (
                  <a
                    href={offer.redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-6 py-3 rounded-2xl bg-indigo text-white font-medium shadow-sm hover:bg-indigo/90 transition-all duration-200 ease-out flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Voir l'annonce complète
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
