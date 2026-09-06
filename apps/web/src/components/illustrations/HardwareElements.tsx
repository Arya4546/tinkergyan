import type React from 'react';
import type { SVGProps } from 'react';

/**
 * Educational Quadcopter Drone with spinning propellers and flight LEDs
 */
export const DroneSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 140 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient
        id="droneBody"
        x1="40"
        y1="40"
        x2="100"
        y2="100"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#38BDF8" />
        <stop offset="1" stopColor="#0284C7" />
      </linearGradient>
      <linearGradient id="droneCore" x1="55" y1="55" x2="85" y2="85" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E293B" />
        <stop offset="1" stopColor="#0F172A" />
      </linearGradient>
      <linearGradient id="droneArm" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#64748B" />
        <stop offset="1" stopColor="#334155" />
      </linearGradient>
    </defs>

    {/* Drone Arms (X-Frame) */}
    <line
      x1="25"
      y1="25"
      x2="115"
      y2="115"
      stroke="url(#droneArm)"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <line
      x1="115"
      y1="25"
      x2="25"
      y2="115"
      stroke="url(#droneArm)"
      strokeWidth="8"
      strokeLinecap="round"
    />

    {/* Motor Pods */}
    <circle cx="25" cy="25" r="12" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.5" />
    <circle cx="115" cy="25" r="12" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.5" />
    <circle cx="25" cy="115" r="12" fill="#0F172A" stroke="#F43F5E" strokeWidth="2.5" />
    <circle cx="115" cy="115" r="12" fill="#0F172A" stroke="#F43F5E" strokeWidth="2.5" />

    {/* Spinning Propeller Blurs */}
    <ellipse
      cx="25"
      cy="25"
      rx="22"
      ry="7"
      fill="#38BDF8"
      fillOpacity="0.4"
      transform="rotate(35 25 25)"
    />
    <ellipse
      cx="25"
      cy="25"
      rx="7"
      ry="22"
      fill="#BAE6FD"
      fillOpacity="0.6"
      transform="rotate(35 25 25)"
    />

    <ellipse
      cx="115"
      cy="25"
      rx="22"
      ry="7"
      fill="#38BDF8"
      fillOpacity="0.4"
      transform="rotate(-35 115 25)"
    />
    <ellipse
      cx="115"
      cy="25"
      rx="7"
      ry="22"
      fill="#BAE6FD"
      fillOpacity="0.6"
      transform="rotate(-35 115 25)"
    />

    <ellipse
      cx="25"
      cy="115"
      rx="22"
      ry="7"
      fill="#F43F5E"
      fillOpacity="0.4"
      transform="rotate(-35 25 115)"
    />
    <ellipse
      cx="25"
      cy="115"
      rx="7"
      ry="22"
      fill="#FECDD3"
      fillOpacity="0.6"
      transform="rotate(-35 25 115)"
    />

    <ellipse
      cx="115"
      cy="115"
      rx="22"
      ry="7"
      fill="#F43F5E"
      fillOpacity="0.4"
      transform="rotate(35 115 115)"
    />
    <ellipse
      cx="115"
      cy="115"
      rx="7"
      ry="22"
      fill="#FECDD3"
      fillOpacity="0.6"
      transform="rotate(35 115 115)"
    />

    {/* Center Chassis / Body */}
    <rect
      x="46"
      y="46"
      width="48"
      height="48"
      rx="14"
      fill="url(#droneBody)"
      stroke="#FFFFFF"
      strokeWidth="2.5"
    />
    <rect x="54" y="54" width="32" height="32" rx="8" fill="url(#droneCore)" />

    {/* Flight Sensor / Camera Eye */}
    <circle cx="70" cy="70" r="10" fill="#38BDF8" />
    <circle cx="70" cy="70" r="6" fill="#0284C7" />
    <circle cx="68" cy="68" r="2.5" fill="#FFFFFF" />

    {/* Navigation LEDs */}
    <circle cx="70" cy="49" r="3.5" fill="#4ADE80" className="animate-ping" />
    <circle cx="70" cy="49" r="3" fill="#22C55E" />
    <circle cx="49" cy="70" r="2.5" fill="#FBBF24" />
    <circle cx="91" cy="70" r="2.5" fill="#FBBF24" />
  </svg>
);

/**
 * Microcontroller Board (Arduino / ESP32 style)
 */
export const ControllerBoardSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 130 110"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient
        id="boardPcb"
        x1="10"
        y1="10"
        x2="120"
        y2="100"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#0D9488" />
        <stop offset="1" stopColor="#0F766E" />
      </linearGradient>
      <linearGradient id="mcuChip" x1="50" y1="40" x2="80" y2="70" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E293B" />
        <stop offset="1" stopColor="#020617" />
      </linearGradient>
    </defs>

    {/* PCB Board Base */}
    <rect
      x="10"
      y="10"
      width="110"
      height="90"
      rx="10"
      fill="url(#boardPcb)"
      stroke="#2DD4BF"
      strokeWidth="2"
    />

    {/* Mounting Holes */}
    <circle cx="18" cy="18" r="4" fill="#134E4A" stroke="#FDE047" strokeWidth="1.5" />
    <circle cx="112" cy="18" r="4" fill="#134E4A" stroke="#FDE047" strokeWidth="1.5" />
    <circle cx="18" cy="92" r="4" fill="#134E4A" stroke="#FDE047" strokeWidth="1.5" />
    <circle cx="112" cy="92" r="4" fill="#134E4A" stroke="#FDE047" strokeWidth="1.5" />

    {/* USB Port */}
    <rect
      x="5"
      y="44"
      width="14"
      height="22"
      rx="3"
      fill="#94A3B8"
      stroke="#CBD5E1"
      strokeWidth="1.5"
    />
    <rect x="10" y="49" width="6" height="12" rx="1.5" fill="#475569" />

    {/* Reset Button */}
    <rect x="24" y="24" width="10" height="10" rx="2" fill="#CBD5E1" />
    <circle cx="29" cy="29" r="3" fill="#EF4444" />

    {/* Top Header Pins */}
    <rect x="35" y="14" width="68" height="9" rx="2" fill="#0F172A" />
    {[40, 48, 56, 64, 72, 80, 88, 96].map((x, i) => (
      <rect key={`pin-top-${i}`} x={x} y={16.5} width="4" height="4" rx="0.8" fill="#FBBF24" />
    ))}

    {/* Bottom Header Pins */}
    <rect x="35" y="87" width="68" height="9" rx="2" fill="#0F172A" />
    {[40, 48, 56, 64, 72, 80, 88, 96].map((x, i) => (
      <rect key={`pin-bot-${i}`} x={x} y={89.5} width="4" height="4" rx="0.8" fill="#FBBF24" />
    ))}

    {/* Main MCU Chip */}
    <rect
      x="52"
      y="38"
      width="34"
      height="34"
      rx="4"
      fill="url(#mcuChip)"
      stroke="#334155"
      strokeWidth="1.5"
    />
    <circle cx="58" cy="44" r="2" fill="#64748B" />
    {/* Microchip pins */}
    <line x1="48" y1="46" x2="52" y2="46" stroke="#E2E8F0" strokeWidth="1.5" />
    <line x1="48" y1="52" x2="52" y2="52" stroke="#E2E8F0" strokeWidth="1.5" />
    <line x1="48" y1="58" x2="52" y2="58" stroke="#E2E8F0" strokeWidth="1.5" />
    <line x1="48" y1="64" x2="52" y2="64" stroke="#E2E8F0" strokeWidth="1.5" />
    <line x1="86" y1="46" x2="90" y2="46" stroke="#E2E8F0" strokeWidth="1.5" />
    <line x1="86" y1="52" x2="90" y2="52" stroke="#E2E8F0" strokeWidth="1.5" />
    <line x1="86" y1="58" x2="90" y2="58" stroke="#E2E8F0" strokeWidth="1.5" />
    <line x1="86" y1="64" x2="90" y2="64" stroke="#E2E8F0" strokeWidth="1.5" />

    {/* Status LEDs */}
    <circle cx="98" cy="42" r="3" fill="#22C55E" className="animate-pulse" />
    <circle cx="98" cy="50" r="2.5" fill="#38BDF8" />
    <circle cx="98" cy="58" r="2.5" fill="#FBBF24" />

    {/* Circuit traces */}
    <path d="M29 60 L38 60 L44 52" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M38 72 L46 72 L50 66" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * HC-SR04 Ultrasonic Distance Sensor with pulse rings
 */
export const UltrasonicSensorSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 130 90"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient id="pcbBlue" x1="10" y1="20" x2="120" y2="70" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0284C7" />
        <stop offset="1" stopColor="#0369A1" />
      </linearGradient>
      <linearGradient
        id="transducerMetal"
        x1="20"
        y1="20"
        x2="55"
        y2="55"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#E2E8F0" />
        <stop offset="1" stopColor="#94A3B8" />
      </linearGradient>
    </defs>

    {/* PCB Board */}
    <rect
      x="10"
      y="20"
      width="110"
      height="50"
      rx="8"
      fill="url(#pcbBlue)"
      stroke="#38BDF8"
      strokeWidth="2"
    />

    {/* Left Transducer (Transmitter 'T') */}
    <circle
      cx="36"
      cy="45"
      r="20"
      fill="url(#transducerMetal)"
      stroke="#64748B"
      strokeWidth="2.5"
    />
    <circle cx="36" cy="45" r="14" fill="#334155" />
    <circle
      cx="36"
      cy="45"
      r="8"
      fill="#1E293B"
      stroke="#94A3B8"
      strokeDasharray="2 2"
      strokeWidth="1"
    />
    <text x="36" y="48" fontSize="8" fontWeight="bold" fill="#38BDF8" textAnchor="middle">
      T
    </text>

    {/* Right Transducer (Receiver 'R') */}
    <circle
      cx="94"
      cy="45"
      r="20"
      fill="url(#transducerMetal)"
      stroke="#64748B"
      strokeWidth="2.5"
    />
    <circle cx="94" cy="45" r="14" fill="#334155" />
    <circle
      cx="94"
      cy="45"
      r="8"
      fill="#1E293B"
      stroke="#94A3B8"
      strokeDasharray="2 2"
      strokeWidth="1"
    />
    <text x="94" y="48" fontSize="8" fontWeight="bold" fill="#38BDF8" textAnchor="middle">
      R
    </text>

    {/* 4 Connection Header Pins (VCC, TRIG, ECHO, GND) */}
    {[53, 61, 69, 77].map((x, i) => (
      <rect key={`sensor-pin-${i}`} x={x} y={70} width="4" height="12" rx="1" fill="#FBBF24" />
    ))}

    {/* Radiating Sonar Waves */}
    <path
      d="M6 35 Q 0 45 6 55"
      stroke="#38BDF8"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.6"
      className="animate-ping"
    />
    <path
      d="M124 35 Q 130 45 124 55"
      stroke="#38BDF8"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.6"
      className="animate-ping"
    />
  </svg>
);

/**
 * SG90 Micro Servo Motor with moving horn arm
 */
export const ServoMotorSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient
        id="servoCase"
        x1="30"
        y1="40"
        x2="90"
        y2="100"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient
        id="servoArmGrad"
        x1="40"
        y1="20"
        x2="80"
        y2="40"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#E2E8F0" />
      </linearGradient>
    </defs>

    {/* Servo Mount Ears */}
    <rect
      x="15"
      y="60"
      width="90"
      height="8"
      rx="2"
      fill="#1E40AF"
      stroke="#60A5FA"
      strokeWidth="1"
    />
    <circle cx="22" cy="64" r="2.5" fill="#FFFFFF" />
    <circle cx="98" cy="64" r="2.5" fill="#FFFFFF" />

    {/* Main Servo Body */}
    <rect
      x="30"
      y="45"
      width="60"
      height="55"
      rx="6"
      fill="url(#servoCase)"
      stroke="#60A5FA"
      strokeWidth="2"
    />

    {/* Top Gear Housing */}
    <rect x="42" y="32" width="36" height="15" rx="4" fill="#2563EB" />
    <circle cx="60" cy="35" r="11" fill="#1D4ED8" stroke="#93C5FD" strokeWidth="1.5" />

    {/* Servo Horn Arm (Rotates) */}
    <g className="origin-[60px_35px] animate-wobble" style={{ transformOrigin: '60px 35px' }}>
      <rect
        x="56"
        y="10"
        width="8"
        height="26"
        rx="4"
        fill="url(#servoArmGrad)"
        stroke="#94A3B8"
        strokeWidth="1.5"
      />
      <circle cx="60" cy="14" r="2" fill="#0F172A" />
      <circle cx="60" cy="22" r="2" fill="#0F172A" />
      <circle cx="60" cy="35" r="5" fill="#CBD5E1" stroke="#475569" strokeWidth="1" />
      <circle cx="60" cy="35" r="2" fill="#0F172A" />
    </g>

    {/* 3-Wire Ribbon Cable at Bottom */}
    <line x1="48" y1="100" x2="48" y2="115" stroke="#78350F" strokeWidth="3" />
    <line x1="60" y1="100" x2="60" y2="115" stroke="#DC2626" strokeWidth="3" />
    <line x1="72" y1="100" x2="72" y2="115" stroke="#F97316" strokeWidth="3" />

    {/* Label */}
    <rect x="38" y="70" width="44" height="16" rx="3" fill="#FFFFFF" />
    <text x="60" y="82" fontSize="9" fontWeight="900" fill="#1D4ED8" textAnchor="middle">
      SG90 9g
    </text>
  </svg>
);

/**
 * Microchip Integrated Circuit (IC) with glowing circuit lines
 */
export const MicrochipIC_SVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient id="chipGrad" x1="25" y1="25" x2="75" y2="75" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E293B" />
        <stop offset="1" stopColor="#0B1121" />
      </linearGradient>
    </defs>

    {/* Pins Left */}
    {[30, 42, 54, 66].map((y, i) => (
      <rect
        key={`ic-left-${i}`}
        x="10"
        y={y}
        width="16"
        height="5"
        rx="1.5"
        fill="#E2E8F0"
        stroke="#94A3B8"
        strokeWidth="1"
      />
    ))}

    {/* Pins Right */}
    {[30, 42, 54, 66].map((y, i) => (
      <rect
        key={`ic-right-${i}`}
        x="74"
        y={y}
        width="16"
        height="5"
        rx="1.5"
        fill="#E2E8F0"
        stroke="#94A3B8"
        strokeWidth="1"
      />
    ))}

    {/* Chip Body */}
    <rect
      x="22"
      y="20"
      width="56"
      height="60"
      rx="8"
      fill="url(#chipGrad)"
      stroke="#475569"
      strokeWidth="2"
    />

    {/* Notch */}
    <circle cx="50" cy="20" r="5" fill="#334155" />
    <circle cx="32" cy="30" r="2.5" fill="#64748B" />

    {/* Internal Tech Core / Glowing Circuit */}
    <rect
      x="36"
      y="38"
      width="28"
      height="28"
      rx="4"
      fill="#0F172A"
      stroke="#38BDF8"
      strokeWidth="1.5"
    />
    <circle cx="50" cy="52" r="5" fill="#38BDF8" className="animate-pulse" />
  </svg>
);

/**
 * 5mm Through-hole LED with glowing aura
 */
export const ElectronicLedSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 80 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <radialGradient id="ledGlow" cx="40" cy="35" r="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FBBF24" stopOpacity="0.8" />
        <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ledDome" x1="25" y1="20" x2="55" y2="55" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FEF08A" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
    </defs>

    {/* Glow Halo */}
    <circle cx="40" cy="35" r="28" fill="url(#ledGlow)" className="animate-pulse" />

    {/* Anode & Cathode Leads */}
    <line x1="34" y1="58" x2="34" y2="92" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
    <line x1="46" y1="58" x2="46" y2="84" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />

    {/* Flange / Rim Base */}
    <rect x="23" y="52" width="34" height="6" rx="2" fill="#D97706" />

    {/* Dome */}
    <path
      d="M25 52 V 35 A 15 15 0 0 1 55 35 V 52 Z"
      fill="url(#ledDome)"
      stroke="#FFFFFF"
      strokeWidth="1.5"
    />
    <ellipse
      cx="33"
      cy="32"
      rx="3"
      ry="8"
      fill="#FFFFFF"
      fillOpacity="0.6"
      transform="rotate(-20 33 32)"
    />
  </svg>
);

/**
 * Electronic Resistor (1k Ohm)
 */
export const ResistorSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 100 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Axial Leads */}
    <line x1="5" y1="20" x2="25" y2="20" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
    <line x1="75" y1="20" x2="95" y2="20" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />

    {/* Ceramic Body */}
    <rect
      x="25"
      y="10"
      width="50"
      height="20"
      rx="8"
      fill="#FDE68A"
      stroke="#F59E0B"
      strokeWidth="1.5"
    />

    {/* Color Bands (Brown, Black, Red, Gold) */}
    <rect x="33" y="10" width="5" height="20" fill="#78350F" />
    <rect x="43" y="10" width="5" height="20" fill="#0F172A" />
    <rect x="53" y="10" width="5" height="20" fill="#DC2626" />
    <rect x="65" y="10" width="5" height="20" fill="#F59E0B" />
  </svg>
);

/**
 * Mechanical Engineering Gear
 */
export const EngineeringGearSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M50 15 L55 24 A 32 32 0 0 1 65 29 L75 25 L80 34 L72 41 A 32 32 0 0 1 73 50 A 32 32 0 0 1 72 59 L80 66 L75 75 L65 71 A 32 32 0 0 1 55 76 L50 85 L41 85 L36 76 A 32 32 0 0 1 26 71 L16 75 L11 66 L19 59 A 32 32 0 0 1 18 50 A 32 32 0 0 1 19 41 L11 34 L16 25 L26 29 A 32 32 0 0 1 36 24 L41 15 Z"
      fill="#A855F7"
      stroke="#C084FC"
      strokeWidth="2"
    />
    <circle cx="50" cy="50" r="16" fill="#0B1121" stroke="#E9D5FF" strokeWidth="2.5" />
    <circle cx="50" cy="50" r="6" fill="#C084FC" />
  </svg>
);

/**
 * Robotic Arm Vector
 */
export const RoboticArmSVG = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Base */}
    <rect
      x="35"
      y="95"
      width="50"
      height="15"
      rx="5"
      fill="#334155"
      stroke="#64748B"
      strokeWidth="2"
    />
    <circle cx="60" cy="95" r="12" fill="#F43F5E" />

    {/* Lower Arm Segment */}
    <line x1="60" y1="95" x2="45" y2="55" stroke="#F43F5E" strokeWidth="10" strokeLinecap="round" />
    <circle cx="45" cy="55" r="10" fill="#0F172A" stroke="#FB7185" strokeWidth="2.5" />

    {/* Upper Arm Segment */}
    <line x1="45" y1="55" x2="80" y2="30" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" />
    <circle cx="80" cy="30" r="8" fill="#0F172A" stroke="#7DD3FC" strokeWidth="2" />

    {/* Gripper Wrist & Claws */}
    <line x1="80" y1="30" x2="95" y2="20" stroke="#FBBF24" strokeWidth="6" strokeLinecap="round" />
    <path
      d="M95 14 Q 105 10 110 18"
      stroke="#FBBF24"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M95 26 Q 105 30 110 22"
      stroke="#FBBF24"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/**
 * Interactive / Playful Floating Hardware Badge Card for Hero Section
 */
export interface FloatingHardwareCardProps {
  imageSrc?: string;
  svgIcon?: React.ReactNode;
  badgeLabel: string;
  title: string;
  statusText: string;
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const FloatingHardwareCard = ({
  imageSrc,
  svgIcon,
  badgeLabel,
  title,
  statusText,
  accentColor = '#4FC3F7',
  className = '',
  style = {},
}: FloatingHardwareCardProps) => {
  return (
    <div
      className={`group flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/90 dark:bg-[#0B1121]/90 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-2xl cursor-default select-none ${className}`}
      style={style}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center p-1.5 shrink-0 shadow-inner relative overflow-hidden"
        style={{
          backgroundColor: `${accentColor}1A`,
          borderColor: `${accentColor}40`,
          borderWidth: 1,
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-contain drop-shadow group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          svgIcon
        )}
        <div
          className="absolute -top-6 -right-6 w-12 h-12 rounded-full blur-sm opacity-30"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full animate-ping shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <span
            className="text-[10px] font-black uppercase tracking-wider font-heading"
            style={{ color: accentColor }}
          >
            {badgeLabel}
          </span>
        </div>
        <div className="text-sm font-bold text-tg-dark dark:text-white leading-snug">{title}</div>
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono">
          {statusText}
        </div>
      </div>
    </div>
  );
};
