import React, { useEffect, useState } from "react";
import { emit } from "../../platform/eventAdapter";
import { useEventListener, useEventListeners } from "../../platform/useEventListener";
import Sidebar from "../Sidebar/Sidebar";
import OutlineSidebar from "../Sidebar/OutlineSidebar";
import EditorArea from "../EditorArea/EditorArea";
import Toast from "../Toast/Toast";
import SettingsDialog from "../SettingsDialog/SettingsDialog";
import ExternalChangeDialog from "../ExternalChangeDialog/ExternalChangeDialog";
import OverwriteConfirmDialog from "../OverwriteConfirmDialog/OverwriteConfirmDialog";
import { useUIStore } from "../../stores/uiStore";
import { useEditorStore } from "../../stores/editorStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { useFileSystem } from "../../hooks/useFileSystem";
import { useFileWatcher } from "../../hooks/useFileWatcher";
import {
  showMessage,
  confirmUnsavedChanges,
  getFileMtime,
} from "../../platform/fileSystemAdapter";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { loadSettings } from "../../utils/settings";
import {
  loadAutosaveEntries,
  removeAutosaveEntry,
} from "../../utils/autosave";
import readmeRaw from "../../assets/README.md?raw";
import "./Layout.css";

const Layout: React.FC = () => {
  const { toggleOutline, toggleViewMode, zoomIn, zoomOut, resetZoom, outlineVisible } = useUIStore();
  const { files, activeFileId, removeFile, markFileDirty, openFile: openEditorFile,
    setBaseContent, setDiskMtime, clearIgnoredAt, setPendingExternalContent } =
    useEditorStore();
  const { addNotification } = useNotificationStore();
  const { openFile, saveFile, saveFileAs, newFile, restoreFiles } = useFileSystem();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // External change dialog state
  const [externalChangeFileId, setExternalChangeFileId] = useState<string | null>(null);
  // Overwrite confirm dialog state
  const [overwriteFileId, setOverwriteFileId] = useState<string | null>(null);

  // Get active file for save functionality
  const activeFile = files.find((file) => file.id === activeFileId);

  // File to show in external change dialog
  const externalChangeFile = externalChangeFileId
    ? files.find((f) => f.id === externalChangeFileId)
    : null;
  const overwriteFile = overwriteFileId
    ? files.find((f) => f.id === overwriteFileId)
    : null;

  // Mount file watcher (Tauri only)
  useFileWatcher((fileId) => {
    setExternalChangeFileId(fileId);
  });

  // Perform the actual save (no ignoredAt check — caller has already confirmed)
  const performSave = async (
    file: NonNullable<typeof activeFile>,
  ): Promise<boolean> => {
    const finalContent = file.content;
    try {
      const { serializeFrontmatter } = await import("../../utils/frontmatter");
      const { writeFileContent } = await import("../../platform/fileSystemAdapter");
      const content = file.frontmatter
        ? serializeFrontmatter(finalContent, file.frontmatter)
        : finalContent;
      await writeFileContent(file.filePath, content);

      markFileDirty(file.id, false);
      removeAutosaveEntry(file.id);
      setBaseContent(file.id, file.content);
      // Update diskMtime after save so watcher doesn't re-trigger
      const newMtime = await getFileMtime(file.filePath);
      setDiskMtime(file.id, newMtime);
      showMessage(`Saved ${file.fileName}`, { title: "File Saved" });
      return true;
    } catch (error) {
      console.error("Failed to save file:", error);
      showMessage("Failed to save file. Please try again.", {
        title: "Save Error",
        kind: "error",
      });
      return false;
    }
  };

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
            baseContent: file.content,
            diskMtime: null,
            ignoredExternalChangeAt: null,
            pendingExternalContent: null,
            precomputedMerge: null,
            frontmatter: file.frontmatter,
          });
          removeAutosaveEntry(oldFileId);
          showMessage(`Saved ${result.fileName}`, { title: "File Saved" });
          return true;
        }
        // User cancelled the save dialog
        return false;
      } else {
        // Check if we need overwrite confirmation (ignored external change)
        const result = await saveFile(
          file.filePath,
          file.content,
          file.frontmatter,
          file.id,
        );
        if (result === "needs-confirm") {
          setOverwriteFileId(file.id);
          return false;
        }
        // Regular save succeeded
        markFileDirty(file.id, false);
        removeAutosaveEntry(file.id);
        setBaseContent(file.id, file.content);
        const newMtime = await getFileMtime(file.filePath);
        setDiskMtime(file.id, newMtime);
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
  const handleViewReadme = () => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const mod = isMac ? "⌘" : "⌃";
    let content = readmeRaw.replace(/\{mod\}/g, mod);
    if (isMac) {
      content = content.replace(/^\{macos\}/gm, "");
    } else {
      content = content.replace(/^\{macos\}.*\n/gm, "");
    }
    openEditorFile({
      id: "readme",
      filePath: "", // Empty path means it's not a real file
      fileName: "README.md",
      content,
      isDirty: false,
      baseContent: content,
      diskMtime: null,
      ignoredExternalChangeAt: null,
      pendingExternalContent: null,
      precomputedMerge: null,
      frontmatter: undefined,
    });
  };

  // External change dialog handlers
  const handleExternalMerge = () => {
    if (!externalChangeFile) return;
    const { precomputedMerge, pendingExternalContent, id } = externalChangeFile;
    if (precomputedMerge !== null) {
      emit("external-merge-content", { fileId: id, content: precomputedMerge });
      setBaseContent(id, pendingExternalContent ?? precomputedMerge);
    }
    setPendingExternalContent(id, null, null);
    setExternalChangeFileId(null);
  };

  const handleExternalUpdate = () => {
    if (!externalChangeFile) return;
    const { pendingExternalContent, id } = externalChangeFile;
    if (pendingExternalContent !== null) {
      // Import at top of file is fine, but we use the module import already
      emit("external-merge-content", { fileId: id, content: pendingExternalContent });
      setBaseContent(id, pendingExternalContent);
    }
    setPendingExternalContent(id, null, null);
    setExternalChangeFileId(null);
  };

  const handleExternalIgnore = () => {
    if (!externalChangeFile) return;
    const { id } = externalChangeFile;
    useEditorStore.getState().setIgnoredAt(id, Date.now());
    setPendingExternalContent(id, null, null);
    setExternalChangeFileId(null);
  };

  // Overwrite confirm dialog handlers
  const handleOverwriteConfirm = async () => {
    const file = overwriteFile;
    setOverwriteFileId(null);
    if (!file) return;
    clearIgnoredAt(file.id);
    await performSave(file);
  };

  const handleOverwriteCancel = () => {
    setOverwriteFileId(null);
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
              baseContent: entry.content,
              diskMtime: null,
              ignoredExternalChangeAt: null,
              pendingExternalContent: null,
              precomputedMerge: null,
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
    { event: "menu:settings", callback: () => setSettingsOpen(true) },
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
      <div className="layout-tabs" data-tauri-drag-region>
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
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ExternalChangeDialog
        isOpen={externalChangeFileId !== null && externalChangeFile !== undefined}
        fileName={externalChangeFile?.fileName ?? ""}
        canMerge={externalChangeFile?.precomputedMerge !== null && externalChangeFile?.precomputedMerge !== undefined}
        onMerge={handleExternalMerge}
        onUpdate={handleExternalUpdate}
        onIgnore={handleExternalIgnore}
      />
      <OverwriteConfirmDialog
        isOpen={overwriteFileId !== null && overwriteFile !== undefined}
        fileName={overwriteFile?.fileName ?? ""}
        onOverwrite={handleOverwriteConfirm}
        onCancel={handleOverwriteCancel}
      />
    </div>
  );
};

export default Layout;
