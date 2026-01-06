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
        // Theme-aware colors using CSS variables (F80)
        // These automatically switch based on .dark/.light class on html
        background: {
          primary: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary: "var(--color-bg-tertiary)",
          elevated: "var(--color-bg-elevated)",
        },
        foreground: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          primary: "var(--color-accent-primary)",
          hover: "var(--color-accent-hover)",
          secondary: "#8B5CF6",  // purple - consistent across themes
        },
        // Semantic text colors using CSS variables
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        // Border using CSS variable
        border: {
          DEFAULT: "var(--color-border)",
          hover: "var(--color-border-hover)",
        },
        // Status colors (consistent across themes for recognition)
        status: {
          success: "#10B981",    // green
          warning: "#F59E0B",    // amber
          error: "#EF4444",      // red
        },
        // Message colors using CSS variables
        message: {
          user: "var(--color-message-user)",
          assistant: "var(--color-message-assistant)",
        },
        // Explicit dark/light theme colors for manual overrides
        dark: {
          bg: {
            primary: "#0A0A0A",
            secondary: "#1A1A1A",
            tertiary: "#2A2A2A",
          },
          text: {
            primary: "#F5F5F5",
            secondary: "#A1A1A1",
            muted: "#737373",
          },
          border: "#2A2A2A",
        },
        light: {
          bg: {
            primary: "#FFFFFF",
            secondary: "#F9FAFB",
            tertiary: "#F3F4F6",
          },
          text: {
            primary: "#111827",
            secondary: "#4B5563",  // WCAG AA compliant (5.9:1)
            muted: "#6B7280",      // WCAG AA compliant (4.6:1)
          },
          border: "#E5E7EB",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "sans-serif",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          "'JetBrains Mono'",
          "'Fira Code'",
          "monospace",
        ],
      },
      fontSize: {
        // Message text size for readability
        message: ["15px", { lineHeight: "1.75" }],
      },
      spacing: {
        // Header height
        header: "64px",
        // Sidebar width
        sidebar: "300px",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
      transitionTimingFunction: {
        DEFAULT: "ease-in-out",
      },
      boxShadow: {
        // Elevated card shadow
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
        // Dropdown shadow
        dropdown: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
