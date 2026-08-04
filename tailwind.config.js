/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12181B",
        paper: "#F7F6F3",
        field: "#0E3B2E",
        going: "#1F5A45",
        notgoing: "#8A3B2E",
        gold: "#C9A15A"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"]
      }
    }
  },
  plugins: []
};
