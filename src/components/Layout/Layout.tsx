import React, { useEffect } from "react";
import { setupEventListeners, listen } from "../../platform/eventAdapter";
import Titlebar from "../Titlebar/Titlebar";
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
import {
  showMessage,
  confirmUnsavedChanges,
} from "../../platform/fileSystemAdapter";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import "./Layout.css";

const Layout: React.FC = () => {
  const { toggleOutline, toggleViewMode, zoomIn, zoomOut } = useUIStore();
  const { tabs, activeTabId, removeTab, markTabDirty, openTab } =
    useEditorStore();
  const { addNotification } = useNotificationStore();
  const { openFile, saveFile, saveFileAs, newFile } = useFileSystem();

  // Get active tab for save functionality
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Handle save for a specific tab - returns true if save succeeded, false if cancelled or failed
  const handleSaveTab = async (tab: typeof activeTab): Promise<boolean> => {
    if (!tab) {
      return false;
    }

    try {
      // If the file has no path (untitled), use Save As dialog
      if (!tab.filePath) {
        const result = await saveFileAs(tab.content, tab.frontmatter);
        if (result) {
          // Remove old untitled tab and open new saved tab
          removeTab(tab.id);
          openTab({
            id: result.path,
            filePath: result.path,
            fileName: result.fileName,
            content: tab.content,
            isDirty: false,
            frontmatter: tab.frontmatter,
          });
          showMessage(`Saved ${result.fileName}`, { title: "File Saved" });
          return true;
        }
        // User cancelled the save dialog
        return false;
      } else {
        // Regular save for existing files
        await saveFile(tab.filePath, tab.content, tab.frontmatter);
        markTabDirty(tab.id, false);
        showMessage(`Saved ${tab.fileName}`, { title: "File Saved" });
        return true;
      }
    } catch (error) {
      console.error("Failed to save file:", error);
      showMessage("Failed to save file. Please try again.", {
        title: "Save Error",
        kind: "error",
      });
      return false;
    }
  };

  // Handle save for the active tab
  const handleSave = async (): Promise<boolean> => {
    return handleSaveTab(activeTab);
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

  // Handle closing a specific tab by ID
  // If no tabId provided, closes the active tab
  const handleCloseTab = async (tabId?: string) => {
    // Get current state from store to avoid stale closures
    const currentState = useEditorStore.getState();
    const targetTabId = tabId ?? currentState.activeTabId;
    if (!targetTabId) return;

    const targetTab = currentState.tabs.find((t) => t.id === targetTabId);
    if (!targetTab) return;

    if (targetTab.isDirty) {
      const result = await confirmUnsavedChanges(targetTab.fileName);
      if (result === "cancel") {
        return;
      }
      if (result === "save") {
        const saved = await handleSaveTab(targetTab);
        if (!saved) {
          // User cancelled the save dialog, don't close the tab
          return;
        }
        // Tab was already replaced by handleSaveTab for untitled files
        if (!targetTab.filePath) {
          return;
        }
      }
      removeTab(targetTab.id);
    } else {
      removeTab(targetTab.id);
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
  // These handlers get current state from store, so no need to re-register on state changes
  useEffect(() => {
    let menuCleanup: (() => void) | undefined;
    let closeTabCleanup: (() => void) | undefined;
    let mounted = true;

    // Menu events (no payload)
    setupEventListeners([
      { event: "menu:new-file", callback: () => handleNewFile() },
      { event: "menu:open-file", callback: () => handleOpenFile() },
      { event: "menu:save", callback: () => handleSave() },
      { event: "menu:close-tab", callback: () => handleCloseTab() },
      { event: "menu:toggle-outline", callback: () => toggleOutline() },
      { event: "menu:toggle-view", callback: () => toggleViewMode() },
      { event: "menu:view-readme", callback: () => handleViewReadme() },
    ]).then((unlisten) => {
      if (mounted) {
        menuCleanup = unlisten;
      } else {
        unlisten();
      }
    });

    // Close tab event with payload (from clicking X on tab)
    listen<{ tabId: string }>("close-tab", (payload) => {
      if (payload?.tabId) {
        handleCloseTab(payload.tabId);
      }
    }).then((unlisten) => {
      if (mounted) {
        closeTabCleanup = unlisten;
      } else {
        unlisten();
      }
    });

    // Cleanup listeners on unmount
    return () => {
      mounted = false;
      menuCleanup?.();
      closeTabCleanup?.();
    };
  }, []); // Empty deps - handlers get current state from store

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
    </div>
  );
};

export default Layout;
