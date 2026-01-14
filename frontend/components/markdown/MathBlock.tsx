'use client';

import { memo, useMemo } from 'react';
import katex from 'katex';

interface MathBlockProps {
  math: string;      // The LaTeX expression
  display?: boolean; // true for block ($$), false for inline ($)
}

/**
 * MathBlock component for rendering LaTeX math expressions using KaTeX.
 * Supports both inline and block (display) math modes.
 */
export const MathBlock = memo(function MathBlock({
  math,
  display = false,
}: MathBlockProps) {
  const renderedMath = useMemo(() => {
    try {
      const html = katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
        errorColor: 'var(--color-error, #EF4444)',
        strict: false,
        trust: false,
        output: 'html',
      });
      return { html, error: false };
    } catch (error) {
      console.error('KaTeX rendering error:', error);
      return { html: null, error: true };
    }
  }, [math, display]);

  // Show raw text on error
  if (renderedMath.error || !renderedMath.html) {
    if (display) {
      return (
        <div className="my-3 p-4 rounded-lg bg-[#0D1117] border border-[#30363D] text-center">
          <code className="text-sm font-mono text-[#E6EDF3]">{math}</code>
        </div>
      );
    }
    return <code className="text-sm font-mono text-[#E6EDF3]">{math}</code>;
  }

  // Block math (display mode)
  if (display) {
    return (
      <div
        className="my-3 p-4 rounded-lg bg-[#0D1117] border border-[#30363D] overflow-x-auto text-center katex-block"
        dangerouslySetInnerHTML={{ __html: renderedMath.html }}
      />
    );
  }

  // Inline math
  return (
    <span
      className="katex-inline mx-1"
      dangerouslySetInnerHTML={{ __html: renderedMath.html }}
    />
  );
});

export default MathBlock;
