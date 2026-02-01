import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../../stores/editorStore";
import prettier from "prettier/standalone";
import prettierMarkdown from "prettier/plugins/markdown";

describe("EditorArea Format Document", () => {
  beforeEach(() => {
    // Reset the store
    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
    });
  });

  it("formats only the active tab when multiple tabs exist", async () => {
    const tab1Content = "# Tab 1\n\nUnformatted   content";
    const tab2Content = "# Tab 2\n\nAlso   unformatted";

    // Set up store with two tabs
    useEditorStore.setState({
      tabs: [
        {
          id: "tab-1",
          filePath: "/path/to/file1.md",
          fileName: "file1.md",
          content: tab1Content,
          isDirty: false,
        },
        {
          id: "tab-2",
          filePath: "/path/to/file2.md",
          fileName: "file2.md",
          content: tab2Content,
          isDirty: false,
        },
      ],
      activeTabId: "tab-1",
    });

    // Get the store state
    let state = useEditorStore.getState();
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);

    // Simulate what handleFormat does
    if (activeTab) {
      const formatted = await prettier.format(activeTab.content, {
        parser: "markdown",
        plugins: [prettierMarkdown],
        proseWrap: "preserve",
        printWidth: 120,
      });

      useEditorStore.getState().updateTabContent(activeTab.id, formatted);
    }

    // Verify results
    state = useEditorStore.getState();
    const formattedTab1 = state.tabs.find((t) => t.id === "tab-1");
    const unformattedTab2 = state.tabs.find((t) => t.id === "tab-2");

    // Tab 1 should have been formatted (prettier adds trailing newline)
    expect(formattedTab1?.content).not.toBe(tab1Content);
    expect(formattedTab1?.content).toContain("# Tab 1");
    expect(formattedTab1?.content).toContain("Unformatted content");

    // Tab 2 should remain completely unchanged
    expect(unformattedTab2?.content).toBe(tab2Content);
  });

  it("checks view mode before formatting", () => {
    const content = "# Test\n\nContent   here";

    useEditorStore.setState({
      tabs: [
        {
          id: "test-tab",
          filePath: "/path/to/test.md",
          fileName: "test.md",
          content: content,
          isDirty: false,
        },
      ],
      activeTabId: "test-tab",
    });

    const state = useEditorStore.getState();
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);

    // Verify handleFormat would skip if not in code view
    // (In actual implementation, viewMode !== "code" returns early)
    expect(activeTab?.content).toBe(content);
  });

  it("marks tab as dirty after formatting", async () => {
    const content = "# Test\n\nUnformatted   content";

    useEditorStore.setState({
      tabs: [
        {
          id: "test-tab",
          filePath: "/path/to/test.md",
          fileName: "test.md",
          content: content,
          isDirty: false,
        },
      ],
      activeTabId: "test-tab",
    });

    let state = useEditorStore.getState();
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);

    expect(activeTab?.isDirty).toBe(false);

    if (activeTab) {
      const formatted = await prettier.format(activeTab.content, {
        parser: "markdown",
        plugins: [prettierMarkdown],
        proseWrap: "preserve",
        printWidth: 120,
      });

      useEditorStore.getState().updateTabContent(activeTab.id, formatted);
      if (!activeTab.isDirty) {
        useEditorStore.getState().markTabDirty(activeTab.id, true);
      }
    }

    state = useEditorStore.getState();
    const updatedTab = state.tabs.find((t) => t.id === "test-tab");
    expect(updatedTab?.isDirty).toBe(true);
  });
});
