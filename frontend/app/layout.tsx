import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/AuthContext";

// Inter font with specific weights for typography consistency
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

// JetBrains Mono for code blocks
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SOP AI Agent Chat",
  description: "RAG-powered chat interface for querying Standard Operating Procedures",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

// Script to prevent flash of wrong theme (F82)
// This runs before React hydration to apply the stored theme immediately
const themeScript = `
  (function() {
    try {
      var theme = JSON.parse(localStorage.getItem('theme-storage') || '{}');
      var storedTheme = theme.state && theme.state.theme;
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var themeToApply = storedTheme || (prefersDark ? 'dark' : 'light');
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(themeToApply);
      document.documentElement.setAttribute('data-theme', themeToApply);
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Inline script to prevent theme flash (F82) */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
