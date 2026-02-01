import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "../../stores/editorStore";
import "./Titlebar.css";

interface TitlebarProps {
  onNewFile: () => void;
  onOpenFile: () => void;
  onSave: () => void;
}

const Titlebar: React.FC<TitlebarProps> = ({ onNewFile, onOpenFile, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { tabs, activeTabId } = useEditorStore();

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const title = activeTab?.fileName || "marginal";
  const isDirty = activeTab?.isDirty || false;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="titlebar" data-tauri-drag-region>
      {/* Spacer for traffic lights on macOS */}
      <div className="titlebar-spacer" data-tauri-drag-region />

      {/* Center: Title dropdown */}
      <div className="titlebar-center" ref={dropdownRef}>
        <button
          className={`titlebar-title ${isOpen ? "active" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="titlebar-title-text">
            {isDirty && <span className="titlebar-dirty">●</span>}
            {title}
          </span>
          <svg
            className={`titlebar-chevron ${isOpen ? "open" : ""}`}
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="titlebar-dropdown">
            <button
              className="titlebar-dropdown-item"
              onClick={() => handleMenuItemClick(onNewFile)}
            >
              <span className="titlebar-dropdown-label">New File</span>
              <span className="titlebar-dropdown-shortcut">⌘N</span>
            </button>
            <button
              className="titlebar-dropdown-item"
              onClick={() => handleMenuItemClick(onOpenFile)}
            >
              <span className="titlebar-dropdown-label">Open File...</span>
              <span className="titlebar-dropdown-shortcut">⌘O</span>
            </button>
            <button
              className="titlebar-dropdown-item"
              onClick={() => handleMenuItemClick(onSave)}
            >
              <span className="titlebar-dropdown-label">Save</span>
              <span className="titlebar-dropdown-shortcut">⌘S</span>
            </button>
            <div className="titlebar-dropdown-separator" />
            {activeTab?.filePath && (
              <div className="titlebar-dropdown-path">
                {activeTab.filePath}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacer for symmetry */}
      <div className="titlebar-spacer" data-tauri-drag-region />
    </div>
  );
};

export default Titlebar;
