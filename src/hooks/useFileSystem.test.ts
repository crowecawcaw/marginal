import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileSystem } from "./useFileSystem";
import { useEditorStore } from "../stores/editorStore";
import { useFileStore } from "../stores/fileStore";

// Mock Tauri APIs
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

// Mock platform detection
vi.mock("../platform", () => ({
  isTauri: vi.fn(() => true),
}));

describe("useFileSystem", () => {
  beforeEach(() => {
    // Reset all stores before each test
    useEditorStore.setState({
      files: [],
      activeFileId: null,
    });

    useFileStore.setState({
      rootPath: null,
      fileTree: [],
      recentFiles: [],
    });

    vi.clearAllMocks();
  });

  describe("newFile - untitled file name incrementing", () => {
    it('creates "Untitled.md" when no files exist', () => {
      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(1);
      expect(files[0].fileName).toBe("Untitled.md");
    });

    it('creates "Untitled2.md" when "Untitled.md" exists', () => {
      // Set up initial state with Untitled.md
      useEditorStore.setState({
        files: [
          {
            id: "untitled-1",
            filePath: "",
            fileName: "Untitled.md",
            content: "",
            isDirty: false,
          },
        ],
        activeFileId: "untitled-1",
      });

      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(2);
      expect(files[1].fileName).toBe("Untitled2.md");
    });

    it('creates "Untitled3.md" when "Untitled.md" and "Untitled2.md" exist', () => {
      useEditorStore.setState({
        files: [
          {
            id: "untitled-1",
            filePath: "",
            fileName: "Untitled.md",
            content: "",
            isDirty: false,
          },
          {
            id: "untitled-2",
            filePath: "",
            fileName: "Untitled2.md",
            content: "",
            isDirty: false,
          },
        ],
        activeFileId: "untitled-1",
      });

      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(3);
      expect(files[2].fileName).toBe("Untitled3.md");
    });

    it('creates "Untitled.md" when no untitled files exist', () => {
      useEditorStore.setState({
        files: [
          {
            id: "file-1",
            filePath: "/path/to/file.md",
            fileName: "file.md",
            content: "",
            isDirty: false,
          },
        ],
        activeFileId: "file-1",
      });

      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(2);
      expect(files[1].fileName).toBe("Untitled.md");
    });

    it("increments from highest number when gaps exist", () => {
      useEditorStore.setState({
        files: [
          {
            id: "untitled-1",
            filePath: "",
            fileName: "Untitled.md",
            content: "",
            isDirty: false,
          },
          {
            id: "untitled-3",
            filePath: "",
            fileName: "Untitled3.md",
            content: "",
            isDirty: false,
          },
        ],
        activeFileId: "untitled-1",
      });

      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(3);
      expect(files[2].fileName).toBe("Untitled4.md");
    });

    it("handles non-sequential numbers correctly", () => {
      useEditorStore.setState({
        files: [
          {
            id: "untitled-5",
            filePath: "",
            fileName: "Untitled5.md",
            content: "",
            isDirty: false,
          },
          {
            id: "untitled-10",
            filePath: "",
            fileName: "Untitled10.md",
            content: "",
            isDirty: false,
          },
          {
            id: "untitled-1",
            filePath: "",
            fileName: "Untitled.md",
            content: "",
            isDirty: false,
          },
        ],
        activeFileId: "untitled-5",
      });

      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(4);
      expect(files[3].fileName).toBe("Untitled11.md");
    });

    it("creates new file with empty content and no frontmatter", () => {
      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const files = useEditorStore.getState().files;
      expect(files[0].content).toBe("");
      expect(files[0].isDirty).toBe(false);
      expect(files[0].frontmatter).toBeUndefined();
      expect(files[0].filePath).toBe("");
    });

    it("generates unique file IDs with timestamp format", () => {
      const { result } = renderHook(() => useFileSystem());

      // Create first file
      const beforeTime = Date.now();
      act(() => {
        result.current.newFile();
      });
      const afterTime = Date.now();

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(1);

      const id = files[0].id;
      expect(id).toMatch(/^untitled-\d+$/);

      // Extract timestamp from ID
      const timestamp = parseInt(id.replace("untitled-", ""));
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("openFile", () => {
    it("opens file with dialog and adds to editor", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;
      const mockOpen = (await import("@tauri-apps/plugin-dialog")).open as any;

      mockOpen.mockResolvedValue("/path/to/test.md");
      mockInvoke.mockResolvedValue("# Test Content\n\nHello World");

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.openFile();
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(1);
      expect(files[0].fileName).toBe("test.md");
      expect(files[0].filePath).toBe("/path/to/test.md");
      expect(files[0].content).toBe("# Test Content\n\nHello World");
      expect(files[0].isDirty).toBe(false);
    });

    it("opens file with provided path directly", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;

      mockInvoke.mockResolvedValue("# Direct Open\n\nContent");

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.openFile("/direct/path/file.md");
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(1);
      expect(files[0].fileName).toBe("file.md");
      expect(files[0].filePath).toBe("/direct/path/file.md");
      expect(files[0].content).toBe("# Direct Open\n\nContent");
    });

    it("parses frontmatter when opening file", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;
      const mockOpen = (await import("@tauri-apps/plugin-dialog")).open as any;

      mockOpen.mockResolvedValue("/path/to/frontmatter.md");
      mockInvoke.mockResolvedValue(
        `---
title: Test Document
author: John Doe
---

# Content here`,
      );

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.openFile();
      });

      const files = useEditorStore.getState().files;
      expect(files[0].frontmatter).toEqual({
        title: "Test Document",
        author: "John Doe",
      });
      // gray-matter includes the newline after frontmatter in content
      expect(files[0].content.trim()).toBe("# Content here");
    });

    it("adds file to recent files when opened", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;
      const mockOpen = (await import("@tauri-apps/plugin-dialog")).open as any;

      mockOpen.mockResolvedValue("/path/to/recent.md");
      mockInvoke.mockResolvedValue("# Recent File");

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.openFile();
      });

      const recentFiles = useFileStore.getState().recentFiles;
      expect(recentFiles).toContain("/path/to/recent.md");
    });

    it("does nothing when dialog is cancelled", async () => {
      const mockOpen = (await import("@tauri-apps/plugin-dialog")).open as any;

      mockOpen.mockResolvedValue(null);

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.openFile();
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(0);
    });
  });

  describe("restoreFiles", () => {
    it("restores multiple files from paths", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;

      mockInvoke
        .mockResolvedValueOnce("# File A")
        .mockResolvedValueOnce("# File B");

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.restoreFiles(
          ["/path/a.md", "/path/b.md"],
          null,
        );
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(2);
      expect(files[0].filePath).toBe("/path/a.md");
      expect(files[0].content).toBe("# File A");
      expect(files[1].filePath).toBe("/path/b.md");
      expect(files[1].content).toBe("# File B");
    });

    it("silently skips files that fail to read", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;

      mockInvoke
        .mockResolvedValueOnce("# File A")
        .mockRejectedValueOnce(new Error("File not found"))
        .mockResolvedValueOnce("# File C");

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.restoreFiles(
          ["/path/a.md", "/path/missing.md", "/path/c.md"],
          null,
        );
      });

      const files = useEditorStore.getState().files;
      expect(files).toHaveLength(2);
      expect(files[0].filePath).toBe("/path/a.md");
      expect(files[1].filePath).toBe("/path/c.md");
    });

    it("sets the active file to activeFilePath", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;

      mockInvoke
        .mockResolvedValueOnce("# File A")
        .mockResolvedValueOnce("# File B");

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.restoreFiles(
          ["/path/a.md", "/path/b.md"],
          "/path/a.md",
        );
      });

      expect(useEditorStore.getState().activeFileId).toBe("/path/a.md");
    });

    it("does not set active file if activeFilePath was not restored", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;

      mockInvoke.mockResolvedValueOnce("# File A");

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.restoreFiles(
          ["/path/a.md"],
          "/path/missing.md",
        );
      });

      // activeFileId should be /path/a.md (set by openFile, not overridden)
      expect(useEditorStore.getState().activeFileId).toBe("/path/a.md");
    });

    it("handles empty paths array", async () => {
      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.restoreFiles([], null);
      });

      expect(useEditorStore.getState().files).toHaveLength(0);
    });

    it("parses frontmatter when restoring files", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;

      mockInvoke.mockResolvedValueOnce(
        `---
title: Restored Doc
---

# Content`,
      );

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.restoreFiles(["/path/doc.md"], null);
      });

      const files = useEditorStore.getState().files;
      expect(files[0].frontmatter).toEqual({ title: "Restored Doc" });
      expect(files[0].content.trim()).toBe("# Content");
    });
  });

  describe("saveFile", () => {
    it("saves file content without frontmatter", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.saveFile("/path/to/save.md", "# Test Content");
      });

      expect(mockInvoke).toHaveBeenCalledWith("write_file_content", {
        path: "/path/to/save.md",
        content: "# Test Content",
      });
    });

    it("saves file content with frontmatter", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.saveFile(
          "/path/to/save.md",
          "# Test Content",
          { title: "Test", author: "Jane" },
        );
      });

      expect(mockInvoke).toHaveBeenCalled();
      const call = mockInvoke.mock.calls[0];
      expect(call[0]).toBe("write_file_content");
      expect(call[1].path).toBe("/path/to/save.md");
      // gray-matter may format with/without trailing newline, just check it has the right parts
      expect(call[1].content).toContain("title: Test");
      expect(call[1].content).toContain("author: Jane");
      expect(call[1].content).toContain("# Test Content");
    });

    it("returns true on successful save", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileSystem());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveFile(
          "/path/to/save.md",
          "Content",
        );
      });

      expect(saveResult).toBe(true);
    });

    it("throws error on save failure", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;
      mockInvoke.mockRejectedValue(new Error("Write failed"));

      const { result } = renderHook(() => useFileSystem());

      await expect(
        act(async () => {
          await result.current.saveFile("/path/to/fail.md", "Content");
        }),
      ).rejects.toThrow("Write failed");
    });
  });

  describe("saveFileAs", () => {
    it("shows save dialog and saves file", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;
      const mockSave = (await import("@tauri-apps/plugin-dialog")).save as any;

      mockSave.mockResolvedValue("/path/to/newfile.md");
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileSystem());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveFileAs("# New Content");
      });

      expect(mockSave).toHaveBeenCalledWith({
        defaultPath: "Untitled.md",
        filters: [
          {
            name: "Markdown",
            extensions: ["md", "markdown"],
          },
        ],
      });
      expect(mockInvoke).toHaveBeenCalledWith("write_file_content", {
        path: "/path/to/newfile.md",
        content: "# New Content",
      });
      expect(saveResult).toEqual({
        path: "/path/to/newfile.md",
        fileName: "newfile.md",
      });
    });

    it("saves with frontmatter when provided", async () => {
      const mockInvoke = (await import("@tauri-apps/api/core")).invoke as any;
      const mockSave = (await import("@tauri-apps/plugin-dialog")).save as any;

      mockSave.mockResolvedValue("/path/to/withfm.md");
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileSystem());

      await act(async () => {
        await result.current.saveFileAs("# Content", { title: "Doc" });
      });

      expect(mockInvoke).toHaveBeenCalled();
      const call = mockInvoke.mock.calls[0];
      expect(call[0]).toBe("write_file_content");
      expect(call[1].path).toBe("/path/to/withfm.md");
      // Check frontmatter and content are present
      expect(call[1].content).toContain("title: Doc");
      expect(call[1].content).toContain("# Content");
    });

    it("returns null when dialog is cancelled", async () => {
      const mockSave = (await import("@tauri-apps/plugin-dialog")).save as any;

      mockSave.mockResolvedValue(null);

      const { result } = renderHook(() => useFileSystem());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.saveFileAs("# Content");
      });

      expect(saveResult).toBeNull();
    });
  });
});
