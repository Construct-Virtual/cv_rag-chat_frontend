import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MessageDensity = 'comfortable' | 'default' | 'compact';
export type SyntaxTheme = 'github-dark' | 'monokai' | 'solarized-dark' | 'dracula';

interface SettingsState {
  // Appearance settings
  messageDensity: MessageDensity;
  syntaxTheme: SyntaxTheme;
  showLineNumbers: boolean;

  // Actions
  setMessageDensity: (density: MessageDensity) => void;
  setSyntaxTheme: (theme: SyntaxTheme) => void;
  toggleLineNumbers: () => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  messageDensity: 'default' as MessageDensity,
  syntaxTheme: 'github-dark' as SyntaxTheme,
  showLineNumbers: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_SETTINGS,

      // Actions
      setMessageDensity: (density) => set({ messageDensity: density }),
      setSyntaxTheme: (theme) => set({ syntaxTheme: theme }),
      toggleLineNumbers: () => set((state) => ({ showLineNumbers: !state.showLineNumbers })),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'settings-storage',
    }
  )
);
