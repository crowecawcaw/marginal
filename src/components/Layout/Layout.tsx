import React, { useEffect, useState } from "react";
import { emit } from "../../platform/eventAdapter";
import { useEventListener, useEventListeners } from "../../platform/useEventListener";
import Sidebar from "../Sidebar/Sidebar";
import OutlineSidebar from "../Sidebar/OutlineSidebar";
import EditorArea from "../EditorArea/EditorArea";
import Toast from "../Toast/Toast";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
import SettingsDialog from "../SettingsDialog/SettingsDialog";
import { useUIStore } from "../../stores/uiStore";
import { useEditorStore } from "../../stores/editorStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { useFileSystem } from "../../hooks/useFileSystem";
import {
  showMessage,
  confirmUnsavedChanges,
} from "../../platform/fileSystemAdapter";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { loadSettings } from "../../utils/settings";
import {
  loadAutosaveEntries,
  removeAutosaveEntry,
} from "../../utils/autosave";
import "./Layout.css";

const Layout: React.FC = () => {
  const { toggleOutline, toggleViewMode, zoomIn, zoomOut, resetZoom, outlineVisible } = useUIStore();
  const { files, activeFileId, removeFile, markFileDirty, openFile: openEditorFile } =
    useEditorStore();
  const { addNotification } = useNotificationStore();
  const { openFile, saveFile, saveFileAs, newFile, restoreFiles } = useFileSystem();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Get active file for save functionality
  const activeFile = files.find((file) => file.id === activeFileId);

  // Handle save for a specific file - returns true if save succeeded, false if cancelled or failed
  const handleSaveFile = async (file: typeof activeFile): Promise<boolean> => {
    if (!file) {
      return false;
    }

    try {
      // If the file has no path (untitled), use Save As dialog
      if (!file.filePath) {
        const result = await saveFileAs(file.content, file.frontmatter);
        if (result) {
          const oldFileId = file.id;
          // Remove old untitled file and open new saved file
          removeFile(file.id);
          openEditorFile({
            id: result.path,
            filePath: result.path,
            fileName: result.fileName,
            content: file.content,
            isDirty: false,
            frontmatter: file.frontmatter,
          });
          removeAutosaveEntry(oldFileId);
          showMessage(`Saved ${result.fileName}`, { title: "File Saved" });
          return true;
        }
        // User cancelled the save dialog
        return false;
      } else {
        // Regular save for existing files
        await saveFile(file.filePath, file.content, file.frontmatter);
        markFileDirty(file.id, false);
        removeAutosaveEntry(file.id);
        showMessage(`Saved ${file.fileName}`, { title: "File Saved" });
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

  // Handle save for the active file
  const handleSave = async (): Promise<boolean> => {
    return handleSaveFile(activeFile);
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
  // If no fileId provided, closes the active file
  const handleCloseTab = async (fileId?: string) => {
    // Get current state from store to avoid stale closures
    const currentState = useEditorStore.getState();
    const targetFileId = fileId ?? currentState.activeFileId;
    if (!targetFileId) return;

    const targetFile = currentState.files.find((f) => f.id === targetFileId);
    if (!targetFile) return;

    if (targetFile.isDirty) {
      const result = await confirmUnsavedChanges(targetFile.fileName);
      if (result === "cancel") {
        return;
      }
      if (result === "save") {
        const saved = await handleSaveFile(targetFile);
        if (!saved) {
          // User cancelled the save dialog, don't close the file
          return;
        }
        // File was already replaced by handleSaveFile for untitled files
        if (!targetFile.filePath) {
          return;
        }
      }
      removeFile(targetFile.id);
    } else {
      removeFile(targetFile.id);
    }
  };

  // Handle viewing README
  const handleViewReadme = async () => {
    try {
      const readmeContent = await fetch("/src/assets/README.md").then((r) =>
        r.text(),
      );
      openEditorFile({
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
    {
      key: "0",
      ctrlOrCmd: true,
      handler: (e) => {
        e.preventDefault();
        resetZoom();
      },
    },
  ]);

  // Restore previously open files on startup, or create a blank file
  useEffect(() => {
    if (files.length === 0) {
      const settings = loadSettings();
      const doRestore = settings.openFiles.length > 0
        ? restoreFiles(settings.openFiles, settings.activeFilePath)
        : Promise.resolve();

      doRestore.then(() => {
        // Restore autosaved content
        const autosaveEntries = loadAutosaveEntries();
        const state = useEditorStore.getState();

        for (const [id, entry] of Object.entries(autosaveEntries)) {
          if (entry.filePath) {
            // Saved file: find already-restored file by its path (id === filePath for saved files)
            const existing = state.files.find((f) => f.id === id);
            if (existing) {
              state.updateFileContent(id, entry.content);
              state.markFileDirty(id, true);
            }
          } else {
            // Unsaved file: reopen with autosaved content
            state.openFile({
              id,
              filePath: "",
              fileName: entry.fileName,
              content: entry.content,
              isDirty: true,
              frontmatter: entry.frontmatter,
            });
          }
          removeAutosaveEntry(id);
        }

        // If no files were restored at all, create a blank file
        if (useEditorStore.getState().files.length === 0) {
          newFile();
        }
      });
    }
  }, []); // Only run once on mount

  // Update page title based on active file
  useEffect(() => {
    if (activeFile) {
      const unsavedIndicator = activeFile.isDirty ? " - Unsaved" : "";
      document.title = `${activeFile.fileName}${unsavedIndicator}`;
    } else {
      document.title = "marginal";
    }
  }, [activeFile?.fileName, activeFile?.isDirty]);

  // Listen for menu events (works in both Tauri and web)
  // These handlers get current state from store, so no need to re-register on state changes
  useEventListeners([
    { event: "menu:new-file", callback: () => handleNewFile() },
    { event: "menu:open-file", callback: () => handleOpenFile() },
    { event: "menu:save", callback: () => handleSave() },
    { event: "menu:close-tab", callback: () => handleCloseTab() },
    { event: "menu:toggle-outline", callback: () => toggleOutline() },
    { event: "menu:toggle-view", callback: () => toggleViewMode() },
    { event: "menu:zoom-in", callback: () => zoomIn() },
    { event: "menu:zoom-out", callback: () => zoomOut() },
    { event: "menu:zoom-reset", callback: () => resetZoom() },
    { event: "menu:view-readme", callback: () => handleViewReadme() },
  ], []);

  // Close tab event with payload (from clicking X on tab)
  useEventListener<{ fileId: string }>("close-tab", (payload) => {
    if (payload?.fileId) {
      handleCloseTab(payload.fileId);
    }
  }, []);

  const handleTabClose = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    emit("close-tab", { fileId });
  };

  return (
    <div className="layout">
      <div className="layout-tabs">
        {files.map((file) => (
          <button
            key={file.id}
            className={`layout-tab ${file.id === activeFileId ? "active" : ""}`}
            onClick={() => useEditorStore.getState().setActiveFile(file.id)}
          >
            <span className="layout-tab-name">
              {file.isDirty && <span className="layout-tab-dirty">●</span>}
              {file.fileName}
            </span>
            {files.length > 1 && (
              <span
                className="layout-tab-close"
                onClick={(e) => handleTabClose(e, file.id)}
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>
      <div className={`layout-main${outlineVisible ? ' outline-open' : ''}`}>
        <Sidebar />
        <OutlineSidebar />
        <EditorArea />
      </div>
      <Toast />
      <LoadingOverlay />
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default Layout;
