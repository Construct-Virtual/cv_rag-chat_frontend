'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Options as RehypeKatexOptions } from 'rehype-katex';
import { CodeBlock } from './markdown/CodeBlock';
import { processMarkdown, processStreamingMarkdown } from '../app/utils/markdown-processor';

// Configure rehype-katex options
// Note: rehype-katex handles displayMode and throwOnError internally
const rehypeKatexOptions: RehypeKatexOptions = {
  // Color for error messages
  errorColor: '#ff6b6b',
  // Allow all LaTeX commands (needed for complex formulas)
  strict: false,
  // Trust the input (since we control it)
  trust: true,
  // Output mode
  output: 'html',
};

interface MarkdownProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

// Inline code component - uses CSS variables for theme-aware styling
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 mx-0.5 rounded bg-[var(--color-code-inline-bg)] text-[var(--color-code-inline-text)] text-sm font-mono">
      {children}
    </code>
  );
}

export const Markdown = memo(function Markdown({ content, className = '', isStreaming = false }: MarkdownProps) {
  // Process markdown to fix formatting issues from LLM output
  const processedContent = useMemo(() => {
    if (isStreaming) {
      // Use lighter processing during streaming to avoid breaking partial content
      return processStreamingMarkdown(content);
    }
    // Full processing for complete content
    return processMarkdown(content);
  }, [content, isStreaming]);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, rehypeKatexOptions]]}
      components={{
        // Code blocks and inline code
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');

          // Check if this is a code block (has language class or is multi-line)
          const isCodeBlock = match || codeString.includes('\n');

          if (isCodeBlock) {
            return <CodeBlock language={match?.[1] || ''} code={codeString} isStreaming={isStreaming} />;
          }

          return <InlineCode {...props}>{children}</InlineCode>;
        },
        // Paragraph styling - mb-4 for adequate spacing between paragraphs
        p({ children }) {
          return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
        },
        // Headers - standardized spacing for consistent vertical rhythm
        // h1: mt-6 mb-4, h2: mt-5 mb-3, h3: mt-4 mb-2, h4-h6: mt-3 mb-2
        h1({ children }) {
          return <h1 className="block text-xl font-bold mt-6 mb-4 first:mt-0">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="block text-lg font-semibold mt-5 mb-3 first:mt-0">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="block text-base font-semibold mt-4 mb-2 first:mt-0">{children}</h3>;
        },
        h4({ children }) {
          return <h4 className="block text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h4>;
        },
        h5({ children }) {
          return <h5 className="block text-sm font-semibold mt-3 mb-2 first:mt-0">{children}</h5>;
        },
        h6({ children }) {
          return <h6 className="block text-sm font-semibold mt-3 mb-2 first:mt-0">{children}</h6>;
        },
        // Lists - use list-outside with left padding for proper text alignment on wrap
        ul({ children }) {
          return <ul className="list-disc list-outside pl-5 mb-3 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-outside pl-5 mb-3 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        // Blockquote
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-[var(--color-blockquote-border)] bg-[var(--color-blockquote-bg)] pl-4 py-2 my-3 text-[var(--color-blockquote-text)] italic">
              {children}
            </blockquote>
          );
        },
        // Links
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3B82F6] hover:text-[#60A5FA] underline decoration-1 decoration-from-font"
            >
              {children}
            </a>
          );
        },
        // Horizontal rule
        hr() {
          return <hr className="my-4 border-[var(--color-border)]" />;
        },
        // Tables (GFM)
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4 rounded-lg border border-[var(--color-border)]">
              <table className="min-w-full border-collapse">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-[var(--color-bg-tertiary)]">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-[var(--color-border)]">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">{children}</tr>;
        },
        th({ children }) {
          return (
            <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border)] break-words">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)] break-words">
              {children}
            </td>
          );
        },
        // Strong and emphasis
        strong({ children }) {
          return <strong className="font-bold">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
        // Strikethrough (GFM)
        del({ children }) {
          return <del className="line-through text-[var(--color-text-muted)]">{children}</del>;
        },
      }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});
