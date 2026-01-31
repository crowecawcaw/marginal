import React, { useMemo } from 'react';
import './Outline.css';

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
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      matches.push({ id, level, text });
    }

    return matches;
  }, [content]);

  const handleClick = (id: string) => {
    // In a full implementation, this would scroll to the heading
    // For now, we'll just log the click
    console.log('Navigate to heading:', id);
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
      <h3 className="outline-title">Outline</h3>
      <nav className="outline-nav">
        <ul className="outline-list">
          {headings.map((heading, index) => (
            <li
              key={`${heading.id}-${index}`}
              className={`outline-item outline-level-${heading.level}`}
              style={{ paddingLeft: `${(heading.level - 1) * 1}rem` }}
            >
              <button
                className="outline-link"
                onClick={() => handleClick(heading.id)}
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
