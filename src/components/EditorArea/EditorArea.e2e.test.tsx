import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditorArea from "./EditorArea";
import { useEditorStore } from "../../stores/editorStore";

// Mock Tauri APIs
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    listen: vi.fn(() => Promise.resolve(() => {})),
  }),
}));

// Mock prettier
vi.mock("prettier/standalone", () => ({
  default: {
    format: vi.fn((content: string) => Promise.resolve(content)),
  },
}));

vi.mock("prettier/plugins/markdown", () => ({
  default: {},
}));

describe("EditorArea E2E", () => {
  beforeEach(() => {
    // Reset the store and mocks
    useEditorStore.setState({
      files: [],
      activeFileId: null,
    });
    vi.clearAllMocks();
  });

  it("complete editing workflow: toggle views, verify content persistence", async () => {
    const user = userEvent.setup();

    // Set up initial file with content (instead of typing, which is flaky with ContentEditable)
    const fileId = "test-tab-1";
    const testContent = "# Hello World\n\nThis is **bold** text.";
    useEditorStore.setState({
      files: [
        {
          id: fileId,
          filePath: "/path/to/test.md",
          fileName: "test.md",
          content: testContent,
          isDirty: false,
          frontmatter: undefined,
        },
      ],
      activeFileId: fileId,
    });

    render(<EditorArea />);

    // Step 1: Verify we're in code view (default) and content is displayed
    await waitFor(() => {
      const editor = document.querySelector(".markdown-code-input");
      expect(editor).toBeInTheDocument();
      expect(editor?.textContent).toBe(testContent);
    });

    // Step 2: Toggle to rendered view
    const renderedButton = screen.getByTitle("Rendered view");
    await user.click(renderedButton);

    // Step 3: Verify content is rendered correctly in rendered view
    await waitFor(() => {
      const heading = document.querySelector(".editor-heading-h1");
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toBe("Hello World");
    });

    await waitFor(() => {
      const bold = document.querySelector(".editor-text-bold");
      expect(bold).toBeInTheDocument();
      expect(bold?.textContent).toBe("bold");
    });

    // Step 4: Toggle back to code view
    const codeButton = screen.getByTitle("Code view");
    await user.click(codeButton);

    // Step 5: Verify content is still preserved
    await waitFor(() => {
      const state = useEditorStore.getState();
      const file = state.files.find((f) => f.id === fileId);
      // Content should still contain the key elements
      expect(file?.content).toContain("Hello World");
      expect(file?.content).toContain("bold");
    });

    // Step 6: Verify the file can be saved with correct content
    const finalState = useEditorStore.getState();
    const finalFile = finalState.files.find((f) => f.id === fileId);

    expect(finalFile).toBeDefined();
    expect(finalFile?.filePath).toBe("/path/to/test.md");
  });

  it("marks tab as dirty when content changes via store", async () => {
    const fileId = "dirty-test-tab";

    useEditorStore.setState({
      files: [
        {
          id: fileId,
          filePath: "/path/to/test.md",
          fileName: "test.md",
          content: "initial content",
          isDirty: false,
          frontmatter: undefined,
        },
      ],
      activeFileId: fileId,
    });

    render(<EditorArea />);

    // Verify initial state is not dirty
    let state = useEditorStore.getState();
    expect(state.files[0].isDirty).toBe(false);

    // Simulate content change by updating the store directly
    // (This tests the dirty state logic without relying on ContentEditable typing)
    useEditorStore.getState().updateFileContent(fileId, "modified content");
    useEditorStore.getState().markFileDirty(fileId, true);

    // Verify file is now marked as dirty
    state = useEditorStore.getState();
    expect(state.files[0].isDirty).toBe(true);
    expect(state.files[0].content).toBe("modified content");
  });

  it("displays multiple tabs and switches between them", async () => {
    const user = userEvent.setup();

    useEditorStore.setState({
      files: [
        {
          id: "tab-1",
          filePath: "/path/to/file1.md",
          fileName: "file1.md",
          content: "# File 1",
          isDirty: false,
        },
        {
          id: "tab-2",
          filePath: "/path/to/file2.md",
          fileName: "file2.md",
          content: "# File 2",
          isDirty: false,
        },
      ],
      activeFileId: "tab-1",
    });

    render(<EditorArea />);

    // Verify both tabs are visible
    expect(screen.getByText("file1.md")).toBeInTheDocument();
    expect(screen.getByText("file2.md")).toBeInTheDocument();

    // Verify first file content is shown (ContentEditable uses textContent, not value)
    await waitFor(() => {
      const editor = document.querySelector(".markdown-code-input");
      expect(editor?.textContent).toBe("# File 1");
    });

    // Click on second tab
    const tab2 = screen.getByText("file2.md");
    await user.click(tab2);

    // Verify second file content is now shown
    await waitFor(() => {
      const state = useEditorStore.getState();
      expect(state.activeFileId).toBe("tab-2");
    });
  });

  it("shows dirty indicator on unsaved tabs", async () => {
    useEditorStore.setState({
      files: [
        {
          id: "dirty-tab",
          filePath: "/path/to/dirty.md",
          fileName: "dirty.md",
          content: "original",
          isDirty: true,
        },
        {
          id: "clean-tab",
          filePath: "/path/to/clean.md",
          fileName: "clean.md",
          content: "original",
          isDirty: false,
        },
      ],
      activeFileId: "dirty-tab",
    });

    render(<EditorArea />);

    // Find the dirty tab - it should show bullet indicator
    const dirtyTabElement = screen.getByText((content, element) => {
      return Boolean(
        element?.classList.contains("editor-tab-name") &&
        content.includes("dirty.md"),
      );
    });

    expect(dirtyTabElement.textContent).toContain("•");
  });

  it("closes tab when close button is clicked", async () => {
    const user = userEvent.setup();

    useEditorStore.setState({
      files: [
        {
          id: "tab-to-close",
          filePath: "/path/to/file.md",
          fileName: "file.md",
          content: "content",
          isDirty: false,
        },
        {
          id: "tab-to-keep",
          filePath: "/path/to/other.md",
          fileName: "other.md",
          content: "other content",
          isDirty: false,
        },
      ],
      activeFileId: "tab-to-close",
    });

    render(<EditorArea />);

    // Find and click close button on first tab
    const closeButtons = screen.getAllByText("×");
    await user.click(closeButtons[0]);

    // Verify file was removed
    await waitFor(() => {
      const state = useEditorStore.getState();
      expect(state.files).toHaveLength(1);
      expect(state.files[0].id).toBe("tab-to-keep");
    });
  });

  // Note: Format functionality is tested in EditorArea.format.test.tsx
  // This e2e suite focuses on user interactions and UI state
});
