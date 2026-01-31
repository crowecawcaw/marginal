import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useFileStore } from '../../stores/fileStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import FileTree from './FileTree/FileTree';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const { sidebarVisible, currentSidebarView, sidebarWidth } = useUIStore();
  const { fileTree, rootPath } = useFileStore();
  const { openFolder, openFile } = useFileSystem();

  if (!sidebarVisible) return null;

  const handleOpenFolder = async () => {
    try {
      await openFolder();
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  };

  const handleFileClick = async (filePath: string) => {
    try {
      await openFile(filePath);
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const renderContent = () => {
    switch (currentSidebarView) {
      case 'files':
        return (
          <div className="sidebar-content">
            <div className="sidebar-header">
              <span>FILES</span>
              {rootPath && (
                <button
                  className="sidebar-action-button"
                  onClick={handleOpenFolder}
                  title="Change folder"
                >
                  📁
                </button>
              )}
            </div>
            <div className="sidebar-body">
              {fileTree.length === 0 ? (
                <div className="sidebar-empty">
                  <div className="placeholder-text">No folder opened</div>
                  <button className="open-folder-button" onClick={handleOpenFolder}>
                    Open Folder
                  </button>
                </div>
              ) : (
                <FileTree nodes={fileTree} onFileClick={handleFileClick} />
              )}
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
