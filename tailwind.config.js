/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Assistant', 'Rubik', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Warm neutral canvas
        canvas: {
          50:  '#faf8f4',
          100: '#f3f0e8',
          200: '#ece7dc',
          300: '#dfd8ca',
        },
        // Refined wedding-gold accent
        gold: {
          50:  '#fdf8ed',
          100: '#faefd4',
          200: '#f4d98d',
          300: '#ebbf4d',
          400: '#dba528',
          500: '#c4901f',
          600: '#a87218',
          700: '#8a5715',
          800: '#6e4212',
          900: '#5a3510',
        },
        // Legacy palettes kept for backward-compat
        primary: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
          800: '#991b1b', 900: '#7f1d1d',
        },
        accent: {
          50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
          400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
          800: '#075985', 900: '#0c4a6e',
        },
      },
      boxShadow: {
        'warm-xs': '0 1px 2px rgba(28,20,10,0.05)',
        'warm-sm': '0 1px 3px rgba(28,20,10,0.06), 0 2px 8px rgba(28,20,10,0.04)',
        'warm':    '0 2px 8px rgba(28,20,10,0.07), 0 8px 24px rgba(28,20,10,0.05)',
        'warm-md': '0 4px 12px rgba(28,20,10,0.09), 0 12px 32px rgba(28,20,10,0.06)',
        'warm-lg': '0 6px 20px rgba(28,20,10,0.11), 0 20px 48px rgba(28,20,10,0.08)',
        'warm-xl': '0 8px 30px rgba(28,20,10,0.13), 0 24px 64px rgba(28,20,10,0.10)',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
