'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { codeToHtml } from 'shiki';

interface CodeBlockProps {
  language: string;
  code: string;
  isStreaming?: boolean;
}

// Streaming throttle delay in milliseconds
const STREAMING_THROTTLE_MS = 200;

/**
 * CodeBlock component with Shiki syntax highlighting.
 * Supports streaming mode with throttled highlighting for better performance.
 */
export const CodeBlock = memo(function CodeBlock({
  language,
  code,
  isStreaming = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [isHighlighting, setIsHighlighting] = useState(false);

  // Refs for throttling during streaming
  const lastHighlightTimeRef = useRef<number>(0);
  const pendingHighlightRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCodeRef = useRef<string>(code);

  // Always keep latest code reference updated
  latestCodeRef.current = code;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy code');
    }
  }, [code]);

  /**
   * Performs syntax highlighting using Shiki.
   * Returns the highlighted HTML or null on failure.
   */
  const highlightCode = useCallback(async (codeToHighlight: string): Promise<string | null> => {
    try {
      const html = await codeToHtml(codeToHighlight, {
        lang: language || 'text',
        theme: 'github-dark',
      });
      return html;
    } catch (error) {
      // Language might not be supported, try with 'text' as fallback
      try {
        const html = await codeToHtml(codeToHighlight, {
          lang: 'text',
          theme: 'github-dark',
        });
        return html;
      } catch {
        console.error('Shiki highlighting failed:', error);
        return null;
      }
    }
  }, [language]);

  /**
   * Schedules a highlight with throttling during streaming.
   */
  const scheduleHighlight = useCallback(() => {
    const now = Date.now();
    const timeSinceLastHighlight = now - lastHighlightTimeRef.current;

    // Clear any pending highlight
    if (pendingHighlightRef.current) {
      clearTimeout(pendingHighlightRef.current);
      pendingHighlightRef.current = null;
    }

    const runHighlight = async () => {
      setIsHighlighting(true);
      lastHighlightTimeRef.current = Date.now();

      const html = await highlightCode(latestCodeRef.current);

      // Only update if this is still the latest code
      if (latestCodeRef.current === latestCodeRef.current) {
        setHighlightedHtml(html);
      }
      setIsHighlighting(false);
    };

    if (isStreaming) {
      // During streaming, throttle highlights
      if (timeSinceLastHighlight >= STREAMING_THROTTLE_MS) {
        // Enough time has passed, highlight immediately
        runHighlight();
      } else {
        // Schedule highlight after remaining throttle time
        const delay = STREAMING_THROTTLE_MS - timeSinceLastHighlight;
        pendingHighlightRef.current = setTimeout(runHighlight, delay);
      }
    } else {
      // Not streaming, highlight immediately
      runHighlight();
    }
  }, [isStreaming, highlightCode]);

  // Effect to trigger highlighting when code or language changes
  useEffect(() => {
    scheduleHighlight();

    // Cleanup pending highlight on unmount
    return () => {
      if (pendingHighlightRef.current) {
        clearTimeout(pendingHighlightRef.current);
      }
    };
  }, [code, language, scheduleHighlight]);

  // When streaming ends, do a final highlight to ensure we have the latest
  useEffect(() => {
    if (!isStreaming && code) {
      // Small delay to ensure streaming has truly ended
      const timeoutId = setTimeout(() => {
        highlightCode(code).then((html) => {
          if (html) {
            setHighlightedHtml(html);
          }
        });
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [isStreaming, code, highlightCode]);

  // Normalize the language display name
  const displayLanguage = language || 'code';

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden bg-[#0D1117] border border-[#30363D]">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161B22] border-b border-[#30363D]">
        <span className="text-xs text-[var(--color-text-muted)] font-mono flex items-center gap-2">
          {displayLanguage}
          {isHighlighting && isStreaming && (
            <span className="inline-block w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full animate-pulse" />
          )}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#8B949E] hover:text-white bg-transparent hover:bg-[#30363D] rounded transition-colors duration-200"
          title={copied ? 'Copied!' : 'Copy code'}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <div className="p-4 overflow-x-auto">
        {highlightedHtml ? (
          <div
            className="shiki-code text-sm font-mono overflow-x-auto [&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0 [&>pre]:overflow-x-auto [&>pre]:whitespace-pre [&_code]:!bg-transparent [&_code]:whitespace-pre"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          // Fallback while highlighting or on failure
          <pre className="text-sm font-mono text-[#E6EDF3] overflow-x-auto whitespace-pre">
            <code className="whitespace-pre">{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
});

export default CodeBlock;
