import { CartoonRocket } from '@/components/illustrations/CartoonRocket';
import { Cpu } from 'lucide-react';

interface LoaderProps {
  fullPage?: boolean;
  message?: string;
  text?: string;
}

export function Loader({
  fullPage = false,
  message,
  text = 'Getting things ready...',
}: LoaderProps) {
  const displayMessage = message || text;
  const content = (
    <div className="flex flex-col items-center justify-center p-8 gap-5 relative">
      {/* Animated Hardware / Rocket Container */}
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Pulsing circuit aura glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-playful-primary/25 via-playful-secondary/20 to-playful-highlight/25 blur-xl animate-pulse" />

        {/* Orbiting ring */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-playful-primary/40 dark:border-playful-highlight/40 animate-spin-slow" />

        {/* Orbiting particle */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-playful-highlight shadow-[0_0_10px_#FDCB6E] animate-ping" />

        {/* Rocket with float animation */}
        <div className="relative z-10 w-14 h-14 animate-bounce-gentle flex items-center justify-center">
          <CartoonRocket className="w-full h-full drop-shadow-md" />
        </div>

        {/* Microchip badge */}
        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-full p-1.5 shadow-sm z-20">
          <Cpu
            size={14}
            className="text-playful-primary dark:text-playful-highlight animate-pulse"
          />
        </div>
      </div>

      {/* Message & Status Indicator */}
      <div className="text-center space-y-2">
        <p className="font-heading font-bold text-sm tracking-wide text-slate-800 dark:text-white">
          {displayMessage}
        </p>

        {/* Playful brand bouncing dots */}
        <div className="flex gap-2 justify-center items-center pt-1">
          <div
            className="w-2 h-2 rounded-full bg-playful-primary animate-bounce shadow-xs"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-playful-secondary animate-bounce shadow-xs"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-playful-highlight animate-bounce shadow-xs"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[100] bg-playful-light-bg/90 dark:bg-[#050B14]/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden">
        {/* Subtle decorative glow spots */}
        <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-playful-primary/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-playful-secondary/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 bg-white/85 dark:bg-[#0B1121]/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-slate-200/80 dark:border-white/10 p-2 min-w-[260px]">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
