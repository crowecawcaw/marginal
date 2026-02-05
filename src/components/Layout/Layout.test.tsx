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
      tabs: [],
      activeTabId: null,
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
      tab: ReturnType<typeof useEditorStore.getState>["tabs"][0],
    ): Promise<boolean> => {
      if (!tab) return false;
      const { removeTab, openTab, markTabDirty } = useEditorStore.getState();

      try {
        if (!tab.filePath) {
          const result = await saveFileAs(tab.content, tab.frontmatter);
          if (result) {
            removeTab(tab.id);
            openTab({
              id: result.path,
              filePath: result.path,
              fileName: result.fileName,
              content: tab.content,
              isDirty: false,
              frontmatter: tab.frontmatter,
            });
            return true;
          }
          return false;
        } else {
          await saveFile(tab.filePath, tab.content, tab.frontmatter);
          markTabDirty(tab.id, false);
          return true;
        }
      } catch {
        return false;
      }
    };

    return async (tabId?: string) => {
      // Get current state from store to avoid stale closures
      const currentState = useEditorStore.getState();
      const targetTabId = tabId ?? currentState.activeTabId;
      if (!targetTabId) return;

      const targetTab = currentState.tabs.find((t) => t.id === targetTabId);
      if (!targetTab) return;

      const { removeTab } = currentState;

      if (targetTab.isDirty) {
        const result = await fileSystemAdapter.confirmUnsavedChanges(
          targetTab.fileName,
        );
        if (result === "cancel") {
          return;
        }
        if (result === "save") {
          const saved = await handleSaveTab(targetTab);
          if (!saved) {
            return;
          }
          if (!targetTab.filePath) {
            return;
          }
        }
        removeTab(targetTab.id);
      } else {
        removeTab(targetTab.id);
      }
    };
  };

  it("does not close tab when user cancels the confirm dialog", async () => {
    // Setup: dirty untitled tab
    useEditorStore.setState({
      tabs: [
        {
          id: "untitled-1",
          filePath: "",
          fileName: "Untitled.md",
          content: "unsaved content",
          isDirty: true,
        },
      ],
      activeTabId: "untitled-1",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("cancel");

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // Tab should still exist
    expect(useEditorStore.getState().tabs).toHaveLength(1);
    expect(useEditorStore.getState().tabs[0].id).toBe("untitled-1");
  });

  it("closes tab without saving when user chooses discard", async () => {
    useEditorStore.setState({
      tabs: [
        {
          id: "untitled-1",
          filePath: "",
          fileName: "Untitled.md",
          content: "unsaved content",
          isDirty: true,
        },
      ],
      activeTabId: "untitled-1",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("discard");

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // Tab should be removed
    expect(useEditorStore.getState().tabs).toHaveLength(0);
    expect(saveFileAsSpy).not.toHaveBeenCalled();
  });

  it("does not close tab when user chooses save but cancels save dialog", async () => {
    useEditorStore.setState({
      tabs: [
        {
          id: "untitled-1",
          filePath: "",
          fileName: "Untitled.md",
          content: "unsaved content",
          isDirty: true,
        },
      ],
      activeTabId: "untitled-1",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("save");
    saveFileAsSpy.mockResolvedValue(null); // User cancelled save dialog

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // Tab should still exist because save was cancelled
    expect(useEditorStore.getState().tabs).toHaveLength(1);
    expect(useEditorStore.getState().tabs[0].id).toBe("untitled-1");
  });

  it("closes tab when user chooses save and save succeeds (untitled file)", async () => {
    useEditorStore.setState({
      tabs: [
        {
          id: "untitled-1",
          filePath: "",
          fileName: "Untitled.md",
          content: "unsaved content",
          isDirty: true,
        },
      ],
      activeTabId: "untitled-1",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("save");
    saveFileAsSpy.mockResolvedValue({
      path: "/path/to/saved.md",
      fileName: "saved.md",
    });

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // Old untitled tab should be replaced with new saved tab
    const tabs = useEditorStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe("/path/to/saved.md");
    expect(tabs[0].fileName).toBe("saved.md");
  });

  it("closes tab when user chooses save and save succeeds (existing file)", async () => {
    useEditorStore.setState({
      tabs: [
        {
          id: "/existing/file.md",
          filePath: "/existing/file.md",
          fileName: "file.md",
          content: "modified content",
          isDirty: true,
        },
      ],
      activeTabId: "/existing/file.md",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("save");
    saveFileSpy.mockResolvedValue(true);

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // Tab should be removed after successful save
    expect(useEditorStore.getState().tabs).toHaveLength(0);
    expect(saveFileSpy).toHaveBeenCalledWith(
      "/existing/file.md",
      "modified content",
      undefined,
    );
  });

  it("does not close tab when save fails", async () => {
    useEditorStore.setState({
      tabs: [
        {
          id: "/existing/file.md",
          filePath: "/existing/file.md",
          fileName: "file.md",
          content: "modified content",
          isDirty: true,
        },
      ],
      activeTabId: "/existing/file.md",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("save");
    saveFileSpy.mockRejectedValue(new Error("Save failed"));

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // Tab should still exist because save failed
    expect(useEditorStore.getState().tabs).toHaveLength(1);
  });

  it("closes clean tab immediately without confirmation", async () => {
    useEditorStore.setState({
      tabs: [
        {
          id: "tab-1",
          filePath: "/some/file.md",
          fileName: "file.md",
          content: "content",
          isDirty: false,
        },
      ],
      activeTabId: "tab-1",
    });

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab();

    // Tab should be removed without any confirmation
    expect(useEditorStore.getState().tabs).toHaveLength(0);
    expect(confirmUnsavedChangesSpy).not.toHaveBeenCalled();
  });

  it("closes only the active tab when multiple tabs exist (menu close)", async () => {
    useEditorStore.setState({
      tabs: [
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
      activeTabId: "tab-2",
    });

    const handleCloseTab = createHandleCloseTab();
    // Close without tabId - should close active tab (tab-2)
    await handleCloseTab();

    const tabs = useEditorStore.getState().tabs;
    expect(tabs).toHaveLength(2);
    expect(tabs.map((t) => t.id)).toEqual(["tab-1", "tab-3"]);
  });

  it("closes specific tab by ID when multiple tabs exist (X button)", async () => {
    useEditorStore.setState({
      tabs: [
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
      activeTabId: "tab-1", // Active is tab-1
    });

    const handleCloseTab = createHandleCloseTab();
    // Close tab-3 specifically (clicking X on non-active tab)
    await handleCloseTab("tab-3");

    const tabs = useEditorStore.getState().tabs;
    expect(tabs).toHaveLength(2);
    expect(tabs.map((t) => t.id)).toEqual(["tab-1", "tab-2"]);
    // Active tab should still be tab-1
    expect(useEditorStore.getState().activeTabId).toBe("tab-1");
  });

  it("prompts for correct tab when closing specific dirty tab by ID", async () => {
    useEditorStore.setState({
      tabs: [
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
      activeTabId: "tab-1",
    });

    confirmUnsavedChangesSpy.mockResolvedValue("discard");

    const handleCloseTab = createHandleCloseTab();
    // Close tab-2 by ID (not the active tab)
    await handleCloseTab("tab-2");

    // Should have prompted for tab-2, not tab-1
    expect(confirmUnsavedChangesSpy).toHaveBeenCalledWith("file2.md");
    expect(confirmUnsavedChangesSpy).not.toHaveBeenCalledWith("file1.md");

    const tabs = useEditorStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe("tab-1");
  });

  it("does nothing when closing non-existent tab ID", async () => {
    useEditorStore.setState({
      tabs: [
        {
          id: "tab-1",
          filePath: "/file1.md",
          fileName: "file1.md",
          content: "content 1",
          isDirty: false,
        },
      ],
      activeTabId: "tab-1",
    });

    const handleCloseTab = createHandleCloseTab();
    await handleCloseTab("non-existent-tab");

    // Nothing should have changed
    expect(useEditorStore.getState().tabs).toHaveLength(1);
  });
});
