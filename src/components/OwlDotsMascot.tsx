import React from "react";

interface OwlDotsMascotProps {
  size?: number; // Taille en pixels (par défaut: 40)
  className?: string; // Classes Tailwind supplémentaires
}

/**
 * Mascotte hibou minimaliste style "OwlDots"
 * Design géométrique avec deux yeux verts, un bec, et une tête bleue stylisée
 */
export const OwlDotsMascot: React.FC<OwlDotsMascotProps> = ({ 
  size = 40, 
  className = "" 
}) => {
  // Calcul des dimensions proportionnelles
  const viewBoxSize = 100;
  const scale = size / viewBoxSize;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mascotte hibou JobSwipe"
    >
      {/* Tête du hibou - Forme arrondie mint simplifiée */}
      <ellipse
        cx="50"
        cy="45"
        rx="35"
        ry="30"
        fill="#00C2A8" // Mint Green
      />
      
      {/* Oreille gauche - Triangle arrondi simplifié */}
      <path
        d="M 20 25 L 25 10 L 30 20 Z"
        fill="#00C2A8"
      />
      
      {/* Oreille droite - Triangle arrondi simplifié */}
      <path
        d="M 80 25 L 75 10 L 70 20 Z"
        fill="#00C2A8"
      />

      {/* Œil gauche - Cercle indigo */}
      <circle
        cx="38"
        cy="42"
        r="9"
        fill="#6772E5" // Soft Indigo
      />
      
      {/* Œil droit - Cercle indigo */}
      <circle
        cx="62"
        cy="42"
        r="9"
        fill="#6772E5" // Soft Indigo
      />

      {/* Pupille gauche - Petit cercle graphite */}
      <circle
        cx="38"
        cy="42"
        r="4"
        fill="#1E1E1E" // Graphite pour la pupille
      />
      
      {/* Pupille droite - Petit cercle graphite */}
      <circle
        cx="62"
        cy="42"
        r="4"
        fill="#1E1E1E" // Graphite pour la pupille
      />

      {/* Bec - Petit cercle mint dark */}
      <circle
        cx="50"
        cy="55"
        r="5"
        fill="#009F8A" // Dark Mint
      />
    </svg>
  );
};

