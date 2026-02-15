/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: '#0e1525',
        panel: '#121a2b',
        'panel-2': '#0f1727',
        stroke: 'rgba(255,255,255,0.18)',
        'stroke-2': 'rgba(255,255,255,0.12)',
        muted: 'rgba(255,255,255,0.55)',
        'muted-2': 'rgba(255,255,255,0.42)',
        'btn-a': '#1a86e8',
        'btn-b': '#6f57ea',
        slot: 'rgba(255,255,255,0.03)',
        'slot-2': 'rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
};
