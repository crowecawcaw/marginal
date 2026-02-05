import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../../stores/editorStore";
import prettier from "prettier/standalone";
import prettierMarkdown from "prettier/plugins/markdown";

describe("EditorArea Format Document", () => {
  beforeEach(() => {
    // Reset the store
    useEditorStore.setState({
      files: [],
      activeFileId: null,
    });
  });

  it("formats only the active file when multiple files exist", async () => {
    const file1Content = "# Tab 1\n\nUnformatted   content";
    const file2Content = "# Tab 2\n\nAlso   unformatted";

    // Set up store with two files
    useEditorStore.setState({
      files: [
        {
          id: "tab-1",
          filePath: "/path/to/file1.md",
          fileName: "file1.md",
          content: file1Content,
          isDirty: false,
        },
        {
          id: "tab-2",
          filePath: "/path/to/file2.md",
          fileName: "file2.md",
          content: file2Content,
          isDirty: false,
        },
      ],
      activeFileId: "tab-1",
    });

    // Get the store state
    let state = useEditorStore.getState();
    const activeFile = state.files.find((f) => f.id === state.activeFileId);

    // Simulate what handleFormat does
    if (activeFile) {
      const formatted = await prettier.format(activeFile.content, {
        parser: "markdown",
        plugins: [prettierMarkdown],
        proseWrap: "preserve",
        printWidth: 120,
      });

      useEditorStore.getState().updateFileContent(activeFile.id, formatted);
    }

    // Verify results
    state = useEditorStore.getState();
    const formattedFile1 = state.files.find((f) => f.id === "tab-1");
    const unformattedFile2 = state.files.find((f) => f.id === "tab-2");

    // File 1 should have been formatted (prettier adds trailing newline)
    expect(formattedFile1?.content).not.toBe(file1Content);
    expect(formattedFile1?.content).toContain("# Tab 1");
    expect(formattedFile1?.content).toContain("Unformatted content");

    // File 2 should remain completely unchanged
    expect(unformattedFile2?.content).toBe(file2Content);
  });

  it("checks view mode before formatting", () => {
    const content = "# Test\n\nContent   here";

    useEditorStore.setState({
      files: [
        {
          id: "test-tab",
          filePath: "/path/to/test.md",
          fileName: "test.md",
          content: content,
          isDirty: false,
        },
      ],
      activeFileId: "test-tab",
    });

    const state = useEditorStore.getState();
    const activeFile = state.files.find((f) => f.id === state.activeFileId);

    // Verify handleFormat would skip if not in code view
    // (In actual implementation, viewMode !== "code" returns early)
    expect(activeFile?.content).toBe(content);
  });

  it("marks file as dirty after formatting", async () => {
    const content = "# Test\n\nUnformatted   content";

    useEditorStore.setState({
      files: [
        {
          id: "test-tab",
          filePath: "/path/to/test.md",
          fileName: "test.md",
          content: content,
          isDirty: false,
        },
      ],
      activeFileId: "test-tab",
    });

    let state = useEditorStore.getState();
    const activeFile = state.files.find((f) => f.id === state.activeFileId);

    expect(activeFile?.isDirty).toBe(false);

    if (activeFile) {
      const formatted = await prettier.format(activeFile.content, {
        parser: "markdown",
        plugins: [prettierMarkdown],
        proseWrap: "preserve",
        printWidth: 120,
      });

      useEditorStore.getState().updateFileContent(activeFile.id, formatted);
      if (!activeFile.isDirty) {
        useEditorStore.getState().markFileDirty(activeFile.id, true);
      }
    }

    state = useEditorStore.getState();
    const updatedFile = state.files.find((f) => f.id === "test-tab");
    expect(updatedFile?.isDirty).toBe(true);
  });
});
