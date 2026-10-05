import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Netral gelap, bukan hitam pekat: area streaming modern.
        surface: {
          950: "#0b0f17",
          900: "#0f1420",
          850: "#131926",
          800: "#1a2130",
          700: "#242c3f",
        },
        accent: {
          500: "#e11d48",
          600: "#be123c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
