import React, { useEffect } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import IconBar from '../IconBar/IconBar';
import Sidebar from '../Sidebar/Sidebar';
import EditorArea from '../EditorArea/EditorArea';
import Toast from '../Toast/Toast';
import LoadingOverlay from '../LoadingOverlay/LoadingOverlay';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import './Layout.css';

const Layout: React.FC = () => {
  const { toggleSidebar, setSidebarView, setLoading } = useUIStore();
  const { tabs, activeTabId, removeTab, markTabDirty, openTab } = useEditorStore();
  const { addNotification } = useNotificationStore();
  const { openFile, saveFile, saveFileAs, newFile } = useFileSystem();

  // Get active tab for save functionality
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Handle save
  const handleSave = async () => {
    if (!activeTab) {
      return;
    }

    try {
      setLoading(true, 'Saving file...');

      // If the file has no path (untitled), use Save As dialog
      if (!activeTab.filePath) {
        const result = await saveFileAs(activeTab.content, activeTab.frontmatter);
        if (result) {
          // Remove old untitled tab and open new saved tab
          removeTab(activeTab.id);
          openTab({
            id: result.path,
            filePath: result.path,
            fileName: result.fileName,
            content: activeTab.content,
            isDirty: false,
            frontmatter: activeTab.frontmatter,
          });
          addNotification(`Saved ${result.fileName}`, 'success');
        }
      } else {
        // Regular save for existing files
        await saveFile(activeTab.filePath, activeTab.content, activeTab.frontmatter);
        markTabDirty(activeTab.id, false);
        addNotification(`Saved ${activeTab.fileName}`, 'success');
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      addNotification('Failed to save file. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle new file
  const handleNewFile = () => {
    try {
      newFile();
      addNotification('Created new file', 'success');
    } catch (error) {
      console.error('Failed to create new file:', error);
      addNotification('Failed to create new file', 'error');
    }
  };

  // Handle opening a file
  const handleOpenFile = async () => {
    try {
      setLoading(true, 'Opening file...');
      await openFile();
    } catch (error) {
      console.error('Failed to open file:', error);
      addNotification('Failed to open file', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle closing active tab
  const handleCloseTab = () => {
    if (activeTabId) {
      removeTab(activeTabId);
    }
  };

  // Handle search shortcut
  const handleSearch = () => {
    setSidebarView('search');
  };

  // Register global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        handleNewFile();
      },
    },
    {
      key: 's',
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        handleSave();
      },
    },
    {
      key: 'o',
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        handleOpenFile();
      },
    },
    {
      key: 'w',
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        handleCloseTab();
      },
    },
    {
      key: 'b',
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        toggleSidebar();
      },
    },
    {
      key: 'f',
      ctrlOrCmd: true,
      shift: true,
      handler: (e) => {
        e.preventDefault();
        handleSearch();
      },
    },
  ]);

  // Listen for menu events from Tauri
  useEffect(() => {
    const appWindow = getCurrentWebviewWindow();

    const unlistenPromises = [
      appWindow.listen('menu:new-file', () => handleNewFile()),
      appWindow.listen('menu:open-file', () => handleOpenFile()),
      appWindow.listen('menu:save', () => handleSave()),
      appWindow.listen('menu:close-tab', () => handleCloseTab()),
      appWindow.listen('menu:toggle-sidebar', () => toggleSidebar()),
      appWindow.listen('menu:search', () => handleSearch()),
    ];

    // Cleanup listeners on unmount
    return () => {
      Promise.all(unlistenPromises).then((unlisteners) => {
        unlisteners.forEach((unlisten) => unlisten());
      });
    };
  }, [activeTab]); // Re-setup listeners when active tab changes

  return (
    <div className="layout">
      <IconBar />
      <Sidebar />
      <EditorArea />
      <Toast />
      <LoadingOverlay />
    </div>
  );
};

export default Layout;
