/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        headline: ['Plus Jakarta Sans', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        surface: {
          0: '#020617',    // slate-950 (Background base)
          50: '#0f172a',   // slate-900 (Cards and panels)
          100: '#1e293b',  // slate-800 (Hover states)
          200: '#334155',  // slate-700 (Borders, dividers)
          300: '#475569',  // slate-600 
          400: '#64748b',  // slate-500
        },
      },
      borderRadius: {
        DEFAULT: '16px',
        'sm': '12px',
        'lg': '24px',
        'xl': '32px',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.8)',
        'elevated': '0 12px 40px -8px rgba(0, 0, 0, 0.8)',
        'button': '0 1px 2px rgba(0,0,0,0.5)',
        'glass': '0 8px 32px rgba(0,0,0,0.8)',
        'glow': '0 0 40px -8px rgba(14, 165, 233, 0.4)',
      },
    },
  },
  plugins: [],
};
