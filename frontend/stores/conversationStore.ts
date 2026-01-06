import { create } from 'zustand';
import type { Conversation, Message, Source } from '@/types';

interface ConversationState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  isStreaming: boolean;
  streamingContent: string;
  streamingSources: Source[];
  searchQuery: string;
  error: string | null;
}

interface ConversationActions {
  // Conversations
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;

  // Messages
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;

  // Streaming
  setStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  setStreamingSources: (sources: Source[]) => void;
  clearStreaming: () => void;

  // UI State
  setLoading: (isLoading: boolean) => void;
  setSending: (isSending: boolean) => void;
  setSearchQuery: (query: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

const initialState: ConversationState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  isStreaming: false,
  streamingContent: '',
  streamingSources: [],
  searchQuery: '',
  error: null,
};

export const useConversationStore = create<ConversationState & ConversationActions>()((set) => ({
  ...initialState,

  // Conversations
  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, ...updates } : conv
      ),
      currentConversation:
        state.currentConversation?.id === id
          ? { ...state.currentConversation, ...updates }
          : state.currentConversation,
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((conv) => conv.id !== id),
      currentConversation: state.currentConversation?.id === id ? null : state.currentConversation,
      messages: state.currentConversation?.id === id ? [] : state.messages,
    })),

  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),

  // Messages
  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)),
    })),

  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    })),

  // Streaming
  setStreaming: (isStreaming) => set({ isStreaming }),

  setStreamingContent: (streamingContent) => set({ streamingContent }),

  setStreamingSources: (streamingSources) => set({ streamingSources }),

  clearStreaming: () =>
    set({
      isStreaming: false,
      streamingContent: '',
      streamingSources: [],
    }),

  // UI State
  setLoading: (isLoading) => set({ isLoading }),

  setSending: (isSending) => set({ isSending }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // Reset
  reset: () => set(initialState),
}));

// Selectors
export const selectFilteredConversations = (state: ConversationState) =>
  state.conversations.filter((conv) =>
    conv.title.toLowerCase().includes(state.searchQuery.toLowerCase())
  );
