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
        blue: {
          DEFAULT: "var(--blue)",
        },
        yellow: {
          DEFAULT: "var(--yellow)",
        },
        maroon: {
          DEFAULT: "var(--maroon)",
        },
        chip: {
          border: "var(--chip-border)",
        },
        navactive: "var(--nav-active)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        app: "var(--radius-md)",
        chip: "var(--radius-pill)",
      },
      fontFamily: {
        display: ["var(--font-montserrat)", "sans-serif"],
        sans: ["var(--font-roboto)", "sans-serif"],
      },
      backgroundImage: {
        "blue-grad": "var(--blue-grad)",
      },
    },
  },
  plugins: [],
};

export default config;
