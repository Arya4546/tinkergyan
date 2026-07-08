import React from 'react';

/**
 * Custom SVG icons for the Scratch-style Stage & Sprite panel.
 * All icons use `currentColor` so they can be colored via Tailwind text-* classes.
 * Consistent 24×24 viewBox, 2px stroke-width design language.
 */

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// ── Green Flag ────────────────────────────────────────────────────────────────
export function GreenFlagIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M5 3c4 0 5 2 9 2s5-1 5-1v10c0 0-1 1-5 1s-5-2-9-2"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

// ── Stop (filled octagon) ─────────────────────────────────────────────────────
export function StopIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8.5 2.5h7l5 5v7l-5 5h-7l-5-5v-7l5-5z" fill="currentColor" />
    </svg>
  );
}

// ── Eye Open ──────────────────────────────────────────────────────────────────
export function EyeOpenIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── Eye Closed ────────────────────────────────────────────────────────────────
export function EyeClosedIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ── Small Stage View ──────────────────────────────────────────────────────────
export function SmallStageIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect
        x="15"
        y="5"
        width="6"
        height="14"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.4"
      />
      <rect
        x="3"
        y="15"
        width="10"
        height="4"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.4"
      />
    </svg>
  );
}

// ── Large Stage View (default) ────────────────────────────────────────────────
export function LargeStageIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect
        x="3"
        y="17"
        width="18"
        height="4"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.4"
      />
    </svg>
  );
}

// ── Fullscreen Toggle ─────────────────────────────────────────────────────────
export function FullscreenIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

// ── Exit Fullscreen ───────────────────────────────────────────────────────────
export function ExitFullscreenIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

// ── X Arrow (horizontal coordinate) ──────────────────────────────────────────
export function XArrowIcon({ size = 14, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <polyline points="17 8 21 12 17 16" />
      <polyline points="7 8 3 12 7 16" />
    </svg>
  );
}

// ── Y Arrow (vertical coordinate) ────────────────────────────────────────────
export function YArrowIcon({ size = 14, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <line x1="12" y1="3" x2="12" y2="21" />
      <polyline points="8 7 12 3 16 7" />
      <polyline points="8 17 12 21 16 17" />
    </svg>
  );
}

// ── Delete (X mark) ──────────────────────────────────────────────────────────
export function DeleteIcon({ size = 12, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className={className}
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

// ── Add Sprite (cat face silhouette — Scratch's signature) ───────────────────
export function AddSpriteIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Cat face silhouette */}
      <path d="M5 2l3 5h8l3-5c0 0 1 2 1 5v4c0 4-3 7-8 7s-8-3-8-7V7c0-3 1-5 1-5z" />
      {/* Eyes */}
      <circle cx="9" cy="11" r="1.5" fill="white" />
      <circle cx="15" cy="11" r="1.5" fill="white" />
      {/* Nose */}
      <ellipse cx="12" cy="14" rx="1" ry="0.7" fill="white" />
    </svg>
  );
}

// ── Add Backdrop (landscape/mountain icon) ───────────────────────────────────
export function AddBackdropIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

// ── Zoom In ──────────────────────────────────────────────────────────────────
export function ZoomInIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

// ── Zoom Out ─────────────────────────────────────────────────────────────────
export function ZoomOutIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

// ── Zoom Reset (= equals / fit) ──────────────────────────────────────────────
export function ZoomResetIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <line x1="7" y1="10" x2="17" y2="10" />
      <line x1="7" y1="14" x2="17" y2="14" />
    </svg>
  );
}
