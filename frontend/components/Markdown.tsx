'use client';

import { useState, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface MarkdownProps {
  content: string;
  className?: string;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy code');
    }
  }, [code]);

  // Highlight the code
  let highlightedCode: string;
  try {
    if (language && hljs.getLanguage(language)) {
      highlightedCode = hljs.highlight(code, { language }).value;
    } else {
      highlightedCode = hljs.highlightAuto(code).value;
    }
  } catch {
    highlightedCode = code;
  }

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden bg-[#0D1117] border border-[#30363D]">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161B22] border-b border-[#30363D]">
        <span className="text-xs text-[#8B949E] font-mono">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#8B949E] hover:text-white bg-transparent hover:bg-[#30363D] rounded transition-colors duration-200"
          title={copied ? 'Copied!' : 'Copy code'}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre className="p-4 overflow-x-auto">
        <code
          className={`hljs language-${language || 'plaintext'} text-sm font-mono`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  );
}

// Inline code component
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 mx-0.5 rounded bg-[#30363D] text-[#E6EDF3] text-sm font-mono">
      {children}
    </code>
  );
}

export const Markdown = memo(function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
      components={{
        // Code blocks and inline code
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');

          // Check if this is a code block (has language class or is multi-line)
          const isCodeBlock = match || codeString.includes('\n');

          if (isCodeBlock) {
            return <CodeBlock language={match?.[1] || ''} code={codeString} />;
          }

          return <InlineCode {...props}>{children}</InlineCode>;
        },
        // Paragraph styling
        p({ children }) {
          return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
        },
        // Headers
        h1({ children }) {
          return <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>;
        },
        // Lists
        ul({ children }) {
          return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        // Blockquote
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-[#3B82F6] pl-4 py-1 my-3 text-[#A3A3A3] italic">
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
              className="text-[#3B82F6] hover:text-[#60A5FA] underline underline-offset-2"
            >
              {children}
            </a>
          );
        },
        // Horizontal rule
        hr() {
          return <hr className="my-4 border-[#2A2A2A]" />;
        },
        // Tables (GFM)
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-[#30363D]">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-[#161B22]">{children}</thead>;
        },
        th({ children }) {
          return (
            <th className="px-4 py-2 text-left text-sm font-semibold border border-[#30363D]">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="px-4 py-2 text-sm border border-[#30363D]">
              {children}
            </td>
          );
        },
        // Strong and emphasis
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
