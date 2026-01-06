'use client';

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface ChatInputProps {
  onSend: (message: string) => void;
  isDisabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
  maxLength?: number;
  initialValue?: string;
}

export function ChatInput({
  onSend,
  isDisabled = false,
  isSending = false,
  placeholder = 'Type your message...',
  maxLength = 4000,
  initialValue = '',
}: ChatInputProps) {
  const [message, setMessage] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Update message when initialValue changes (for suggested prompts)
  useEffect(() => {
    if (initialValue) {
      setMessage(initialValue);
      inputRef.current?.focus();
    }
  }, [initialValue]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || isDisabled || isSending) {
      return;
    }

    onSend(trimmedMessage);
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isOverLimit = message.length > maxLength;
  const showCounter = message.length > maxLength * 0.8;

  const textareaId = 'chat-message-input';
  const counterId = 'character-counter';
  const helperId = 'input-helper';

  return (
    <div className="border-t border-[#2A2A2A] bg-[#1A1A1A] p-4">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex gap-2" role="form" aria-label="Send message">
          <div className="relative flex-1">
            <label htmlFor={textareaId} className="sr-only">
              Message input
            </label>
            <textarea
              ref={inputRef}
              id={textareaId}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isDisabled || isSending}
              rows={1}
              className={cn(
                'w-full px-4 py-3 bg-[#2A2A2A] border rounded-lg text-[#F5F5F5] placeholder-[#737373] resize-none',
                'transition-colors duration-200',
                // F90: Enhanced focus states
                'focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isOverLimit ? 'border-[#EF4444]' : 'border-[#2A2A2A]'
              )}
              style={{
                minHeight: '48px',
                maxHeight: '200px',
              }}
              aria-label="Type your message"
              aria-describedby={`${helperId}${showCounter ? ` ${counterId}` : ''}`}
              aria-invalid={isOverLimit}
            />

            {/* Character counter */}
            {showCounter && (
              <div
                id={counterId}
                className={cn(
                  'absolute right-3 bottom-2 text-xs',
                  isOverLimit ? 'text-[#EF4444]' : 'text-[#737373]'
                )}
                aria-live="polite"
                aria-atomic="true"
              >
                {message.length}/{maxLength}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isDisabled || isSending || !message.trim() || isOverLimit}
            isLoading={isSending}
            className="shrink-0"
            aria-label={isSending ? 'Sending message' : 'Send message'}
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </form>

        {/* Helper text */}
        <p id={helperId} className="text-xs text-[#737373] mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
