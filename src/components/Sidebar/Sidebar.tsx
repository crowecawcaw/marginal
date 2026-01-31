import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const { sidebarVisible, currentSidebarView, sidebarWidth } = useUIStore();

  if (!sidebarVisible) return null;

  const renderContent = () => {
    switch (currentSidebarView) {
      case 'files':
        return (
          <div className="sidebar-content">
            <div className="sidebar-header">FILES</div>
            <div className="sidebar-body">
              <div className="placeholder-text">No folder opened</div>
              <button className="open-folder-button">Open Folder</button>
            </div>
          </div>
        );
      case 'search':
        return (
          <div className="sidebar-content">
            <div className="sidebar-header">SEARCH</div>
            <div className="sidebar-body">
              <input
                type="text"
                className="search-input"
                placeholder="Search..."
              />
              <div className="placeholder-text">No results</div>
            </div>
          </div>
        );
      case 'toc':
        return (
          <div className="sidebar-content">
            <div className="sidebar-header">TABLE OF CONTENTS</div>
            <div className="sidebar-body">
              <div className="placeholder-text">No headings found</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
      {renderContent()}
    </div>
  );
};

export default Sidebar;
