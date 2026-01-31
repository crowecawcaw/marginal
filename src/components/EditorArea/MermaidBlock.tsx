import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import './MermaidBlock.css';

interface MermaidBlockProps {
  code: string;
  language?: string;
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'system-ui, -apple-system, sans-serif',
});

const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, language }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string>(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !code.trim()) {
        return;
      }

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';

        // Render the mermaid diagram
        const { svg } = await mermaid.render(idRef.current, code);
        containerRef.current.innerHTML = svg;
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        containerRef.current.innerHTML = `
          <div class="mermaid-error">
            <p>Error rendering diagram:</p>
            <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
          </div>
        `;
      }
    };

    renderDiagram();
  }, [code]);

  // If language is specified and it's not mermaid, render as code
  if (language && language !== 'mermaid') {
    return null;
  }

  return (
    <div className="mermaid-block">
      <div ref={containerRef} className="mermaid-container" />
    </div>
  );
};

export default MermaidBlock;
