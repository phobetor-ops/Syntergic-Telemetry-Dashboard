import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        syntergic: {
          bg: "#030712",
          card: "#0b0f19",
          panel: "#0f172a",
          border: "#1e293b",
          green: "#10b981",
          yellow: "#f59e0b",
          red: "#f43f5e",
          cyan: "#06b6d4",
          violet: "#8b5cf6",
        },
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "strobe": "strobe 0.8s steps(2, start) infinite",
        "scan": "scan 6s linear infinite",
      },
      keyframes: {
        strobe: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
