/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        angkasBlue: '#00AEEF',
        posoDark: '#1e293b'
      }
    },
  },
  plugins: [],
}