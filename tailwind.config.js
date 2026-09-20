/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkbg: '#0f172a',
        cardbg: '#1e293b',
        modalbg: '#1e293b',
      }
    },
  },
  plugins: [],
}
