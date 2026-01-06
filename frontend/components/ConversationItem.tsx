'use client';

import { useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (conversationId: string) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: ConversationItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // F89: Handle keyboard shortcuts for conversation actions
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(conversation.id);
    } else if (e.key === 'F2') {
      e.preventDefault();
      onRename(conversation);
    }
  };

  const showActions = isHovered || isFocused;

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => onSelect(conversation)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        className={cn(
          // Sidebar items: px-3 py-2, rounded-md, hover:bg-gray-800, text-gray-300 hover:text-white
          'w-full text-left px-3 py-2 rounded-md transition-colors duration-200 ease-in-out',
          // F90: Enhanced focus states
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
          isActive
            // Active: bg-gray-800 border-l-2 border-blue-500
            ? 'bg-gray-800 text-white border-l-2 border-l-blue-500'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        )}
        aria-current={isActive ? 'page' : undefined}
        aria-label={`${conversation.title}${conversation.is_shared ? ', shared' : ''}${isActive ? ', currently selected' : ''}`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-sm font-medium truncate pr-8 block">
            {conversation.title}
          </span>
          {conversation.last_message_at && (
            <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0">
              {formatRelativeTime(conversation.last_message_at)}
            </span>
          )}
        </div>

        {conversation.last_message_preview ? (
          <p className="text-xs text-gray-500 truncate pr-8">
            {conversation.last_message_preview}
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            {conversation.message_count}{' '}
            {conversation.message_count === 1 ? 'message' : 'messages'}
          </p>
        )}

        {/* Shared indicator */}
        {conversation.is_shared && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-400">
            <svg
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4m0 0L8 6m4-4v12" />
            </svg>
            Shared
          </div>
        )}
      </button>

      {/* Action buttons - F89: Show on hover OR focus for keyboard accessibility */}
      {showActions && (
        <div className="absolute right-2 top-2 flex gap-1 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRename(conversation);
            }}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Rename conversation (F2)"
            aria-label={`Rename ${conversation.title}`}
            type="button"
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M11 4L13 6L6 13H4V11L11 4Z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conversation.id);
            }}
            className="p-1.5 rounded hover:bg-red-500 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Delete conversation (Delete key)"
            aria-label={`Delete ${conversation.title}`}
            type="button"
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 6h10M7 6V4h2v2M5 6v8h6V6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
