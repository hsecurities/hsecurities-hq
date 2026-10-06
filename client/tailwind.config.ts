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
        cyber: {
          blue: "#0066FF",
          navy: "#0B1220",
          cyan: "#38BDF8",
          slate: "#1E293B",
          dark: "#050911",
          muted: "#94A3B8"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"]
      }
    },
  },
  plugins: [],
};
export default config;
