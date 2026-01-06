'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/utils';
import { SourceCitation } from './SourceCitation';
import { Markdown } from './Markdown';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isLastAssistantMessage?: boolean;
  isStreaming?: boolean;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isLastAssistantMessage = false,
  isStreaming = false,
  onCopy,
  onRegenerate,
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex',
        isUser ? 'justify-end' : 'justify-start',
        // F66: Message fade-in animation when new messages appear
        'animate-message-in'
      )}
      onMouseEnter={() => {
        setIsHovered(true);
        setShowTimestamp(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowTimestamp(false);
      }}
    >
      <div
        className={cn(
          // Base message bubble: max-width 80%, rounded corners, padding
          'relative max-w-[80%] px-4 py-3',
          isUser
            // User message: ml-auto, bg-blue-600 text-white, rounded-2xl rounded-tr-sm (speech bubble effect)
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
            // Assistant message: mr-auto, bg-gray-800 text-gray-100, rounded-2xl rounded-tl-sm
            : 'bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm'
        )}
      >
        {/* Role label */}
        <div className="text-xs opacity-70 mb-1 font-medium">
          {isUser ? 'You' : 'AI Assistant'}
        </div>

        {/* Message content - use Markdown for assistant, plain text for user */}
        <div className="text-sm wrap-break-word">
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <Markdown content={message.content} />
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-xs font-semibold mb-2 opacity-70">Sources:</div>
            <div className="space-y-2">
              {message.sources.map((source) => (
                <SourceCitation key={source.id} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp on hover */}
        {showTimestamp && (
          <div
            className={cn(
              'absolute text-[10px] text-[#737373] whitespace-nowrap',
              isUser ? '-left-16' : '-right-16',
              'top-1/2 -translate-y-1/2'
            )}
          >
            {formatTime(message.created_at)}
          </div>
        )}

        {/* Action buttons */}
        {isHovered && !isStreaming && (
          <div className="absolute top-2 right-2 flex gap-1">
            {/* Regenerate button (only for last assistant message) */}
            {!isUser && isLastAssistantMessage && onRegenerate && (
              <button
                onClick={() => onRegenerate(message.id)}
                className="p-1.5 rounded hover:bg-[#2A2A2A] transition-colors duration-200"
                title="Regenerate response"
                aria-label="Regenerate response"
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}

            {/* Copy button */}
            {onCopy && (
              <button
                onClick={() => onCopy(message.content)}
                className={cn(
                  'p-1.5 rounded transition-colors duration-200',
                  isUser ? 'hover:bg-white/20' : 'hover:bg-[#2A2A2A]'
                )}
                title="Copy to clipboard"
                aria-label="Copy to clipboard"
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
