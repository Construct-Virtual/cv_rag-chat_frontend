import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ChatMode = 'answer' | 'gap_analysis';

interface ChatModeState {
  mode: ChatMode;
}

interface ChatModeActions {
  setMode: (mode: ChatMode) => void;
  toggleMode: () => void;
}

export const useChatModeStore = create<ChatModeState & ChatModeActions>()(
  persist(
    (set) => ({
      // State
      mode: 'answer',

      // Actions
      setMode: (mode) => set({ mode }),

      toggleMode: () =>
        set((state) => ({
          mode: state.mode === 'answer' ? 'gap_analysis' : 'answer',
        })),
    }),
    {
      name: 'chat-mode-storage',
    }
  )
);
