import React from 'react';

interface SolarChronoLogoProps {
  className?: string;
  size?: number;
}

export const SolarChronoLogo: React.FC<SolarChronoLogoProps> = ({ 
  className = "w-full h-full", 
  size 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 256 256" 
      width={size} 
      height={size}
      className={className}
      aria-label="Congregation Scheduler Logo — Solar Chrono"
    >
      <g fill="#F59E0B" transform="translate(26, 0)">
        {/* Outer Monumental C-Arc */}
        <path d="M 178 76 A 90 90 0 1 0 178 180 A 17 17 0 0 0 154 156 A 56 56 0 1 1 154 100 A 17 17 0 0 0 178 76 Z" />
        {/* Center Assembly Hearth */}
        <circle cx="128" cy="128" r="22" fill="#D97706" />
        <circle cx="128" cy="128" r="8" fill="#FFFBEB" />
      </g>
    </svg>
  );
};
