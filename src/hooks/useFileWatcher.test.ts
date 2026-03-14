import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditorStore } from "../stores/editorStore";
import { useUIStore } from "../stores/uiStore";
import * as fileSystemAdapter from "../platform/fileSystemAdapter";
import * as platformIndex from "../platform";
import * as eventAdapter from "../platform/eventAdapter";

// Mock platform detection
vi.mock("../platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../platform")>();
  return {
    ...actual,
    isTauri: vi.fn(() => true),
  };
});

// Prevent uiStore's emitViewModeChange from trying to use real Tauri APIs
vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: vi.fn(() => ({
    emit: vi.fn().mockResolvedValue(undefined),
    listen: vi.fn().mockResolvedValue(() => {}),
  })),
}));

// Mock localStorage for store persistence
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageMock.store[key]; }),
  clear: vi.fn(() => { localStorageMock.store = {}; }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Import the hook after mocks are set up
import { useFileWatcher } from "./useFileWatcher";

function makeFile(overrides: Partial<ReturnType<typeof useEditorStore.getState>["files"][0]> = {}) {
  return {
    id: "test-file",
    filePath: "/test/file.md",
    fileName: "file.md",
    content: "line1\nline2",
    isDirty: false,
    baseContent: "line1\nline2",
    diskMtime: 1000,
    ignoredExternalChangeAt: null,
    pendingExternalContent: null,
    precomputedMerge: null,
    ...overrides,
  };
}

describe("useFileWatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.clear();

    useEditorStore.setState({ files: [], activeFileId: null });
    useUIStore.setState({ onExternalChange: "ask" } as any);

    vi.spyOn(fileSystemAdapter, "getFileMtime");
    vi.spyOn(fileSystemAdapter, "readFileContent");
    vi.spyOn(eventAdapter, "emit");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does nothing in web mode", async () => {
    (platformIndex.isTauri as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    useEditorStore.setState({ files: [makeFile()], activeFileId: "test-file" });

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(fileSystemAdapter.getFileMtime).not.toHaveBeenCalled();
    (platformIndex.isTauri as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  it("does nothing for files without a filePath", async () => {
    useEditorStore.setState({
      files: [makeFile({ filePath: "" })],
      activeFileId: "test-file",
    });
    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(fileSystemAdapter.getFileMtime).not.toHaveBeenCalled();
  });

  it("records initial diskMtime when diskMtime is null", async () => {
    useEditorStore.setState({
      files: [makeFile({ diskMtime: null })],
      activeFileId: "test-file",
    });
    (fileSystemAdapter.getFileMtime as ReturnType<typeof vi.fn>).mockResolvedValue(2000);

    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(useEditorStore.getState().files[0].diskMtime).toBe(2000);
    expect(fileSystemAdapter.readFileContent).not.toHaveBeenCalled();
  });

  it("does nothing when mtime is unchanged", async () => {
    useEditorStore.setState({
      files: [makeFile({ diskMtime: 1000 })],
      activeFileId: "test-file",
    });
    (fileSystemAdapter.getFileMtime as ReturnType<typeof vi.fn>).mockResolvedValue(1000);

    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(fileSystemAdapter.readFileContent).not.toHaveBeenCalled();
    expect(onDialog).not.toHaveBeenCalled();
  });

  it("sets diskMtime to null when file is deleted", async () => {
    useEditorStore.setState({
      files: [makeFile({ diskMtime: 1000 })],
      activeFileId: "test-file",
    });
    (fileSystemAdapter.getFileMtime as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(useEditorStore.getState().files[0].diskMtime).toBeNull();
    expect(onDialog).not.toHaveBeenCalled();
    expect(fileSystemAdapter.readFileContent).not.toHaveBeenCalled();
  });

  it("(ask setting) sets pendingExternalContent and opens dialog when mtime changes", async () => {
    useUIStore.setState({ onExternalChange: "ask" } as any);
    useEditorStore.setState({
      files: [makeFile({ diskMtime: 1000, content: "line1\nline2", baseContent: "line1\nline2" })],
      activeFileId: "test-file",
    });
    (fileSystemAdapter.getFileMtime as ReturnType<typeof vi.fn>).mockResolvedValue(2000);
    (fileSystemAdapter.readFileContent as ReturnType<typeof vi.fn>).mockResolvedValue("line1\nline2\nnew line");

    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
    });

    const file = useEditorStore.getState().files[0];
    expect(file.pendingExternalContent).toBe("line1\nline2\nnew line");
    expect(onDialog).toHaveBeenCalledWith("test-file");
    expect(file.diskMtime).toBe(2000);
  });

  it("(merge, no local edits) emits external-merge-content with new content", async () => {
    useUIStore.setState({ onExternalChange: "merge" } as any);
    useEditorStore.setState({
      files: [makeFile({ diskMtime: 1000, isDirty: false, content: "line1\nline2", baseContent: "line1\nline2" })],
      activeFileId: "test-file",
    });
    (fileSystemAdapter.getFileMtime as ReturnType<typeof vi.fn>).mockResolvedValue(2000);
    (fileSystemAdapter.readFileContent as ReturnType<typeof vi.fn>).mockResolvedValue("line1\nline2\nremote");

    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(eventAdapter.emit).toHaveBeenCalledWith("external-merge-content", {
      fileId: "test-file",
      content: "line1\nline2\nremote",
    });
    expect(onDialog).not.toHaveBeenCalled();
  });

  it("(merge, dirty, clean merge) auto-applies merged content", async () => {
    useUIStore.setState({ onExternalChange: "merge" } as any);
    // local added line3; remote added line2.5
    useEditorStore.setState({
      files: [makeFile({
        diskMtime: 1000,
        isDirty: true,
        content: "line1\nline2\nline3",   // ours added line3
        baseContent: "line1\nline2",
      })],
      activeFileId: "test-file",
    });
    (fileSystemAdapter.getFileMtime as ReturnType<typeof vi.fn>).mockResolvedValue(2000);
    // remote (theirs) is identical to base — only local changed; merge should return ours
    (fileSystemAdapter.readFileContent as ReturnType<typeof vi.fn>).mockResolvedValue("line1\nline2");

    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
    });

    // When base===theirs, merge3 returns ours
    expect(eventAdapter.emit).toHaveBeenCalledWith("external-merge-content", {
      fileId: "test-file",
      content: "line1\nline2\nline3",
    });
    expect(onDialog).not.toHaveBeenCalled();
  });

  it("(merge, dirty, conflict) falls back to ask dialog", async () => {
    useUIStore.setState({ onExternalChange: "merge" } as any);
    useEditorStore.setState({
      files: [makeFile({
        diskMtime: 1000,
        isDirty: true,
        content: "line1\nours changed\nline3",
        baseContent: "line1\noriginal\nline3",
      })],
      activeFileId: "test-file",
    });
    (fileSystemAdapter.getFileMtime as ReturnType<typeof vi.fn>).mockResolvedValue(2000);
    // Remote also changed the same line
    (fileSystemAdapter.readFileContent as ReturnType<typeof vi.fn>).mockResolvedValue("line1\ntheirs changed\nline3");

    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onDialog).toHaveBeenCalledWith("test-file");
    const file = useEditorStore.getState().files[0];
    expect(file.pendingExternalContent).toBe("line1\ntheirs changed\nline3");
    expect(file.precomputedMerge).toBeNull();
  });

  it("clears ignoredAt and re-processes when new mtime is newer", async () => {
    const ignoredTs = 1500;
    useUIStore.setState({ onExternalChange: "ask" } as any);
    useEditorStore.setState({
      files: [makeFile({
        diskMtime: 1000,
        ignoredExternalChangeAt: ignoredTs,
        content: "line1",
        baseContent: "line1",
      })],
      activeFileId: "test-file",
    });
    // New mtime is > ignoredTs
    (fileSystemAdapter.getFileMtime as ReturnType<typeof vi.fn>).mockResolvedValue(2000);
    (fileSystemAdapter.readFileContent as ReturnType<typeof vi.fn>).mockResolvedValue("line1\nnew");

    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
    });

    // ignoredAt should be cleared and dialog opened
    const file = useEditorStore.getState().files[0];
    expect(file.ignoredExternalChangeAt).toBeNull();
    expect(onDialog).toHaveBeenCalledWith("test-file");
  });

  it("triggers check on visibilitychange to visible", async () => {
    useEditorStore.setState({
      files: [makeFile({ diskMtime: 1000 })],
      activeFileId: "test-file",
    });
    (fileSystemAdapter.getFileMtime as ReturnType<typeof vi.fn>).mockResolvedValue(1000);

    const onDialog = vi.fn();
    renderHook(() => useFileWatcher(onDialog));

    // Simulate window becoming visible
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(fileSystemAdapter.getFileMtime).toHaveBeenCalled();
  });
});
