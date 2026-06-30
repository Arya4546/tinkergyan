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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
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
      },
    },
  },
  plugins: [],
} satisfies Config;
