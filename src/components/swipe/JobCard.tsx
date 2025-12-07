import React, { useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Job } from "@/types/job";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Heart, X, CheckCircle2, Sparkles } from "lucide-react";

interface JobCardProps {
  offer: Job;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onOpenDetails?: () => void;
  formatSalary: (job: Job) => string | null;
  getJobDescription: (job: Job) => string;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 120; // Distance en pixels pour déclencher un swipe
const VELOCITY_THRESHOLD = 500; // Vélocité en px/s pour déclencher un swipe
const ROTATION_MULTIPLIER = 0.1;

/**
 * Composant JobCard optimisé pour le swipe fluide sur mobile
 * - Utilise framer-motion avec drag horizontal
 * - Optimisé pour éviter les re-renders inutiles
 * - Touch-action et will-change pour la fluidité mobile
 */
export const JobCard = React.memo(({
  offer,
  onSwipeRight,
  onSwipeLeft,
  onOpenDetails,
  formatSalary,
  getJobDescription,
  disabled = false,
}: JobCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-15, 15]);
  const swipeDirectionRef = useRef<"left" | "right" | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  
  // Réinitialiser la position quand l'offre change
  useEffect(() => {
    x.set(0);
    swipeDirectionRef.current = null;
    hasDraggedRef.current = false;
  }, [offer.id, x]);
  
  // Opacité des overlays basée sur la position x
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragStart = () => {
    hasDraggedRef.current = false;
  };

  const handleDrag = (_event: any, info: any) => {
    // Marquer qu'on a dragué si le mouvement est significatif (> 8px)
    if (Math.abs(info.offset.x) > 8) {
      hasDraggedRef.current = true;
    }
  };

  const handleDragEnd = (_event: any, info: any) => {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    // Si on n'a pas vraiment dragué, c'est un tap
    if (!hasDraggedRef.current && Math.abs(offsetX) < 15 && Math.abs(velocityX) < 200) {
      if (onOpenDetails) {
        requestAnimationFrame(() => {
          onOpenDetails();
        });
      }
      hasDraggedRef.current = false;
      return;
    }

    // Déclencher un like si swipe vers la droite (offsetX > 120 ou velocityX > 500)
    if (offsetX > SWIPE_THRESHOLD || velocityX > VELOCITY_THRESHOLD) {
      swipeDirectionRef.current = "right";
      onSwipeRight();
    }
    // Déclencher un dislike si swipe vers la gauche (offsetX < -120 ou velocityX < -500)
    else if (offsetX < -SWIPE_THRESHOLD || velocityX < -VELOCITY_THRESHOLD) {
      swipeDirectionRef.current = "left";
      onSwipeLeft();
    }
    // Sinon, la carte revient au centre avec une animation spring fluide
    else {
      swipeDirectionRef.current = null;
      // L'animation spring est gérée automatiquement par framer-motion
      // grâce à dragConstraints et dragElastic
    }

    hasDraggedRef.current = false;
  };

  const handleTap = () => {
    // onTap ne se déclenche que si on n'a pas dragué
    if (!hasDraggedRef.current && onOpenDetails) {
      onOpenDetails();
    }
  };

  return (
    <div className="relative w-full max-w-[850px] mx-auto" style={{ perspective: "1000px" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={offer.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onTap={handleTap}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            x: swipeDirectionRef.current === "right" ? 1000 : swipeDirectionRef.current === "left" ? -1000 : 0,
            rotate: swipeDirectionRef.current === "right" ? 30 : swipeDirectionRef.current === "left" ? -30 : 0,
            scale: 0.8,
            transition: {
              duration: 0.25,
              ease: "easeOut",
            },
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.5,
          }}
          style={{
            x,
            rotate,
            cursor: disabled ? "not-allowed" : "grab",
            height: "auto",
            maxHeight: "600px",
            minHeight: "520px",
            touchAction: "pan-y", // Permet le scroll vertical mais bloque le scroll horizontal
            willChange: "transform", // Optimisation pour la fluidité mobile
          }}
          whileDrag={{ cursor: "grabbing", scale: 1.02 }}
          className="bg-white rounded-3xl overflow-hidden shadow-2xl relative w-full"
        >
          {/* Like Overlay (droite) */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-green-500/30 rounded-3xl pointer-events-none z-20 flex items-center justify-center border-4 border-emerald-500"
            style={{ opacity: likeOpacity }}
          >
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.3 }}
              >
                <Heart className="w-24 h-24 text-emerald-500 fill-emerald-500 drop-shadow-2xl" strokeWidth={2.5} />
              </motion.div>
              <span className="text-4xl font-black text-emerald-600 drop-shadow-lg tracking-wider">LIKE</span>
            </div>
          </motion.div>

          {/* Nope Overlay (gauche) */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-bl from-red-400/30 to-rose-500/30 rounded-3xl pointer-events-none z-20 flex items-center justify-center border-4 border-red-500"
            style={{ opacity: nopeOpacity }}
          >
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{ rotate: [0, -15, 15, -15, 0] }}
                transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.3 }}
              >
                <X className="w-24 h-24 text-red-500 drop-shadow-2xl" strokeWidth={4} />
              </motion.div>
              <span className="text-4xl font-black text-red-600 drop-shadow-lg tracking-wider">NOPE</span>
            </div>
          </motion.div>

          {/* Zone Hero Image (60% de la hauteur) */}
          <div className="relative h-[60%] min-h-[300px] max-h-[360px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/20 text-[180px] font-black leading-none select-none">
                {offer.company.substring(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent" />
            
            {offer.contract_type && (
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-gray-800">{offer.contract_type}</span>
              </div>
            )}
          </div>

          {/* Zone Infos (40% de la hauteur) */}
          <div className="relative h-[40%] bg-white p-6 flex flex-col justify-between">
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-3xl font-bold text-graphite leading-tight flex-1">
                  {offer.title}
                </h2>
                {formatSalary(offer) && (
                  <div className="bg-mint/10 text-mint-dark px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                    {formatSalary(offer)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-gray-600 mb-4">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{offer.company}</span>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{offer.location}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {offer.secteur && (
                  <Badge className="bg-purple-100 text-purple-700 border-0 px-3 py-1 rounded-full text-xs font-medium">
                    {offer.secteur}
                  </Badge>
                )}
                {offer.niveau && (
                  <Badge className="bg-pink-100 text-pink-700 border-0 px-3 py-1 rounded-full text-xs font-medium">
                    {offer.niveau}
                  </Badge>
                )}
                {offer.famille && (
                  <Badge className="bg-indigo-100 text-indigo-700 border-0 px-3 py-1 rounded-full text-xs font-medium">
                    {offer.famille}
                  </Badge>
                )}
              </div>

              <p className="text-gray-700 leading-relaxed line-clamp-3 text-sm">
                {getJobDescription(offer)}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Sparkles className="w-3 h-3 text-mint" />
                <span>Offre correspondant à votre profil</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

JobCard.displayName = "JobCard";

