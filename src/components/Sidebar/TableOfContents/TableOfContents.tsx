import React, { useMemo } from 'react';
import './TableOfContents.css';

interface Heading {
  id: string;
  level: number;
  text: string;
}

interface TableOfContentsProps {
  content: string;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ content }) => {
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
      <div className="table-of-contents-empty">
        <p>No headings found in the document.</p>
      </div>
    );
  }

  return (
    <div className="table-of-contents">
      <h3 className="toc-title">Table of Contents</h3>
      <nav className="toc-nav">
        <ul className="toc-list">
          {headings.map((heading, index) => (
            <li
              key={`${heading.id}-${index}`}
              className={`toc-item toc-level-${heading.level}`}
              style={{ paddingLeft: `${(heading.level - 1) * 1}rem` }}
            >
              <button
                className="toc-link"
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

export default TableOfContents;
