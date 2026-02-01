import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useFileStore } from '../../stores/fileStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import FileTree from './FileTree/FileTree';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const { sidebarVisible, sidebarWidth, setLoading } = useUIStore();
  const { fileTree, rootPath } = useFileStore();
  const { addNotification } = useNotificationStore();
  const { openFolder, openFile } = useFileSystem();

  // Only show if there's a folder opened
  if (!sidebarVisible || !rootPath || fileTree.length === 0) return null;

  const handleOpenFolder = async () => {
    try {
      setLoading(true, 'Opening folder...');
      await openFolder();
      addNotification('Folder opened successfully', 'success');
    } catch (error) {
      console.error('Error opening folder:', error);
      addNotification('Failed to open folder', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (filePath: string) => {
    try {
      setLoading(true, 'Opening file...');
      await openFile(filePath);
    } catch (error) {
      console.error('Error opening file:', error);
      addNotification('Failed to open file', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <span>FILES</span>
          <button
            className="sidebar-action-button"
            onClick={handleOpenFolder}
            title="Change folder"
          >
            📁
          </button>
        </div>
        <div className="sidebar-body">
          <FileTree nodes={fileTree} onFileClick={handleFileClick} />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
