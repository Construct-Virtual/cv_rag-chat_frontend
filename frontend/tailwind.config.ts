import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Dark theme colors (primary)
        background: {
          primary: "#0A0A0A",
          secondary: "#1A1A1A",
          tertiary: "#2A2A2A",
        },
        accent: {
          primary: "#3B82F6",
          secondary: "#8B5CF6",
        },
        text: {
          primary: "#F5F5F5",
          secondary: "#A1A1A1",
          muted: "#737373",
        },
        border: {
          DEFAULT: "#2A2A2A",
        },
        message: {
          user: "#2563EB",
          assistant: "#1F2937",
        },
        // Light theme colors (optional)
        light: {
          background: {
            primary: "#FFFFFF",
            secondary: "#F9FAFB",
            tertiary: "#F3F4F6",
          },
          text: {
            primary: "#111827",
            secondary: "#6B7280",
          },
          border: "#E5E7EB",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
