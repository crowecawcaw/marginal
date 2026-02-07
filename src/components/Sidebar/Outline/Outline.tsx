import React, { useMemo } from "react";
import "./Outline.css";

interface Heading {
  id: string;
  level: number;
  text: string;
}

interface OutlineProps {
  content: string;
}

const Outline: React.FC<OutlineProps> = ({ content }) => {
  const headings = useMemo(() => {
    if (!content) return [];

    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const matches: Heading[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      matches.push({ id, level, text });
    }

    return matches;
  }, [content]);

  const handleClick = (text: string) => {
    // Find the heading in the editor by its text content
    const headingElements = document.querySelectorAll(
      '.editor-heading-h1, .editor-heading-h2, .editor-heading-h3, .editor-heading-h4, .editor-heading-h5, .editor-heading-h6'
    );

    for (const element of headingElements) {
      if (element.textContent?.trim() === text) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  };

  if (headings.length === 0) {
    return (
      <div className="outline-empty">
        <p>No headings found in the document.</p>
      </div>
    );
  }

  return (
    <div className="outline">
      <nav className="outline-nav">
        <ul className="outline-list">
          {headings.map((heading, index) => (
            <li
              key={`${heading.id}-${index}`}
              className={`outline-item outline-level-${heading.level}`}
              style={{ '--heading-level': heading.level - 1 } as React.CSSProperties}
            >
              <button
                className="outline-link"
                onClick={() => handleClick(heading.text)}
                title={heading.text}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Outline;
