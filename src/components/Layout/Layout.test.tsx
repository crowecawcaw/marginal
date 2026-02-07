import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import { useUIStore } from "../../stores/uiStore";
import { useEditorStore } from "../../stores/editorStore";
import {
  getWebEventEmitter,
  resetWebEventEmitter,
  setupEventListeners,
} from "../../platform/eventAdapter";
import * as fileSystemAdapter from "../../platform/fileSystemAdapter";
import * as useFileSystemModule from "../../hooks/useFileSystem";

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Menu event handling integration", () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset event emitter to avoid listener accumulation between tests
    resetWebEventEmitter();
    // Reset store to default state
    useUIStore.setState({
      viewMode: "code",
      outlineVisible: false,
    });
  });

  describe("menu:toggle-view event pattern", () => {
    it("setupEventListeners registers callbacks that respond to emitted events", async () => {
      const { toggleViewMode } = useUIStore.getState();

      // Set up listener the same way Layout does
      const unlisten = await setupEventListeners([
        { event: "menu:toggle-view", callback: () => toggleViewMode() },
      ]);

      // Initial state
      expect(useUIStore.getState().viewMode).toBe("code");

      // Emit the event (simulating menu click)
      const emitter = getWebEventEmitter();
      emitter.emit("menu:toggle-view");

      // State should be updated
      expect(useUIStore.getState().viewMode).toBe("rendered");

      // Cleanup
      unlisten();
    });

    it("toggles view mode from rendered to code", async () => {
      useUIStore.setState({ viewMode: "rendered" });
      const { toggleViewMode } = useUIStore.getState();

      const unlisten = await setupEventListeners([
        { event: "menu:toggle-view", callback: () => toggleViewMode() },
      ]);

      expect(useUIStore.getState().viewMode).toBe("rendered");

      const emitter = getWebEventEmitter();
      emitter.emit("menu:toggle-view");

      expect(useUIStore.getState().viewMode).toBe("code");

      unlisten();
    });

    it("can toggle view mode multiple times", async () => {
      const { toggleViewMode } = useUIStore.getState();

      const unlisten = await setupEventListeners([
        { event: "menu:toggle-view", callback: () => toggleViewMode() },
      ]);

      const emitter = getWebEventEmitter();

      emitter.emit("menu:toggle-view");
      expect(useUIStore.getState().viewMode).toBe("rendered");

      emitter.emit("menu:toggle-view");
      expect(useUIStore.getState().viewMode).toBe("code");

      emitter.emit("menu:toggle-view");
      expect(useUIStore.getState().viewMode).toBe("rendered");

      unlisten();
    });

    it("unlisten removes the callback", async () => {
      const { toggleViewMode } = useUIStore.getState();

      const unlisten = await setupEventListeners([
        { event: "menu:toggle-view", callback: () => toggleViewMode() },
      ]);

      const emitter = getWebEventEmitter();

      // First emit should work
      emitter.emit("menu:toggle-view");
      expect(useUIStore.getState().viewMode).toBe("rendered");

      // Remove listener
      unlisten();

      // Second emit should not change state
      emitter.emit("menu:toggle-view");
      expect(useUIStore.getState().viewMode).toBe("rendered");
    });
  });

  describe("menu:toggle-outline event pattern", () => {
    it("toggles outline visibility when event is emitted", async () => {
      const { toggleOutline } = useUIStore.getState();

      const unlisten = await setupEventListeners([
        { event: "menu:toggle-outline", callback: () => toggleOutline() },
      ]);

      expect(useUIStore.getState().outlineVisible).toBe(false);

      const emitter = getWebEventEmitter();
      emitter.emit("menu:toggle-outline");

      expect(useUIStore.getState().outlineVisible).toBe(true);

      unlisten();
    });
  });
});

describe("Close tab with unsaved changes", () => {
  let confirmUnsavedChangesSpy: Mock;
  let saveFileSpy: Mock;
  let saveFileAsSpy: Mock;

  beforeEach(() => {
    localStorageMock.clear();
    // Reset stores
    useEditorStore.setState({
      files: [],
      activeFileId: null,
    });

    // Setup spies
    confirmUnsavedChangesSpy = vi.spyOn(
      fileSystemAdapter,
      "confirmUnsavedChanges",
    ) as Mock;
    saveFileSpy = vi.fn();
    saveFileAsSpy = vi.fn();

    vi.spyOn(useFileSystemModule, "useFileSystem").mockReturnValue({
      openFolder: vi.fn(),
      openFile: vi.fn(),
      saveFile: saveFileSpy,
      saveFileAs: saveFileAsSpy,
      readFile: vi.fn(),
      newFile: vi.fn(),
      restoreFiles: vi.fn().mockResolvedValue(undefined),
      downloadCurrentFile: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create handleCloseTab similar to Layout.tsx
  // Now gets state from store at call time to avoid stale closures
  const createHandleCloseTab = () => {
    const { saveFile, saveFileAs } = useFileSystemModule.useFileSystem();

    const handleSaveTab = async (
      file: ReturnType<typeof useEditorStore.getState>["files"][0],
    ): Promise<boolean> => {
      if (!file) return false;
      const { removeFile, openFile, markFileDirty } = useEditorStore.getState();

      try {
        if (!file.filePath) {
          const result = await saveFileAs(file.content, file.frontmatter);
          if (result) {
            removeFile(file.id);
            openFile({
              id: result.path,
              filePath: result.path,
              fileName: result.fileName,
              content: file.content,
              isDirty: false,
              frontmatter: file.frontmatter,
            });
            return true;
          }
          return false;
        } else {
          await saveFile(file.filePath, file.content, file.frontmatter);
          markFileDirty(file.id, false);
          return true;
        }
      } catch {
        return false;
      }
    };

    return async (fileId?: string) => {
      // Get current state from store to avoid stale closures
      const currentState = useEditorStore.getState();
      const targetFileId = fileId ?? currentState.activeFileId;
      if (!targetFileId) return;

      const targetFile = currentState.files.find((f) => f.id === targetFileId);
      if (!targetFile) return;

      const { removeFile } = currentState;

      if (targetFile.isDirty) {
        const result = await fileSystemAdapter.confirmUnsavedChanges(
          targetFile.fileName,
        );
        if (result === "cancel") {
          return;
        }
        if (result === "save") {
          const saved = await handleSaveTab(targetFile);
          if (!saved) {
            return;
          }
          if (!targetFile.filePath) {
            return;
          }
        }
        removeFile(targetFile.id);
      } else {
        removeFile(targetFile.id);
      }
    };
  };

  it("does not close tab when user cancels the confirm dialog", async () => {
    // Setup: dirty untitled file
    useEditorStore.setState({
      files: [
        {
          id: "untitled-1",
          filePath: "",
          fileName: "Untitled.md",
          content: "unsaved content",
          isDirty: true,
        },
      ],
      activeFileId: "untitled-1",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("cancel");

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // File should still exist
    expect(useEditorStore.getState().files).toHaveLength(1);
    expect(useEditorStore.getState().files[0].id).toBe("untitled-1");
  });

  it("closes tab without saving when user chooses discard", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "untitled-1",
          filePath: "",
          fileName: "Untitled.md",
          content: "unsaved content",
          isDirty: true,
        },
      ],
      activeFileId: "untitled-1",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("discard");

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // File should be removed
    expect(useEditorStore.getState().files).toHaveLength(0);
    expect(saveFileAsSpy).not.toHaveBeenCalled();
  });

  it("does not close tab when user chooses save but cancels save dialog", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "untitled-1",
          filePath: "",
          fileName: "Untitled.md",
          content: "unsaved content",
          isDirty: true,
        },
      ],
      activeFileId: "untitled-1",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("save");
    saveFileAsSpy.mockResolvedValue(null); // User cancelled save dialog

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // File should still exist because save was cancelled
    expect(useEditorStore.getState().files).toHaveLength(1);
    expect(useEditorStore.getState().files[0].id).toBe("untitled-1");
  });

  it("closes tab when user chooses save and save succeeds (untitled file)", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "untitled-1",
          filePath: "",
          fileName: "Untitled.md",
          content: "unsaved content",
          isDirty: true,
        },
      ],
      activeFileId: "untitled-1",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("save");
    saveFileAsSpy.mockResolvedValue({
      path: "/path/to/saved.md",
      fileName: "saved.md",
    });

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // Old untitled file should be replaced with new saved file
    const files = useEditorStore.getState().files;
    expect(files).toHaveLength(1);
    expect(files[0].id).toBe("/path/to/saved.md");
    expect(files[0].fileName).toBe("saved.md");
  });

  it("closes tab when user chooses save and save succeeds (existing file)", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "/existing/file.md",
          filePath: "/existing/file.md",
          fileName: "file.md",
          content: "modified content",
          isDirty: true,
        },
      ],
      activeFileId: "/existing/file.md",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("save");
    saveFileSpy.mockResolvedValue(true);

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // File should be removed after successful save
    expect(useEditorStore.getState().files).toHaveLength(0);
    expect(saveFileSpy).toHaveBeenCalledWith(
      "/existing/file.md",
      "modified content",
      undefined,
    );
  });

  it("does not close tab when save fails", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "/existing/file.md",
          filePath: "/existing/file.md",
          fileName: "file.md",
          content: "modified content",
          isDirty: true,
        },
      ],
      activeFileId: "/existing/file.md",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("save");
    saveFileSpy.mockRejectedValue(new Error("Save failed"));

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // File should still exist because save failed
    expect(useEditorStore.getState().files).toHaveLength(1);
  });

  it("closes clean tab immediately without confirmation", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "tab-1",
          filePath: "/some/file.md",
          fileName: "file.md",
          content: "content",
          isDirty: false,
        },
      ],
      activeFileId: "tab-1",
    });

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // File should be removed without any confirmation
    expect(useEditorStore.getState().files).toHaveLength(0);
    expect(confirmUnsavedChangesSpy).not.toHaveBeenCalled();
  });

  it("closes only the active tab when multiple tabs exist (menu close)", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "tab-1",
          filePath: "/file1.md",
          fileName: "file1.md",
          content: "content 1",
          isDirty: false,
        },
        {
          id: "tab-2",
          filePath: "/file2.md",
          fileName: "file2.md",
          content: "content 2",
          isDirty: false,
        },
        {
          id: "tab-3",
          filePath: "/file3.md",
          fileName: "file3.md",
          content: "content 3",
          isDirty: false,
        },
      ],
      activeFileId: "tab-2",
    });

    const handleCloseTab = createHandleCloseTab();
    // Close without fileId - should close active tab (tab-2)
    await handleCloseTab();

    const files = useEditorStore.getState().files;
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.id)).toEqual(["tab-1", "tab-3"]);
  });

  it("closes specific tab by ID when multiple tabs exist (X button)", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "tab-1",
          filePath: "/file1.md",
          fileName: "file1.md",
          content: "content 1",
          isDirty: false,
        },
        {
          id: "tab-2",
          filePath: "/file2.md",
          fileName: "file2.md",
          content: "content 2",
          isDirty: false,
        },
        {
          id: "tab-3",
          filePath: "/file3.md",
          fileName: "file3.md",
          content: "content 3",
          isDirty: false,
        },
      ],
      activeFileId: "tab-1", // Active is tab-1
    });

    const handleCloseTab = createHandleCloseTab();
    // Close tab-3 specifically (clicking X on non-active tab)
    await handleCloseTab("tab-3");

    const files = useEditorStore.getState().files;
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.id)).toEqual(["tab-1", "tab-2"]);
    // Active file should still be tab-1
    expect(useEditorStore.getState().activeFileId).toBe("tab-1");
  });

  it("prompts for correct tab when closing specific dirty tab by ID", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "tab-1",
          filePath: "/file1.md",
          fileName: "file1.md",
          content: "content 1",
          isDirty: false,
        },
        {
          id: "tab-2",
          filePath: "/file2.md",
          fileName: "file2.md",
          content: "modified content",
          isDirty: true,
        },
      ],
      activeFileId: "tab-1",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("discard");

    const handleCloseTab = createHandleCloseTab();
    // Close tab-2 by ID (not the active tab)
    await handleCloseTab("tab-2");

    // Should have prompted for tab-2, not tab-1
    expect(confirmUnsavedChangesSpy).toHaveBeenCalledWith("file2.md");
    expect(confirmUnsavedChangesSpy).not.toHaveBeenCalledWith("file1.md");

    const files = useEditorStore.getState().files;
    expect(files).toHaveLength(1);
    expect(files[0].id).toBe("tab-1");
  });

  it("does nothing when closing non-existent tab ID", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "tab-1",
          filePath: "/file1.md",
          fileName: "file1.md",
          content: "content 1",
          isDirty: false,
        },
      ],
      activeFileId: "tab-1",
    });

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab("non-existent-tab");

    // Nothing should have changed
    expect(useEditorStore.getState().files).toHaveLength(1);
  });
});
