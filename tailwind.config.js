/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink, #14253D)",
        brand: {
          teal: "#08AFC0",
          blue: "var(--brand-primary, #0876A8)",
          purple: "var(--brand-secondary, #7914A4)",
          pale: "#EFFBFC",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 16px 48px rgba(20, 37, 61, 0.08)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(110deg, #08AFC0 0%, var(--brand-primary, #0876A8) 52%, var(--brand-secondary, #7914A4) 100%)",
      },
    },
  },
  daisyui: {
    themes: [
      {
        gadgethub: {
          primary: "#0876A8",
          "primary-content": "#ffffff",
          secondary: "#7914A4",
          "secondary-content": "#ffffff",
          accent: "#08AFC0",
          "accent-content": "#082F49",
          neutral: "#14253D",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f5f8fc",
          "base-300": "#e6edf4",
          "base-content": "#14253D",
          info: "#0876A8",
          success: "#12805C",
          warning: "#D98A13",
          error: "#C14450",
        },
      },
    ],
  },
  plugins: [daisyui],
};
