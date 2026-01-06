'use client';

import { useCallback } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { apiPost } from '@/app/utils/api';
import type { Message, Source, StreamEvent } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface StreamOptions {
  onToken?: (content: string) => void;
  onComplete?: (content: string, sources: Source[]) => void;
  onError?: (error: string) => void;
}

export function useChatStream() {
  const {
    currentConversation,
    messages,
    setMessages,
    addMessage,
    removeMessage,
    setStreaming,
    setStreamingContent,
    setStreamingSources,
    clearStreaming,
    setSending,
    setError,
  } = useConversationStore();

  const processStream = useCallback(
    async (response: Response, options: StreamOptions = {}): Promise<void> => {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: StreamEvent = JSON.parse(line.substring(6));

                if (data.type === 'token') {
                  fullContent = data.full_content || '';
                  setStreamingContent(fullContent);
                  options.onToken?.(fullContent);
                } else if (data.type === 'complete') {
                  fullContent = data.full_content || '';
                  const sources = data.sources || [];

                  setStreamingContent('');
                  setStreaming(false);
                  setStreamingSources(sources);

                  options.onComplete?.(fullContent, sources);
                } else if (data.type === 'error') {
                  const errorMessage = data.message || 'Unknown error';
                  clearStreaming();
                  setError(errorMessage);
                  options.onError?.(errorMessage);
                }
              } catch (parseErr) {
                console.error('Failed to parse SSE data:', parseErr);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
    [setStreamingContent, setStreaming, setStreamingSources, clearStreaming, setError]
  );

  const sendMessage = useCallback(
    async (messageText: string, options: StreamOptions = {}): Promise<void> => {
      if (!messageText.trim() || !currentConversation) {
        return;
      }

      setSending(true);
      setStreaming(true);
      setStreamingContent('');
      setStreamingSources([]);

      try {
        // Add temp user message to UI
        const tempUserMessage: Message = {
          id: `temp-${Date.now()}`,
          conversation_id: currentConversation.id,
          role: 'user',
          content: messageText,
          created_at: new Date().toISOString(),
        };
        addMessage(tempUserMessage);

        const response = await apiPost(`${API_URL}/api/chat/query`, {
          conversation_id: currentConversation.id,
          message: messageText,
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        await processStream(response, options);
      } catch (err) {
        console.error('Failed to send message:', err);
        clearStreaming();
        setError(err instanceof Error ? err.message : 'Failed to send message');
        options.onError?.(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setSending(false);
      }
    },
    [
      currentConversation,
      addMessage,
      setSending,
      setStreaming,
      setStreamingContent,
      setStreamingSources,
      clearStreaming,
      setError,
      processStream,
    ]
  );

  const regenerateMessage = useCallback(
    async (messageId: string, options: StreamOptions = {}): Promise<void> => {
      if (!currentConversation) {
        return;
      }

      // Remove old message from UI
      removeMessage(messageId);

      setSending(true);
      setStreaming(true);
      setStreamingContent('');
      setStreamingSources([]);

      try {
        const response = await apiPost(`${API_URL}/api/chat/messages/${messageId}/regenerate`, {});

        if (!response.ok) {
          throw new Error('Failed to regenerate response');
        }

        await processStream(response, options);
      } catch (err) {
        console.error('Failed to regenerate response:', err);
        clearStreaming();
        setError(err instanceof Error ? err.message : 'Failed to regenerate response');
        options.onError?.(err instanceof Error ? err.message : 'Failed to regenerate response');
      } finally {
        setSending(false);
      }
    },
    [
      currentConversation,
      removeMessage,
      setSending,
      setStreaming,
      setStreamingContent,
      setStreamingSources,
      clearStreaming,
      setError,
      processStream,
    ]
  );

  return {
    sendMessage,
    regenerateMessage,
    isStreaming: useConversationStore((state) => state.isStreaming),
    isSending: useConversationStore((state) => state.isSending),
    streamingContent: useConversationStore((state) => state.streamingContent),
    streamingSources: useConversationStore((state) => state.streamingSources),
  };
}
