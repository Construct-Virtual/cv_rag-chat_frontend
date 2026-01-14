'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { SourceCitation } from './SourceCitation';
import type { Message, Source } from '@/types';

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  streamingContent?: string;
  streamingSources?: Source[];
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export function MessageList({
  messages,
  isStreaming = false,
  streamingContent = '',
  streamingSources = [],
  onCopy,
  onRegenerate,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const lastAssistantIndex = messages.reduceRight(
    (found, msg, idx) => (found === -1 && msg.role === 'assistant' ? idx : found),
    -1
  );

  return (
    // F71: Smooth scroll behavior for message list
    <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLastAssistantMessage={index === lastAssistantIndex}
            onCopy={onCopy}
            onRegenerate={onRegenerate}
          />
        ))}

        {/* Streaming message with F66 fade-in animation */}
        {isStreaming && streamingContent && (
          <div className="flex justify-start animate-message-in">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3 bg-[#1A1A1A] text-[#F5F5F5] border border-[#2A2A2A]">
              <div className="text-xs opacity-70 mb-1 font-medium">AI Assistant</div>
              <div className="text-sm whitespace-pre-wrap">{streamingContent}</div>
              <span className="inline-block w-1 h-4 bg-[#3B82F6] animate-pulse ml-1" />

              {/* Sources during streaming */}
              {streamingSources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                  <div className="text-xs font-semibold mb-2 opacity-70">Sources:</div>
                  <div className="space-y-2">
                    {streamingSources.map((source) => (
                      <SourceCitation key={source.id} source={source} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Typing indicator (waiting for first token) */}
        {isStreaming && !streamingContent && <TypingIndicator />}

        {/* Sources after streaming completes are now part of the saved message */}
        {/* Removed duplicate rendering - MessageBubble handles message.sources */}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
