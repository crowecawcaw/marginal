import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEditorStore } from "./editorStore";

// Mock Tauri store
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: { load: vi.fn() },
}));

// Mock autosave module
const mockSaveEntry = vi.fn().mockResolvedValue(undefined);
const mockRemoveEntry = vi.fn().mockResolvedValue(undefined);
vi.mock("../utils/autosave", () => ({
  saveAutosaveEntry: (...args: any[]) => mockSaveEntry(...args),
  removeAutosaveEntry: (...args: any[]) => mockRemoveEntry(...args),
}));

// Must import after mocks are set up
import { setupAutosaveSubscription } from "./autosaveSubscription";

describe("autosaveSubscription", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useEditorStore.setState({ files: [], activeFileId: null });
    mockSaveEntry.mockClear();
    mockRemoveEntry.mockClear();
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.useRealTimers();
  });

  it("autosave triggers after 5s debounce on dirty file content change", () => {
    // Open a file first (so prevState has it)
    useEditorStore.getState().openFile({
      id: "file-1",
      filePath: "/test.md",
      fileName: "test.md",
      content: "original",
      isDirty: false,
    });

    cleanup = setupAutosaveSubscription();

    // Simulate content change + dirty
    useEditorStore.getState().updateFileContent("file-1", "changed content");
    useEditorStore.getState().markFileDirty("file-1", true);

    // Need to trigger subscription with dirty + content change in same update
    // Let's reset and do it properly
    mockSaveEntry.mockClear();

    // Now the file is dirty, update content again
    useEditorStore.getState().updateFileContent("file-1", "changed again");

    expect(mockSaveEntry).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(mockSaveEntry).toHaveBeenCalledWith("file-1", expect.objectContaining({
      content: "changed again",
      fileName: "test.md",
      filePath: "/test.md",
    }));
  });

  it("debounce resets on subsequent changes within 5s", () => {
    useEditorStore.getState().openFile({
      id: "file-1",
      filePath: "/test.md",
      fileName: "test.md",
      content: "original",
      isDirty: true,
    });

    cleanup = setupAutosaveSubscription();

    useEditorStore.getState().updateFileContent("file-1", "change 1");
    vi.advanceTimersByTime(3000);
    expect(mockSaveEntry).not.toHaveBeenCalled();

    useEditorStore.getState().updateFileContent("file-1", "change 2");
    vi.advanceTimersByTime(3000);
    // Still not called - timer was reset
    expect(mockSaveEntry).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(mockSaveEntry).toHaveBeenCalledTimes(1);
    expect(mockSaveEntry).toHaveBeenCalledWith("file-1", expect.objectContaining({
      content: "change 2",
    }));
  });

  it("no autosave when file is not dirty", () => {
    useEditorStore.getState().openFile({
      id: "file-1",
      filePath: "/test.md",
      fileName: "test.md",
      content: "original",
      isDirty: false,
    });

    cleanup = setupAutosaveSubscription();

    useEditorStore.getState().updateFileContent("file-1", "changed");

    vi.advanceTimersByTime(10000);
    expect(mockSaveEntry).not.toHaveBeenCalled();
  });

  it("autosave entry cleared when file is removed from editor", () => {
    useEditorStore.getState().openFile({
      id: "file-1",
      filePath: "/test.md",
      fileName: "test.md",
      content: "original",
      isDirty: true,
    });

    cleanup = setupAutosaveSubscription();

    // Trigger a content change to start a timer
    useEditorStore.getState().updateFileContent("file-1", "changed");

    // Remove the file before timer fires
    useEditorStore.getState().removeFile("file-1");

    expect(mockRemoveEntry).toHaveBeenCalledWith("file-1");

    // Timer should not fire
    vi.advanceTimersByTime(10000);
    expect(mockSaveEntry).not.toHaveBeenCalled();
  });

  it("separate debounce timers per file", () => {
    useEditorStore.getState().openFile({
      id: "file-1",
      filePath: "/a.md",
      fileName: "a.md",
      content: "a",
      isDirty: true,
    });
    useEditorStore.getState().openFile({
      id: "file-2",
      filePath: "/b.md",
      fileName: "b.md",
      content: "b",
      isDirty: true,
    });

    cleanup = setupAutosaveSubscription();

    useEditorStore.getState().updateFileContent("file-1", "a changed");
    vi.advanceTimersByTime(3000);

    useEditorStore.getState().updateFileContent("file-2", "b changed");
    vi.advanceTimersByTime(2000);

    // file-1's timer should have fired (5s total)
    expect(mockSaveEntry).toHaveBeenCalledTimes(1);
    expect(mockSaveEntry).toHaveBeenCalledWith("file-1", expect.objectContaining({
      content: "a changed",
    }));

    vi.advanceTimersByTime(3000);
    // file-2's timer fires (5s from its change)
    expect(mockSaveEntry).toHaveBeenCalledTimes(2);
    expect(mockSaveEntry).toHaveBeenCalledWith("file-2", expect.objectContaining({
      content: "b changed",
    }));
  });

  it("cleanup cancels pending timers", () => {
    useEditorStore.getState().openFile({
      id: "file-1",
      filePath: "/test.md",
      fileName: "test.md",
      content: "original",
      isDirty: true,
    });

    cleanup = setupAutosaveSubscription();

    useEditorStore.getState().updateFileContent("file-1", "changed");

    // Cleanup before timer fires
    cleanup();
    cleanup = undefined;

    vi.advanceTimersByTime(10000);
    expect(mockSaveEntry).not.toHaveBeenCalled();
  });
});
