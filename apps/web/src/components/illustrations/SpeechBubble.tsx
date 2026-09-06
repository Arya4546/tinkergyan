import type { HTMLAttributes } from 'react';

export const SpeechBubble = ({
  text,
  className = '',
  ...props
}: { text: string } & HTMLAttributes<HTMLDivElement>) => {
  const isAbsolute = className.includes('absolute');
  return (
    <div className={`${isAbsolute ? '' : 'relative'} ${className}`} {...props}>
      <div className="bg-white rounded-[22px] px-5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.15)] border-3 sm:border-4 border-tg-blue inline-block">
        <span className="font-heading text-sm sm:text-base md:text-lg text-tg-dark font-bold whitespace-nowrap">
          {text}
        </span>
      </div>
      {/* Speech bubble tail */}
      <svg
        className="absolute -bottom-4 left-6 sm:left-8 w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-md"
        viewBox="0 0 40 40"
        fill="none"
      >
        <path d="M0 0 L40 0 L0 40 Z" fill="currentColor" />
        <path d="M0 0 L40 0 L0 40 Z" stroke="#4FC3F7" strokeWidth="4" />
      </svg>
    </div>
  );
};
