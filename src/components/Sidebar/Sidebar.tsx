import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useFileStore } from '../../stores/fileStore';
import { useEditorStore } from '../../stores/editorStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import FileTree from './FileTree/FileTree';
import TableOfContents from './TableOfContents/TableOfContents';
import Search from './Search/Search';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const { sidebarVisible, currentSidebarView, sidebarWidth } = useUIStore();
  const { fileTree, rootPath } = useFileStore();
  const { tabs, activeTabId } = useEditorStore();
  const { openFolder, openFile } = useFileSystem();

  // Get the active tab's content for TOC
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeContent = activeTab?.content || '';

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
            <Search />
          </div>
        );
      case 'toc':
        return (
          <div className="sidebar-content">
            <TableOfContents content={activeContent} />
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
