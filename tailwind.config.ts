import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        prompt: ["var(--font-prompt)", "Prompt", "sans-serif"]
      },
      colors: {
        night: "#07111f",
        panel: "#101c30",
        line: "#254466",
        gold: "#fbbf24",
        aqua: "#22d3ee",
        success: "#10b981",
        danger: "#fb3158"
      },
      boxShadow: {
        glow: "0 0 36px rgba(34,211,238,0.18)",
        gold: "0 0 34px rgba(251,191,36,0.22)"
      }
    }
  },
  plugins: []
};

export default config;
