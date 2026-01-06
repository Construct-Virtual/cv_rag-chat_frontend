'use client';

import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Input } from './Input';
import { ConversationItem } from './ConversationItem';
import { ConversationListSkeleton } from './Skeleton';
import { groupByTimePeriod } from '@/lib/utils';
import type { Conversation } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  conversations: Conversation[];
  currentConversationId: string | null;
  searchQuery: string;
  isLoading?: boolean;
  isCreating?: boolean;
  onSearchChange: (query: string) => void;
  onNewChat: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onRenameConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function Sidebar({
  isOpen,
  conversations,
  currentConversationId,
  searchQuery,
  isLoading = false,
  isCreating = false,
  onSearchChange,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
}: SidebarProps) {
  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by time period
  const groupedConversations = groupByTimePeriod(filteredConversations, 'updated_at');

  return (
    <aside
      className={cn(
        // F65: Sidebar with smooth collapse/expand animation (duration-200 ease-in-out)
        'shrink-0 border-r border-gray-800 bg-background-secondary overflow-hidden',
        'transition-[width,opacity] duration-200 ease-in-out',
        isOpen ? 'w-sidebar opacity-100' : 'w-0 opacity-0'
      )}
      role="navigation"
      aria-label="Conversation navigation"
      aria-hidden={!isOpen}
    >
      <div className="h-full flex flex-col p-4">
        {/* Search */}
        <div className="relative mb-4" role="search">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M12 12l4 4" />
          </svg>
          <input
            type="search"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            aria-label="Search conversations"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Clear search"
              type="button"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <Button
          onClick={onNewChat}
          disabled={isCreating}
          isLoading={isCreating}
          className="w-full mb-4"
        >
          {isCreating ? 'Creating...' : '+ New Chat'}
        </Button>

        {/* Conversation List */}
        <div
          className="flex-1 overflow-y-auto -mx-2 px-2"
          role="region"
          aria-label="Conversation list"
        >
          {isLoading ? (
            <ConversationListSkeleton count={5} />
          ) : filteredConversations.length === 0 ? (
            <EmptyState hasSearch={!!searchQuery} />
          ) : (
            <ul className="space-y-4" role="list" aria-label="Conversations">
              {groupedConversations.map(({ period, items }) => (
                <li key={period} role="group" aria-labelledby={`period-${period.replace(/\s+/g, '-').toLowerCase()}`}>
                  <h3
                    id={`period-${period.replace(/\s+/g, '-').toLowerCase()}`}
                    className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1"
                  >
                    {period}
                  </h3>
                  <ul className="space-y-1" role="list">
                    {items.map((conv) => (
                      <li key={conv.id}>
                        <ConversationItem
                          conversation={conv}
                          isActive={conv.id === currentConversationId}
                          onSelect={onSelectConversation}
                          onRename={onRenameConversation}
                          onDelete={onDeleteConversation}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="text-center text-gray-500 text-sm py-8">
      {hasSearch ? (
        <>
          No conversations match your search.
          <br />
          Try a different search term.
        </>
      ) : (
        <>
          No conversations yet.
          <br />
          Click &quot;+ New Chat&quot; to start.
        </>
      )}
    </div>
  );
}
