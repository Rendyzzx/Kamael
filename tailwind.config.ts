import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Design tokens — lihat :root di globals.css untuk nilai aslinya.
        app: {
          bg: "var(--bg)",
          surface: "var(--surface)",
          "surface-2": "var(--surface-2)",
          "surface-3": "var(--surface-3)",
          text: "var(--text)",
          "text-2": "var(--text-2)",
        },
        amber: "var(--amber)",
        sunset: "var(--sunset)",
        peach: "var(--peach)",
        violet: "var(--violet)",
        chip: {
          border: "var(--chip-border)",
        },
        navactive: "var(--nav-active)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        app: "var(--radius-md)",
        chip: "var(--radius-chip)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      // Keluarga warna lama tetap dipetakan (alias tema golden hour).
      blue: "var(--amber)",
      yellow: "var(--peach)",
      maroon: "var(--maroon)",
    },
  },
  plugins: [],
};

export default config;
