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
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8a4cfc',
          600: '#712ae2',
          700: '#6d28d9',
        },
        surface: {
          0: '#ffffff',
          50: '#f9f9ff',
          100: '#f0f3ff',
          200: '#e2e8f8',
          300: '#dce2f3',
          400: '#c7c4d8',
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
        'glow': '0 0 40px -8px rgba(79, 70, 229, 0.3)',
        'sidebar': '40px 0 60px -15px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};
