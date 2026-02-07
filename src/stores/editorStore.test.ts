import { describe, it, expect, beforeEach, vi } from "vitest";
import { useEditorStore } from "./editorStore";
import { loadSettings } from "../utils/settings";

// Mock Tauri store so saveSettings doesn't error
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: { load: vi.fn() },
}));

describe("editorStore open-files persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    useEditorStore.setState({ files: [], activeFileId: null });
  });

  it("persists file paths to settings when a file is opened", () => {
    useEditorStore.getState().openFile({
      id: "/path/to/file.md",
      filePath: "/path/to/file.md",
      fileName: "file.md",
      content: "",
      isDirty: false,
    });

    const settings = loadSettings();
    expect(settings.openFiles).toEqual(["/path/to/file.md"]);
    expect(settings.activeFilePath).toBe("/path/to/file.md");
  });

  it("filters out untitled files with empty filePath", () => {
    useEditorStore.getState().openFile({
      id: "untitled-1",
      filePath: "",
      fileName: "Untitled.md",
      content: "",
      isDirty: false,
    });

    const settings = loadSettings();
    expect(settings.openFiles).toEqual([]);
    expect(settings.activeFilePath).toBe(null);
  });

  it("persists multiple file paths in order", () => {
    const { openFile } = useEditorStore.getState();

    openFile({
      id: "/path/a.md",
      filePath: "/path/a.md",
      fileName: "a.md",
      content: "",
      isDirty: false,
    });
    openFile({
      id: "/path/b.md",
      filePath: "/path/b.md",
      fileName: "b.md",
      content: "",
      isDirty: false,
    });

    const settings = loadSettings();
    expect(settings.openFiles).toEqual(["/path/a.md", "/path/b.md"]);
    expect(settings.activeFilePath).toBe("/path/b.md");
  });

  it("updates settings when a file is removed", () => {
    const { openFile } = useEditorStore.getState();
    openFile({
      id: "/path/a.md",
      filePath: "/path/a.md",
      fileName: "a.md",
      content: "",
      isDirty: false,
    });
    openFile({
      id: "/path/b.md",
      filePath: "/path/b.md",
      fileName: "b.md",
      content: "",
      isDirty: false,
    });

    useEditorStore.getState().removeFile("/path/a.md");

    const settings = loadSettings();
    expect(settings.openFiles).toEqual(["/path/b.md"]);
  });

  it("updates activeFilePath when active file changes", () => {
    const { openFile } = useEditorStore.getState();
    openFile({
      id: "/path/a.md",
      filePath: "/path/a.md",
      fileName: "a.md",
      content: "",
      isDirty: false,
    });
    openFile({
      id: "/path/b.md",
      filePath: "/path/b.md",
      fileName: "b.md",
      content: "",
      isDirty: false,
    });

    useEditorStore.getState().setActiveFile("/path/a.md");

    const settings = loadSettings();
    expect(settings.activeFilePath).toBe("/path/a.md");
  });

  it("mixes real and untitled files, only persisting real ones", () => {
    const { openFile } = useEditorStore.getState();
    openFile({
      id: "/path/real.md",
      filePath: "/path/real.md",
      fileName: "real.md",
      content: "",
      isDirty: false,
    });
    openFile({
      id: "untitled-1",
      filePath: "",
      fileName: "Untitled.md",
      content: "",
      isDirty: false,
    });

    const settings = loadSettings();
    expect(settings.openFiles).toEqual(["/path/real.md"]);
  });
});
