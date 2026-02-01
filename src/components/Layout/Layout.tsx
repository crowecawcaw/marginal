import React, { useEffect } from "react";
import { setupEventListeners } from "../../platform/eventAdapter";
import Sidebar from "../Sidebar/Sidebar";
import OutlineSidebar from "../Sidebar/OutlineSidebar";
import EditorArea from "../EditorArea/EditorArea";
import Toast from "../Toast/Toast";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
import KeyboardHints from "../KeyboardHints/KeyboardHints";
import { useUIStore } from "../../stores/uiStore";
import { useEditorStore } from "../../stores/editorStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import "./Layout.css";

const Layout: React.FC = () => {
  const { toggleOutline } = useUIStore();
  const { tabs, activeTabId, removeTab, markTabDirty, openTab } =
    useEditorStore();
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
      // If the file has no path (untitled), use Save As dialog
      if (!activeTab.filePath) {
        const result = await saveFileAs(
          activeTab.content,
          activeTab.frontmatter,
        );
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
          addNotification(`Saved ${result.fileName}`, "success");
        }
      } else {
        // Regular save for existing files
        await saveFile(
          activeTab.filePath,
          activeTab.content,
          activeTab.frontmatter,
        );
        markTabDirty(activeTab.id, false);
        addNotification(`Saved ${activeTab.fileName}`, "success");
      }
    } catch (error) {
      console.error("Failed to save file:", error);
      addNotification("Failed to save file. Please try again.", "error");
    }
  };

  // Handle new file
  const handleNewFile = () => {
    try {
      newFile();
      addNotification("Created new file", "success");
    } catch (error) {
      console.error("Failed to create new file:", error);
      addNotification("Failed to create new file", "error");
    }
  };

  // Handle opening a file
  const handleOpenFile = async () => {
    try {
      await openFile();
    } catch (error) {
      console.error("Failed to open file:", error);
      addNotification("Failed to open file", "error");
    }
  };

  // Handle closing active tab
  const handleCloseTab = () => {
    if (activeTabId) {
      removeTab(activeTabId);
    }
  };

  // Handle viewing README
  const handleViewReadme = async () => {
    try {
      const readmeContent = await fetch("/src/assets/README.md").then((r) =>
        r.text(),
      );
      openTab({
        id: "readme",
        filePath: "", // Empty path means it's not a real file
        fileName: "README.md",
        content: readmeContent,
        isDirty: false,
        frontmatter: undefined,
      });
    } catch (error) {
      console.error("Failed to open README:", error);
      addNotification("Failed to open README", "error");
    }
  };

  // Register global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        handleNewFile();
      },
    },
    {
      key: "s",
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        handleSave();
      },
    },
    {
      key: "o",
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        handleOpenFile();
      },
    },
    {
      key: "w",
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        handleCloseTab();
      },
    },
    {
      key: "\\",
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        toggleOutline();
      },
    },
  ]);

  // Create a blank file on startup if no tabs exist
  useEffect(() => {
    if (tabs.length === 0) {
      newFile();
    }
  }, []); // Only run once on mount

  // Update page title based on active tab
  useEffect(() => {
    if (activeTab) {
      const unsavedIndicator = activeTab.isDirty ? " - Unsaved" : "";
      document.title = `${activeTab.fileName}${unsavedIndicator}`;
    } else {
      document.title = "marginal";
    }
  }, [activeTab?.fileName, activeTab?.isDirty]);

  // Listen for menu events (works in both Tauri and web)
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    setupEventListeners([
      { event: "menu:new-file", callback: () => handleNewFile() },
      { event: "menu:open-file", callback: () => handleOpenFile() },
      { event: "menu:save", callback: () => handleSave() },
      { event: "menu:close-tab", callback: () => handleCloseTab() },
      { event: "menu:toggle-outline", callback: () => toggleOutline() },
      { event: "menu:view-readme", callback: () => handleViewReadme() },
    ]).then((unlisten) => {
      cleanup = unlisten;
    });

    // Cleanup listeners on unmount
    return () => {
      cleanup?.();
    };
  }, [activeTab]); // Re-setup listeners when active tab changes

  return (
    <div className="layout">
      <Sidebar />
      <OutlineSidebar />
      <EditorArea />
      <Toast />
      <LoadingOverlay />
      <KeyboardHints />
    </div>
  );
};

export default Layout;
