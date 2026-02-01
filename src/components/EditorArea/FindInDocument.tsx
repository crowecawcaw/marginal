import React, { useState, useEffect, useRef } from "react";
import "./FindInDocument.css";

interface FindInDocumentProps {
  content: string;
  viewMode: "rendered" | "code";
  onClose: () => void;
}

const FindInDocument: React.FC<FindInDocumentProps> = ({
  content,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Calculate matches when search query or content changes
  useEffect(() => {
    if (!searchQuery) {
      setTotalMatches(0);
      setCurrentIndex(0);
      return;
    }

    const text = caseSensitive ? content : content.toLowerCase();
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();

    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(query, pos)) !== -1) {
      count++;
      pos += query.length;
    }

    setTotalMatches(count);
    setCurrentIndex(count > 0 ? 1 : 0);
  }, [searchQuery, content, caseSensitive]);

  // For code view (textarea), we can use native browser find
  // For rendered view, we would need to implement Lexical-based highlighting
  // For now, this provides the UI - actual highlighting in Lexical would require
  // a custom Lexical plugin with decorators

  const handleNext = () => {
    if (totalMatches > 0) {
      setCurrentIndex((prev) => (prev % totalMatches) + 1);
    }
  };

  const handlePrevious = () => {
    if (totalMatches > 0) {
      setCurrentIndex((prev) => (prev - 1 <= 0 ? totalMatches : prev - 1));
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="find-in-document">
      <div className="find-input-group">
        <input
          ref={inputRef}
          type="text"
          className="find-input"
          placeholder="Find in document"
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <div className="find-match-count">
          {searchQuery &&
            (totalMatches > 0
              ? `${currentIndex} of ${totalMatches}`
              : "No matches")}
        </div>
      </div>
      <div className="find-controls">
        <button
          className="find-btn"
          onClick={handlePrevious}
          disabled={totalMatches === 0}
          title="Previous match"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          className="find-btn"
          onClick={handleNext}
          disabled={totalMatches === 0}
          title="Next match"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button
          className={`find-btn ${caseSensitive ? "active" : ""}`}
          onClick={() => setCaseSensitive(!caseSensitive)}
          title="Case sensitive"
        >
          Aa
        </button>
        <button
          className="find-btn find-close"
          onClick={onClose}
          title="Close (Esc)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FindInDocument;
