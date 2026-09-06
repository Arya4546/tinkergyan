import {
  DroneSVG,
  ControllerBoardSVG,
  UltrasonicSensorSVG,
  ServoMotorSVG,
  MicrochipIC_SVG,
  ElectronicLedSVG,
  RoboticArmSVG,
  EngineeringGearSVG,
} from './HardwareElements';

export const DoodleBackground = ({ className = '' }: { className?: string }) => {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Decorative tech sparks / stars */}
      <svg
        className="absolute top-[8%] left-[12%] w-7 h-7 text-white/50 dark:text-playful-highlight/70 animate-float"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
      <svg
        className="absolute top-[28%] right-[8%] w-6 h-6 text-white/40 dark:text-playful-highlight/60 animate-float-slow"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
      <svg
        className="absolute bottom-[22%] left-[4%] w-8 h-8 text-white/35 dark:text-playful-highlight/50 animate-float-fast"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>

      {/* 1. Quadcopter Drone - Floating Top-Right Sky */}
      <div className="absolute top-[10%] right-[6%] md:right-[9%] w-20 h-20 md:w-28 md:h-28 opacity-90 animate-float-slow drop-shadow-xl hover:scale-110 transition-transform">
        <DroneSVG className="w-full h-full" />
      </div>

      {/* 2. Microcontroller Board (ESP32/Arduino) - Floating Top-Left Sky */}
      <div
        className="absolute top-[10%] left-[5%] md:left-[7%] w-18 h-16 md:w-24 md:h-20 opacity-85 animate-float drop-shadow-xl"
        style={{ animationDelay: '0.8s' }}
      >
        <ControllerBoardSVG className="w-full h-full" />
      </div>

      {/* 3. Ultrasonic Sensor (HC-SR04) - Floating Far-Left Margin */}
      <div
        className="absolute top-[45%] left-[2%] md:left-[3.5%] w-18 h-14 md:w-22 md:h-16 opacity-85 animate-float-fast drop-shadow-lg"
        style={{ animationDelay: '1.5s' }}
      >
        <UltrasonicSensorSVG className="w-full h-full" />
      </div>

      {/* 4. Electronic LED with Soft Glow - Floating Far-Right Margin */}
      <div
        className="absolute top-[44%] right-[2%] md:right-[4%] w-12 h-16 md:w-14 md:h-18 opacity-80 animate-float-slow"
        style={{ animationDelay: '2s' }}
      >
        <ElectronicLedSVG className="w-full h-full" />
      </div>

      {/* 5. SG90 Servo Motor - Floating Bottom-Right (Clear of Mascot) */}
      <div
        className="absolute bottom-[20%] right-[5%] md:right-[8%] w-16 h-16 md:w-20 md:h-20 opacity-80 animate-wobble drop-shadow-md"
        style={{ animationDuration: '4s' }}
      >
        <ServoMotorSVG className="w-full h-full" />
      </div>

      {/* 6. Robotic Arm - Floating Bottom-Left (Clear of Buttons) */}
      <div
        className="absolute bottom-[20%] left-[5%] md:left-[8%] w-16 h-16 md:w-20 md:h-20 opacity-75 animate-float-slow drop-shadow-md"
        style={{ animationDelay: '2.5s' }}
      >
        <RoboticArmSVG className="w-full h-full" />
      </div>

      {/* 7. Microchip IC - Floating Upper Center Sky */}
      <div className="absolute top-[6%] left-[45%] md:left-[42%] w-11 h-11 md:w-13 md:h-13 opacity-60 animate-drift">
        <MicrochipIC_SVG className="w-full h-full" />
      </div>

      {/* 8. Rotating Engineering Gear - Subtle Lower Right */}
      <div className="absolute bottom-[16%] right-[25%] w-12 h-12 md:w-14 md:h-14 opacity-30 animate-[spin_20s_linear_infinite]">
        <EngineeringGearSVG className="w-full h-full" />
      </div>

      {/* 9. PCB Circuit Wire Paths with Solder Vias (Subtle Ambient Accents) */}
      <svg
        className="absolute inset-0 w-full h-full text-white/15 dark:text-white/10"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top left circuit trace */}
        <path
          d="M0,60 H60 L90,90 V140"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <circle cx="60" cy="60" r="3.5" fill="currentColor" />
        <circle cx="90" cy="140" r="4" fill="#4FC3F7" className="animate-ping" />

        {/* Bottom right circuit trace */}
        <path
          d="M1050,550 H1120 L1160,590 H1200"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <circle cx="1120" cy="550" r="3.5" fill="currentColor" />
        <circle cx="1160" cy="590" r="4" fill="#FBBF24" className="animate-ping" />
      </svg>
    </div>
  );
};
