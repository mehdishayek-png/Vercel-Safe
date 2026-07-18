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
          100: '#dfe6ff',
          200: '#c4d0ff',
          300: '#9cb0ff',
          400: '#7189f4',
          500: '#4f67df',
          600: '#354fc7',
          700: '#2d409f',
          800: '#29377f',
          900: '#252f67',
        },
        accent: {
          50: '#ecfdf7',
          100: '#d1faec',
          200: '#a7f3da',
          300: '#6ee7c3',
          400: '#34d3a4',
          500: '#18b889',
          600: '#0d956f',
          700: '#0d765b',
        },
        surface: {
          0: '#ffffff',
          50: '#f7f6f2',
          100: '#f1f0eb',
          200: '#e9e7df',
          300: '#dedbd1',
          400: '#cbc7ba',
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
        'glow': '0 0 40px -8px rgba(53, 79, 199, 0.24)',
        'sidebar': '1px 0 0 rgba(24, 31, 46, 0.08)',
      },
    },
  },
  plugins: [],
};
