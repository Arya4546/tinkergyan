import type { SVGProps } from 'react';

export const BlockCodeIcon = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="20" y="20" width="45" height="40" rx="8" fill="#4FC3F7" />
    <path d="M42 20 V 10 A 10 10 0 0 1 62 10 V 20 Z" fill="#4FC3F7" />

    <rect x="35" y="60" width="45" height="40" rx="8" fill="#FF9B3A" />
    <path d="M57 60 V 50 A 10 10 0 0 1 77 50 V 60 Z" fill="#FF9B3A" />

    <path d="M20 30 H 10 A 10 10 0 0 0 10 50 H 20 Z" fill="#29B6F6" />
    <path d="M35 70 H 25 A 10 10 0 0 0 25 90 H 35 Z" fill="#F57C00" />
  </svg>
);

export const SimulatorIcon = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="10" y="20" width="80" height="60" rx="12" fill="#37474F" />
    <rect x="15" y="25" width="70" height="45" rx="6" fill="#1A237E" />

    {/* Screen contents */}
    <circle cx="50" cy="45" r="15" fill="#FFD54F" />
    <path
      d="M50 45 L 50 25 M 50 45 L 65 55 M 50 45 L 35 55"
      stroke="#FFA000"
      strokeWidth="4"
      strokeLinecap="round"
    />

    {/* Buttons */}
    <circle cx="30" cy="75" r="3" fill="#FF5252" />
    <circle cx="40" cy="75" r="3" fill="#69F0AE" />
    <circle cx="50" cy="75" r="3" fill="#40C4FF" />
  </svg>
);

export const CourseIcon = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Book Pages */}
    <path
      d="M50 80 Q 25 90 10 75 V 20 Q 25 35 50 25 Z"
      fill="#FFFFFF"
      stroke="#ECEFF1"
      strokeWidth="4"
    />
    <path
      d="M50 80 Q 75 90 90 75 V 20 Q 75 35 50 25 Z"
      fill="#FAFAFA"
      stroke="#ECEFF1"
      strokeWidth="4"
    />

    {/* Book Cover */}
    <path
      d="M50 85 Q 25 95 10 80 L 10 85 Q 25 100 50 90 Q 75 100 90 85 L 90 80 Q 75 95 50 85 Z"
      fill="#AB47BC"
    />
    <path
      d="M50 20 Q 25 30 10 15 L 10 20 Q 25 35 50 25 Q 75 35 90 20 L 90 15 Q 75 30 50 20 Z"
      fill="#8E24AA"
    />

    {/* Bookmark */}
    <path d="M30 25 V 50 L 40 40 L 50 50 V 22 Z" fill="#FF5252" />

    {/* Text lines */}
    <line x1="60" y1="40" x2="80" y2="40" stroke="#CFD8DC" strokeWidth="4" strokeLinecap="round" />
    <line x1="60" y1="55" x2="75" y2="55" stroke="#CFD8DC" strokeWidth="4" strokeLinecap="round" />
    <line x1="60" y1="70" x2="85" y2="70" stroke="#CFD8DC" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
