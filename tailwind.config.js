/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#080d1a',
          secondary: '#0f1629',
          card: '#131929',
          hover: '#1a2240',
          border: '#1e2d4a',
        },
        brand: {
          DEFAULT: '#00d4aa',
          dark: '#00b891',
          light: '#33ddbb',
        },
        income: '#22c55e',
        expense: '#ef4444',
        warning: '#f59e0b',
        text: {
          primary: '#f0f4ff',
          secondary: '#8898b4',
          muted: '#4a5c7a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(0,212,170,0.2)',
        'glow-red': '0 0 20px rgba(239,68,68,0.2)',
      },
    },
  },
  plugins: [],
}
