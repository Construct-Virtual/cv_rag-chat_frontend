'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'No content',
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {icon && (
        <div className="w-16 h-16 mb-6 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#737373]">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-[#F5F5F5] mb-2">{title}</h3>
      {description && (
        <p className="text-[#A1A1A1] max-w-md mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}

// Chat-specific empty state
interface ChatEmptyStateProps {
  onPromptClick?: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  'What is the employee onboarding process?',
  'How do I request time off?',
  'What are the security protocols?',
  'Explain the expense reimbursement policy',
];

export function ChatEmptyState({ onPromptClick }: ChatEmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
          <svg
            width="32"
            height="32"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-[#F5F5F5] mb-4">
          Start a new conversation
        </h3>
        <p className="text-[#A1A1A1] mb-6">
          Ask questions about company SOPs and get instant answers from our AI assistant.
        </p>

        <div className="space-y-2">
          <p className="text-sm text-[#737373] mb-2">Suggested prompts:</p>
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPromptClick?.(prompt)}
              className={cn(
                'w-full text-left px-4 py-3 bg-[#1A1A1A] rounded-lg text-sm text-[#A1A1A1]',
                'border border-[#2A2A2A] hover:border-[#3A3A3A] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]',
                'transition-colors duration-200'
              )}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Welcome state when no conversation is selected
interface WelcomeStateProps {
  onNewChat?: () => void;
  isLoading?: boolean;
}

export function WelcomeState({ onNewChat, isLoading }: WelcomeStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
          <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-[#F5F5F5] mb-4">
          Welcome to SOP AI Agent
        </h2>
        <p className="text-[#A1A1A1] mb-6">
          Select a conversation from the sidebar or create a new one to get started.
        </p>
        {onNewChat && (
          <button
            onClick={onNewChat}
            disabled={isLoading}
            className={cn(
              'px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg font-medium',
              'transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? 'Creating...' : 'Start New Chat'}
          </button>
        )}
      </div>
    </div>
  );
}
