/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          card:      'var(--bg-card)',
          hover:     'var(--bg-hover)',
          border:    'var(--bg-border)',
        },
        brand: {
          DEFAULT: 'rgb(var(--brand-rgb) / <alpha-value>)',
          dark:    'rgb(var(--brand-dark-rgb) / <alpha-value>)',
          light:   'rgb(var(--brand-light-rgb) / <alpha-value>)',
        },
        income:  'rgb(var(--income-rgb) / <alpha-value>)',
        expense: 'rgb(var(--expense-rgb) / <alpha-value>)',
        warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 },                                     to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(12px)' },     to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 },                               '50%': { opacity: 0.6 } },
      },
      boxShadow: {
        card:      '0 4px 24px rgba(0,0,0,0.15)',
        'card-lg': '0 8px 40px rgba(0,0,0,0.2)',
        glow:      '0 0 20px rgb(var(--brand-rgb) / 0.25)',
      },
    },
  },
  plugins: [],
}
