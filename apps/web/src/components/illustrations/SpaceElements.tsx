import type { SVGProps } from 'react';

export const PlanetSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="50" cy="50" r="30" fill="#F43F5E" />
    <circle cx="40" cy="40" r="8" fill="#BE123C" opacity="0.4" />
    <circle cx="60" cy="65" r="5" fill="#BE123C" opacity="0.4" />
    <circle cx="65" cy="35" r="4" fill="#BE123C" opacity="0.4" />
    {/* Ring */}
    <path
      d="M10 50 Q 50 20 90 50 Q 50 80 10 50 Z"
      stroke="#FBBF24"
      strokeWidth="6"
      strokeLinecap="round"
      fill="none"
      transform="rotate(-15 50 50)"
    />
  </svg>
);

export const UFOSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Glass Dome */}
    <path d="M30 50 Q 50 20 70 50" fill="#38BDF8" opacity="0.8" />
    {/* Alien inside */}
    <circle cx="50" cy="45" r="8" fill="#4ADE80" />
    <circle cx="47" cy="43" r="2" fill="#022C22" />
    <circle cx="53" cy="43" r="2" fill="#022C22" />
    {/* Base */}
    <ellipse cx="50" cy="55" rx="35" ry="12" fill="#94A3B8" />
    <ellipse cx="50" cy="53" rx="35" ry="10" fill="#CBD5E1" />
    {/* Lights */}
    <circle cx="25" cy="55" r="3" fill="#FBBF24" />
    <circle cx="50" cy="58" r="3" fill="#FBBF24" />
    <circle cx="75" cy="55" r="3" fill="#FBBF24" />
    {/* Beam */}
    <path d="M35 65 L 20 95 L 80 95 L 65 65 Z" fill="#FBBF24" opacity="0.2" />
  </svg>
);

export const CloudSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M25 60 Q 15 60 15 50 Q 15 40 25 40 Q 30 25 50 25 Q 70 25 75 40 Q 85 40 85 50 Q 85 60 75 60 Z"
      fill="currentColor"
    />
  </svg>
);

export const AsteroidSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M30 20 L 60 15 L 85 40 L 80 70 L 50 85 L 20 75 L 15 45 Z" fill="#94A3B8" />
    <circle cx="40" cy="35" r="5" fill="#64748B" />
    <circle cx="65" cy="55" r="8" fill="#64748B" />
    <circle cx="35" cy="60" r="4" fill="#64748B" />
  </svg>
);
