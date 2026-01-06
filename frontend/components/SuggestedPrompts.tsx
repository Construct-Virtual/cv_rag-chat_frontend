'use client';

import { cn } from '@/lib/utils';

interface SuggestedPromptsProps {
  prompts?: string[];
  onSelect: (prompt: string) => void;
  columns?: 1 | 2;
}

const DEFAULT_PROMPTS = [
  'What is the employee onboarding process?',
  'How do I request time off?',
  'What are the security protocols?',
  'Explain the expense reimbursement policy',
];

export function SuggestedPrompts({
  prompts = DEFAULT_PROMPTS,
  onSelect,
  columns = 1,
}: SuggestedPromptsProps) {
  return (
    <div
      className={cn(
        'grid gap-2',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
      )}
    >
      {prompts.map((prompt, index) => (
        <button
          key={index}
          onClick={() => onSelect(prompt)}
          className={cn(
            'text-left px-4 py-3 bg-[#1A1A1A] rounded-lg text-sm text-[#A1A1A1]',
            'border border-[#2A2A2A] hover:border-[#3B82F6]/50 hover:bg-[#2A2A2A] hover:text-[#F5F5F5]',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#0A0A0A]'
          )}
        >
          <div className="flex items-start gap-3">
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              className="flex-shrink-0 mt-0.5 text-[#3B82F6]"
            >
              <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{prompt}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
