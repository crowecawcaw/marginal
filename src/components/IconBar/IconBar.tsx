import React from "react";
import { useUIStore } from "../../stores/uiStore";
import { emit } from "../../platform/eventAdapter";
import { SidebarView } from "../../types";
import "./IconBar.css";

const IconBar: React.FC = () => {
  const { currentSidebarView, setSidebarView, sidebarVisible, toggleSidebar } =
    useUIStore();

  const handleViewClick = (view: SidebarView) => {
    if (currentSidebarView === view && sidebarVisible) {
      toggleSidebar();
    } else {
      setSidebarView(view);
      if (!sidebarVisible) {
        toggleSidebar();
      }
    }
  };

  return (
    <div className="icon-bar">
      <button
        className={`icon-button ${currentSidebarView === "files" && sidebarVisible ? "active" : ""}`}
        onClick={() => handleViewClick("files")}
        title="Files"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </button>
      <button
        className={`icon-button ${currentSidebarView === "outline" && sidebarVisible ? "active" : ""}`}
        onClick={() => handleViewClick("outline")}
        title="Outline"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="14" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
      <div className="icon-bar-spacer" />
      <button
        className="icon-button"
        onClick={() => emit("menu:settings")}
        title="Settings"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
    </div>
  );
};

export default IconBar;
