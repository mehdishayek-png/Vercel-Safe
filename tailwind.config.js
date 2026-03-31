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
          50: '#fff5f3',
          100: '#ffdad2',
          200: '#ffb4a2',
          300: '#ff9e8a',
          400: '#ff8e78',
          500: '#ff7e67',
          600: '#e86a55',
          700: '#c44536',
          800: '#9e3529',
          900: '#3d0700',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        surface: {
          0: '#ffffff',
          50: '#fffcf9',
          100: '#fffaf5',
          200: '#fff5ed',
          300: '#fff1e6',
          400: '#ffe8d6',
        },
      },
      borderRadius: {
        DEFAULT: '16px',
        'sm': '12px',
        'lg': '24px',
        'xl': '32px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 20px 50px rgba(0,0,0,0.06)',
        'elevated': '0 12px 40px -8px rgba(0,0,0,0.12)',
        'button': '0 1px 2px rgba(0,0,0,0.05)',
        'glass': '0 8px 32px rgba(0,0,0,0.06)',
        'glow': '0 0 40px -8px rgba(255, 126, 103, 0.3)',
      },
    },
  },
  plugins: [],
};
