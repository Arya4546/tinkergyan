import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          ...colors.indigo,
          DEFAULT: '#6C63FF',
          500: '#6C63FF',
        },
        accent: {
          ...colors.emerald,
          DEFAULT: '#00D4A8',
          500: '#00D4A8',
        },
        warning: {
          ...colors.amber,
          DEFAULT: '#FFB347',
          500: '#FFB347',
        },
        error: {
          ...colors.red,
          DEFAULT: '#FF6B6B',
          500: '#FF6B6B',
        },
        success: {
          ...colors.teal,
          DEFAULT: '#00D4A8',
          500: '#00D4A8',
        },
        // Reserved exclusively for celebration moments: badge unlocks, streak
        // milestones, successful uploads. Semantically distinct from warning amber.
        celebrate: {
          DEFAULT: '#FFD700',
          500: '#FFD700',
          400: '#FFE033',
          600: '#E6C200',
        },
        // Editor surface ramp. These read the CSS custom properties written by
        // `applyEditorTokens()` (src/lib/editor-tokens.ts), which is the same
        // palette Blockly's workspace theme is built from — so the canvas and
        // every panel around it are guaranteed to agree. Prefer these over
        // literal hex values anywhere on the editor page.
        ed: {
          well: 'var(--ed-well)',
          chrome: 'var(--ed-chrome)',
          panel: 'var(--ed-panel)',
          raised: 'var(--ed-raised)',
          line: 'var(--ed-line)',
          'line-soft': 'var(--ed-line-soft)',
          hi: 'var(--ed-text-hi)',
          mid: 'var(--ed-text-mid)',
          lo: 'var(--ed-text-lo)',
          accent: 'var(--ed-accent)',
          'accent-soft': 'var(--ed-accent-soft)',
          go: 'var(--ed-go)',
          warn: 'var(--ed-warn)',
          err: 'var(--ed-err)',
          // Terminal surfaces — dark in BOTH themes by design. The compile
          // console and serial monitor read as terminals because they're dark;
          // inverting them in light mode would make output harder to scan.
          'term-bg': 'var(--ed-term-bg)',
          'term-surface': 'var(--ed-term-surface)',
          'term-line': 'var(--ed-term-line)',
          'term-text': 'var(--ed-term-text)',
          'term-dim': 'var(--ed-term-dim)',
        },

        surface: '#FFFFFF',
        background: '#F7F8FC',
        dark: {
          bg: '#1A1B2E',
          surface: '#252640',
          border: '#2E3055',
        },
        text: {
          primary: '#1A1B2E',
          muted: '#9094A6',
        },
        'tg-orange': '#FF9B3A',
        'tg-orange-light': '#FFB86C',
        'tg-orange-dark': '#E8850F',
        'tg-blue': '#4FC3F7',
        'tg-green': '#66BB6A',
        'tg-purple': '#AB47BC',
        'tg-pink': '#EC407A',
        'tg-yellow': '#FFD54F',
        'tg-dark': '#1A237E',
        // Premium Playful Palette
        'playful-light-bg': '#F0F9FF', // sky-50
        'playful-dark-bg': '#0B1121', // deep space
        'playful-card-light': '#FFFFFF',
        'playful-card-dark': '#1E293B',
        'playful-primary': '#8B5CF6', // Violet
        'playful-primary-hover': '#7C3AED',
        'playful-secondary': '#3B82F6', // Blue
        'playful-accent': '#F43F5E', // Rose
        'playful-highlight': '#FBBF24', // Amber
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        playful: ['Quicksand', 'Outfit', 'sans-serif'],
        heading: ['Baloo 2', 'Quicksand', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.4s ease-out',
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        pop: 'pop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'confetti-fly': 'confettiFly 0.6s ease-out forwards',
        float: 'float 4s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-fast': 'float 3s ease-in-out infinite',
        wobble: 'wobble 2s ease-in-out infinite',
        'jump-spin': 'jumpSpin 1.5s infinite cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        shine: 'shine 2s linear infinite',
        drift: 'drift 8s ease-in-out infinite',
        'pop-in': 'popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        wave: 'wave 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': {
            transform: 'translateY(-2%)',
            animationTimingFunction: 'cubic-bezier(0.8,0,1,1)',
          },
          '50%': { transform: 'none', animationTimingFunction: 'cubic-bezier(0,0,0.2,1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        confettiFly: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-60px) scale(0)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(10px, -15px)' },
        },
        wobble: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-5deg)' },
          '75%': { transform: 'rotate(5deg)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        wave: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%, 60%': { transform: 'rotate(12deg)' },
          '40%, 80%': { transform: 'rotate(-12deg)' },
        },
        jumpSpin: {
          '0%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-15px) rotate(180deg)' },
          '100%': { transform: 'translateY(0) rotate(360deg)' },
        },
        shine: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
