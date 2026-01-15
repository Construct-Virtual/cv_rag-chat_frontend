'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Source } from '@/types';

interface SourceCitationProps {
  source: Source;
  compact?: boolean;
}

export function SourceCitation({ source, compact = false }: SourceCitationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const citationId = `source-${source.id}`;
  const excerptId = `excerpt-${source.id}`;

  if (compact) {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        // Source citation chip: inline-flex items-center gap-1, bg-gray-700 text-gray-300, text-xs rounded-full, px-2 py-1 mt-2
        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-full text-xs text-gray-300 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={source.display_name}
        aria-label={`Source ${source.number}: ${source.display_name}`}
        type="button"
      >
        <span className="text-blue-400 font-medium" aria-hidden="true">[{source.number}]</span>
        <span className="truncate max-w-25">{source.display_name}</span>
      </button>
    );
  }

  return (
    <div
      className="text-xs bg-gray-900 rounded-lg border border-gray-800 overflow-hidden"
      role="region"
      aria-labelledby={citationId}
    >
      <button
        id={citationId}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-2 hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        aria-expanded={isExpanded}
        aria-controls={excerptId}
        type="button"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-medium text-blue-400">
              [{source.number}] {source.display_name}
            </span>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {source.category}
              {source.page_number && ` - Page ${source.page_number}`}
            </div>
          </div>
          <svg
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            className={cn(
              'shrink-0 transition-transform duration-200 text-gray-500',
              isExpanded ? 'rotate-180' : ''
            )}
            aria-hidden="true"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable excerpt */}
      <div
        id={excerptId}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        )}
        role="region"
        aria-hidden={!isExpanded}
      >
        <div className="px-2 pb-2 pt-1 border-t border-gray-800">
          <p className="text-gray-300 italic leading-relaxed">
            &quot;{source.excerpt}&quot;
          </p>
          {source.file_url && (
            <a
              href={source.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-blue-400 hover:text-blue-300 hover:underline text-xs font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              View Document
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
