import type { SVGProps } from 'react';

export const CartoonRocket = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={`${className}`}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Defs for gradients */}
      <defs>
        <linearGradient
          id="rocketBody"
          x1="30"
          y1="90"
          x2="90"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F1F5F9" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient
          id="rocketFin"
          x1="20"
          y1="80"
          x2="80"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F43F5E" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
        <linearGradient
          id="rocketFlame"
          x1="20"
          y1="100"
          x2="40"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Flame / Exhaust */}
      <path
        d="M25 95 C 10 115, 5 115, 5 115 C 5 115, 5 110, 25 95 Z"
        fill="url(#rocketFlame)"
        filter="url(#glow)"
      />
      <path d="M20 90 L 15 105 L 30 100 Z" fill="#FEF08A" />

      {/* Left Fin */}
      <path d="M25 65 L 10 80 Q 15 90 25 85 L 35 75 Z" fill="url(#rocketFin)" />

      {/* Right Fin */}
      <path d="M45 45 L 60 30 Q 70 35 65 45 L 55 55 Z" fill="url(#rocketFin)" />

      {/* Main Body (Angled 45 deg) */}
      <path
        d="M25 85 C 20 60, 40 30, 95 25 C 90 80, 60 100, 35 95 C 30 90, 25 85, 25 85 Z"
        fill="url(#rocketBody)"
        stroke="#94A3B8"
        strokeWidth="2"
      />

      {/* Nose Cone */}
      <path
        d="M65 35 C 75 30, 90 25, 95 25 C 95 25, 90 40, 85 50 C 75 45, 65 35, 65 35 Z"
        fill="#F43F5E"
      />

      {/* Window */}
      <circle cx="55" cy="60" r="14" fill="#94A3B8" />
      <circle cx="55" cy="60" r="11" fill="#38BDF8" />
      <circle cx="58" cy="57" r="4" fill="#BAE6FD" />

      {/* Center Fin */}
      <path d="M30 80 L 40 90 L 35 95 L 25 85 Z" fill="#BE123C" />

      {/* Decorative Stars */}
      <circle cx="85" cy="85" r="2.5" fill="#FBBF24" />
      <circle cx="95" cy="75" r="1.5" fill="#FBBF24" />
      <circle cx="20" cy="20" r="2.5" fill="#38BDF8" />
    </svg>
  );
};
