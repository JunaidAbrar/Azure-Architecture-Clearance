/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark utility theme per CLAUDE.md spec
        'clearance-bg': '#0D1117',
        'clearance-bg-secondary': '#161B22',
        'clearance-border': '#30363D',
        'clearance-text': '#E6EDF3',
        'clearance-text-muted': '#8B949E',
        // Status colors
        'clearance-pass': '#0D9488',
        'clearance-partial': '#F59E0B',
        'clearance-fail': '#EF4444',
        'clearance-high': '#F59E0B',
        'clearance-medium': '#F97316',
        'clearance-low': '#0D9488',
        // Scanner UI colors
        'clearance-cyan': '#22D3EE',
        'clearance-teal': '#14B8A6',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'sans': ['DM Sans', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'scan-line': 'scan-line 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'check-draw': 'check-draw 0.5s ease-out forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(20, 184, 166, 0.5), 0 0 20px rgba(20, 184, 166, 0.3)',
            opacity: '1'
          },
          '50%': {
            boxShadow: '0 0 10px rgba(34, 211, 238, 0.8), 0 0 40px rgba(34, 211, 238, 0.4)',
            opacity: '0.8'
          },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'scan-line': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '50%': { transform: 'translateY(100%)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'check-draw': {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [],
}
