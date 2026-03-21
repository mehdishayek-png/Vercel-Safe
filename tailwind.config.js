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
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#FFF9EB',
          100: '#FFF0C7',
          200: '#FFDF8A',
          300: '#FFCB4D',
          400: '#F5B731',
          500: '#D4941A',
          600: '#C8962E',
          700: '#A16C10',
          800: '#845410',
          900: '#6D4512',
        },
        accent: {
          50: '#F0FDF7',
          100: '#DCFCEC',
          200: '#BBF7D6',
          300: '#86EFAD',
          400: '#4ADE7B',
          500: '#1A8A52',
          600: '#15803D',
          700: '#166534',
        },
        ink: {
          950: '#0C0A09',
          900: '#1C1917',
          800: '#292524',
          700: '#44403C',
          600: '#57534E',
          500: '#78716C',
          400: '#A8A29E',
          300: '#D6D3D1',
          200: '#E7E5E4',
          100: '#F5F5F4',
          50: '#FAFAF9',
        },
        surface: {
          0: '#FFFFFF',
          50: '#FAFAF7',
          100: '#F5F2ED',
          200: '#E8E4DD',
          300: '#D6D1C9',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(28, 25, 23, 0.04), 0 1px 2px rgba(28, 25, 23, 0.03)',
        'card-hover': '0 4px 20px -4px rgba(28, 25, 23, 0.08)',
        'elevated': '0 8px 30px -4px rgba(28, 25, 23, 0.1)',
        'button': '0 1px 2px rgba(28, 25, 23, 0.06)',
        'gold': '0 4px 14px -3px rgba(200, 150, 46, 0.25)',
      },
    },
  },
  plugins: [],
};
