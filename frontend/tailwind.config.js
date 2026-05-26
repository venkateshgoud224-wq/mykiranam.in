/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kirana: {
          50: '#fdfdf7',
          100: '#faf8e5',
          200: '#f3eebc',
          300: '#e7dc85',
          400: '#d7c24f',
          500: '#cca725', // Warm Golden Mustard Kirana Color
          600: '#aa821b',
          700: '#886217',
          800: '#6c4a16',
          900: '#593b16',
          950: '#331f0a',
        },
        accent: {
          emerald: '#10b981',
          crimson: '#e11d48',
          amber: '#f59e0b',
        },
        crimson: '#e11d48',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03)',
        'premium-hover': '0 10px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'glass': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
}
