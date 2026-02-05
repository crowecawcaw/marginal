import React, { useEffect, useState, useCallback } from "react";
import { setupEventListeners } from "../../platform/eventAdapter";
import Titlebar from "../Titlebar/Titlebar";
import Sidebar from "../Sidebar/Sidebar";
import OutlineSidebar from "../Sidebar/OutlineSidebar";
import EditorArea from "../EditorArea/EditorArea";
import Toast from "../Toast/Toast";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
import KeyboardHints from "../KeyboardHints/KeyboardHints";
import ConfirmDialog, {
  ConfirmResult,
} from "../ConfirmDialog/ConfirmDialog";
import { useUIStore } from "../../stores/uiStore";
import { useEditorStore } from "../../stores/editorStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { useFileSystem } from "../../hooks/useFileSystem";
import { showMessage } from "../../platform/fileSystemAdapter";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import "./Layout.css";

const Layout: React.FC = () => {
  const { toggleOutline, toggleViewMode, zoomIn, zoomOut } = useUIStore();
  const { tabs, activeTabId, removeTab, markTabDirty, openTab } =
    useEditorStore();
  const { addNotification } = useNotificationStore();
  const { openFile, saveFile, saveFileAs, newFile } = useFileSystem();

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    tabId: string;
    fileName: string;
  }>({ isOpen: false, tabId: "", fileName: "" });

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
          showMessage(`Saved ${result.fileName}`, { title: "File Saved" });
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
    if (!activeTab) return;

    if (activeTab.isDirty) {
      setConfirmDialog({
        isOpen: true,
        tabId: activeTab.id,
        fileName: activeTab.fileName,
      });
    } else {
      removeTab(activeTab.id);
    }
  };

  // Handle confirm dialog result
  const handleConfirmResult = useCallback(
    async (result: ConfirmResult) => {
      const { tabId } = confirmDialog;
      setConfirmDialog({ isOpen: false, tabId: "", fileName: "" });

      if (result === "cancel") {
        return;
      }

      if (result === "save") {
        await handleSave();
      }

      // Both "save" and "discard" close the tab
      removeTab(tabId);
    },
    [confirmDialog, handleSave, removeTab],
  );

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
    {
      key: "=",
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        zoomIn();
      },
    },
    {
      key: "-",
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        zoomOut();
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
      { event: "menu:toggle-view", callback: () => toggleViewMode() },
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
      <Titlebar />
      <div className="layout-main">
        <Sidebar />
        <OutlineSidebar />
        <EditorArea />
      </div>
      <Toast />
      <LoadingOverlay />
      <KeyboardHints />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Unsaved Changes"
        message={`"${confirmDialog.fileName}" has unsaved changes. Do you want to save before closing?`}
        onResult={handleConfirmResult}
      />
    </div>
  );
};

export default Layout;
