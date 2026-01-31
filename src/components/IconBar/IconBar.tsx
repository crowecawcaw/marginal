import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { SidebarView } from '../../types';
import './IconBar.css';

const IconBar: React.FC = () => {
  const { currentSidebarView, setSidebarView, sidebarVisible, toggleSidebar } = useUIStore();

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
        className={`icon-button ${currentSidebarView === 'files' && sidebarVisible ? 'active' : ''}`}
        onClick={() => handleViewClick('files')}
        title="Files"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </button>
      <button
        className={`icon-button ${currentSidebarView === 'search' && sidebarVisible ? 'active' : ''}`}
        onClick={() => handleViewClick('search')}
        title="Search"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </button>
      <button
        className={`icon-button ${currentSidebarView === 'toc' && sidebarVisible ? 'active' : ''}`}
        onClick={() => handleViewClick('toc')}
        title="Table of Contents"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default IconBar;
