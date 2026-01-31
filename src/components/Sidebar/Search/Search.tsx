import React, { useState, useMemo } from 'react';
import { useEditorStore } from '../../../stores/editorStore';
import { useFileSystem } from '../../../hooks/useFileSystem';
import './Search.css';

interface SearchMatch {
  tabId: string;
  filePath: string;
  fileName: string;
  line: number;
  lineContent: string;
  matchIndex: number;
}

const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const { tabs } = useEditorStore();
  const { openFile } = useFileSystem();

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const results: SearchMatch[] = [];
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();

    tabs.forEach((tab) => {
      const lines = tab.content.split('\n');

      lines.forEach((line, index) => {
        const searchLine = caseSensitive ? line : line.toLowerCase();
        if (searchLine.includes(query)) {
          results.push({
            tabId: tab.id,
            filePath: tab.filePath,
            fileName: tab.fileName,
            line: index + 1,
            lineContent: line.trim(),
            matchIndex: searchLine.indexOf(query),
          });
        }
      });
    });

    return results;
  }, [searchQuery, caseSensitive, tabs]);

  const handleResultClick = async (filePath: string, line: number) => {
    try {
      await openFile(filePath);
      // In a full implementation, we would scroll to the specific line
      console.log('Navigate to line:', line);
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const highlightMatch = (text: string, query: string, caseSensitive: boolean) => {
    if (!query) return text;

    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    const index = searchText.indexOf(searchQuery);

    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return (
      <>
        {before}
        <mark className="search-highlight">{match}</mark>
        {after}
      </>
    );
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <input
          type="text"
          className="search-input"
          placeholder="Search in files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        <label className="search-option">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          <span>Case sensitive</span>
        </label>
      </div>

      <div className="search-results">
        {!searchQuery.trim() ? (
          <div className="search-empty">
            <p>Enter a search term to find matches across open files.</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="search-empty">
            <p>No results found for "{searchQuery}"</p>
          </div>
        ) : (
          <>
            <div className="search-count">
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
            </div>
            <div className="search-list">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.tabId}-${result.line}-${index}`}
                  className="search-result-item"
                  onClick={() => handleResultClick(result.filePath, result.line)}
                >
                  <div className="search-result-file">
                    <span className="search-result-filename">{result.fileName}</span>
                    <span className="search-result-line">Line {result.line}</span>
                  </div>
                  <div className="search-result-content">
                    {highlightMatch(result.lineContent, searchQuery, caseSensitive)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Search;
