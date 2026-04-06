/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === THE FIX: GLOBAL THEME INJECTION ===
        // By redefining this variable, ALL inner modules will instantly switch 
        // from Cyan to the Official POSO Emerald Green.
        emerald-600: '#059669', // Tailwind emerald-600
        bg-emerald-900: '#022c22'    // Tailwind bg-emerald-900
      }
    },
  },
  plugins: [],
}