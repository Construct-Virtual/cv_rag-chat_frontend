'use client';

import { useEffect, useState, useLayoutEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Use useLayoutEffect on client, useEffect on server (for SSR compatibility)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { initTheme, theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // Apply theme immediately on mount to prevent flash (F82)
  useIsomorphicLayoutEffect(() => {
    // Initialize theme from persisted storage
    initTheme();
    setMounted(true);
  }, [initTheme]);

  // Sync theme class with html element whenever theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      html.classList.remove('dark', 'light');
      html.classList.add(theme);
      html.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Prevent flash of incorrect theme by not rendering until theme is applied
  // On first load, we show nothing briefly while theme initializes
  // This prevents the "flash of wrong theme" issue
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
