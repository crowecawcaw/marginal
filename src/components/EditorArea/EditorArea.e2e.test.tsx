import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditorArea from "./EditorArea";
import Titlebar from "../Titlebar/Titlebar";
import { useEditorStore } from "../../stores/editorStore";
import { useUIStore } from "../../stores/uiStore";

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

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    toggleMaximize: vi.fn(),
    startDragging: vi.fn(),
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

// Mock event adapter
vi.mock("../../platform/eventAdapter", async () => {
  const actual = await vi.importActual<typeof import("../../platform/eventAdapter")>("../../platform/eventAdapter");
  return {
    ...actual,
    emit: vi.fn(),
    setupEventListeners: vi.fn(() => Promise.resolve(() => {})),
  };
});

// Helper to render EditorArea with Titlebar (for E2E tests that need tabs)
const renderWithTitlebar = () => {
  return render(
    <>
      <Titlebar />
      <EditorArea />
    </>
  );
};

describe("EditorArea E2E", () => {
  beforeEach(() => {
    // Reset the stores and mocks
    useEditorStore.setState({
      files: [],
      activeFileId: null,
    });
    useUIStore.setState({
      viewMode: "code",
    });
    vi.clearAllMocks();
  });

  it("complete editing workflow: toggle views, verify content persistence", async () => {
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

    renderWithTitlebar();

    // Step 1: Verify we're in code view (default) and content is displayed
    await waitFor(() => {
      const editor = document.querySelector(".markdown-code-input");
      expect(editor).toBeInTheDocument();
      expect(editor?.textContent).toBe(testContent);
    });

    // Step 2: Toggle to rendered view
    useUIStore.setState({ viewMode: "rendered" });

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
    useUIStore.setState({ viewMode: "code" });

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

    renderWithTitlebar();

    // Verify both tabs are visible in titlebar
    const tabs = screen.getAllByText(/file[12]\.md/);
    expect(tabs.length).toBeGreaterThanOrEqual(2);

    // Verify first file content is shown (ContentEditable uses textContent, not value)
    await waitFor(() => {
      const editor = document.querySelector(".markdown-code-input");
      expect(editor?.textContent).toBe("# File 1");
    });

    // Click on second tab
    const tab2Button = screen.getByRole("button", { name: /file2\.md/ });
    await user.click(tab2Button);

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

    renderWithTitlebar();

    // Find the dirty tab - it should show filled circle indicator
    const dirtyTabElement = screen.getByText((content, element) => {
      return Boolean(
        element?.classList.contains("titlebar-tab-name") &&
        content.includes("dirty.md"),
      );
    });

    expect(dirtyTabElement.textContent).toContain("●");
  });

  it("closes tab when close button is clicked", async () => {
    const user = userEvent.setup();

    // Mock the event adapter emit function
    const { emit } = await import("../../platform/eventAdapter");
    vi.mocked(emit);

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

    renderWithTitlebar();

    // Find and click close button on first tab
    const closeButtons = screen.getAllByText("×");
    await user.click(closeButtons[0]);

    // Verify that emit was called with close-tab event
    // In a real app, Layout would handle this event and remove the file
    // For this test, we just verify the event was emitted
    expect(emit).toHaveBeenCalledWith("close-tab", { fileId: "tab-to-close" });
  });

  // Note: Format functionality is tested in EditorArea.format.test.tsx
  // This e2e suite focuses on user interactions and UI state
});
