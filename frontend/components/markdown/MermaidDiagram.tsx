'use client';

import { memo, useState, useEffect, useRef, useId } from 'react';

interface MermaidDiagramProps {
  chart: string; // The Mermaid diagram definition
}

type RenderState =
  | { status: 'loading' }
  | { status: 'success'; svg: string }
  | { status: 'error'; message: string };

/**
 * MermaidDiagram component for rendering Mermaid diagrams with lazy loading.
 * Supports flowcharts, sequence diagrams, class diagrams, etc.
 * Lazy loads the Mermaid library (~1.2MB) on first render.
 */
export const MermaidDiagram = memo(function MermaidDiagram({
  chart,
}: MermaidDiagramProps) {
  const [renderState, setRenderState] = useState<RenderState>({ status: 'loading' });
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();
  // Create a valid DOM id by replacing colons with hyphens
  const diagramId = `mermaid-diagram-${uniqueId.replace(/:/g, '-')}`;

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      try {
        // Lazy load the mermaid library
        const mermaid = (await import('mermaid')).default;

        // Initialize mermaid with dark theme configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            // Dark theme colors matching the codebase style
            primaryColor: '#238636',
            primaryTextColor: '#E6EDF3',
            primaryBorderColor: '#30363D',
            secondaryColor: '#161B22',
            secondaryTextColor: '#8B949E',
            secondaryBorderColor: '#30363D',
            tertiaryColor: '#0D1117',
            tertiaryTextColor: '#E6EDF3',
            tertiaryBorderColor: '#30363D',
            lineColor: '#8B949E',
            textColor: '#E6EDF3',
            mainBkg: '#0D1117',
            nodeBorder: '#30363D',
            clusterBkg: '#161B22',
            clusterBorder: '#30363D',
            defaultLinkColor: '#8B949E',
            titleColor: '#E6EDF3',
            edgeLabelBackground: '#161B22',
            nodeTextColor: '#E6EDF3',
          },
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
          },
          securityLevel: 'strict',
        });

        // Render the diagram
        const { svg } = await mermaid.render(diagramId, chart.trim());

        if (isMounted) {
          setRenderState({ status: 'success', svg });
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to render diagram';
          console.error('Mermaid rendering error:', error);
          setRenderState({ status: 'error', message: errorMessage });
        }
      }
    };

    setRenderState({ status: 'loading' });
    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart, diagramId]);

  // Loading state
  if (renderState.status === 'loading') {
    return (
      <div className="my-3 p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
        <div className="flex items-center justify-center gap-2 text-[var(--color-text-secondary)]">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">Loading diagram...</span>
        </div>
      </div>
    );
  }

  // Error state - show raw chart text in code block style
  if (renderState.status === 'error') {
    return (
      <div className="my-3 rounded-lg overflow-hidden bg-[#0D1117] border border-[#30363D]">
        {/* Error header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#161B22] border-b border-[#30363D]">
          <span className="text-xs text-[#f85149] font-mono flex items-center gap-2">
            <svg
              width="14"
              height="14"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zM8 6.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 6.5z" />
            </svg>
            Diagram Error
          </span>
        </div>
        {/* Error message */}
        <div className="px-4 py-2 text-xs text-[#f85149] bg-[#161B22] border-b border-[#30363D]">
          {renderState.message}
        </div>
        {/* Raw chart content */}
        <div className="p-4 overflow-x-auto">
          <pre className="text-sm font-mono text-[#E6EDF3] whitespace-pre-wrap">
            <code>{chart}</code>
          </pre>
        </div>
      </div>
    );
  }

  // Success state - render the SVG
  return (
    <div
      ref={containerRef}
      className="my-3 p-4 rounded-lg bg-[#0D1117] border border-[#30363D] overflow-x-auto mermaid-diagram"
    >
      <div
        className="flex justify-center [&>svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: renderState.svg }}
      />
    </div>
  );
});

export default MermaidDiagram;
