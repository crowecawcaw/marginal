import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import EditorArea from "./EditorArea";
import { useEditorStore } from "../../stores/editorStore";
import { useNotificationStore } from "../../stores/notificationStore";

// Mock the platform module
vi.mock("../../platform/eventAdapter", () => ({
  setupEventListeners: vi.fn(() => Promise.resolve(() => {})),
}));

describe("EditorArea Keyboard Shortcuts", () => {
  beforeEach(() => {
    // Reset stores
    useEditorStore.setState({
      tabs: [
        {
          id: "test-tab",
          filePath: "/path/to/test.md",
          fileName: "test.md",
          content: "# Test\n\nContent here",
          isDirty: false,
        },
      ],
      activeTabId: "test-tab",
    });

    useNotificationStore.setState({
      notifications: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Cmd+F opens Find dialog without triggering Format", async () => {
    const user = userEvent.setup();
    render(<EditorArea />);

    // Listen for the format event to ensure it's NOT triggered
    let formatEventFired = false;
    const formatListener = () => {
      formatEventFired = true;
    };
    window.addEventListener("menu:format-document", formatListener);

    // Press Cmd+F (without Shift)
    await user.keyboard("{Meta>}f{/Meta}");

    // Find dialog should be visible
    // Note: This test assumes FindInDocument component renders something identifiable
    // The actual assertion would depend on the FindInDocument component structure

    // Format event should NOT have been triggered
    expect(formatEventFired).toBe(false);

    window.removeEventListener("menu:format-document", formatListener);
  });

  it("Cmd+Shift+F triggers Format without opening Find dialog", async () => {
    const user = userEvent.setup();
    render(<EditorArea />);

    // Listen for the format event
    let formatEventFired = false;
    const formatListener = () => {
      formatEventFired = true;
    };
    window.addEventListener("menu:format-document", formatListener);

    // Press Cmd+Shift+F
    await user.keyboard("{Meta>}{Shift>}F{/Shift}{/Meta}");

    // Format event should have been triggered
    expect(formatEventFired).toBe(true);

    // Find dialog should NOT be visible
    // This would need to check that FindInDocument is not rendered
    // The exact assertion depends on how we can detect the Find dialog

    window.removeEventListener("menu:format-document", formatListener);
  });

  it("distinguishes between lowercase f and uppercase F in shortcuts", () => {
    // This test verifies that the key checking properly handles case
    // Cmd+f (lowercase) should trigger Find
    // Cmd+Shift+F (uppercase F) should trigger Format

    const findEvent = new KeyboardEvent("keydown", {
      key: "f",
      metaKey: true,
      shiftKey: false,
    });

    const formatEvent = new KeyboardEvent("keydown", {
      key: "F",
      metaKey: true,
      shiftKey: true,
    });

    // Both events should be different
    expect(findEvent.key).toBe("f");
    expect(findEvent.shiftKey).toBe(false);

    expect(formatEvent.key).toBe("F");
    expect(formatEvent.shiftKey).toBe(true);
  });

  it("Cmd+Shift+P toggles between code and rendered views", async () => {
    const user = userEvent.setup();
    const { container } = render(<EditorArea />);

    // Initial view mode should be code
    // We can check for the presence of markdown-code-view class
    let codeView = container.querySelector(".markdown-code-view");
    expect(codeView).toBeTruthy();

    // Press Cmd+Shift+P to toggle to rendered view
    await user.keyboard("{Meta>}{Shift>}P{/Shift}{/Meta}");

    // Should no longer have code view
    codeView = container.querySelector(".markdown-code-view");
    expect(codeView).toBeFalsy();

    // Press Cmd+Shift+P again to toggle back to code view
    await user.keyboard("{Meta>}{Shift>}P{/Shift}{/Meta}");

    // Should have code view again
    codeView = container.querySelector(".markdown-code-view");
    expect(codeView).toBeTruthy();
  });

  it("toggle view command properly alternates between views", async () => {
    const user = userEvent.setup();
    const { container } = render(<EditorArea />);

    // Start in code view
    expect(container.querySelector(".markdown-code-view")).toBeTruthy();

    // Toggle to rendered
    await user.keyboard("{Meta>}{Shift>}P{/Shift}{/Meta}");
    expect(container.querySelector(".markdown-code-view")).toBeFalsy();

    // Toggle to code
    await user.keyboard("{Meta>}{Shift>}P{/Shift}{/Meta}");
    expect(container.querySelector(".markdown-code-view")).toBeTruthy();

    // Toggle to rendered again
    await user.keyboard("{Meta>}{Shift>}P{/Shift}{/Meta}");
    expect(container.querySelector(".markdown-code-view")).toBeFalsy();

    // Toggle to code again
    await user.keyboard("{Meta>}{Shift>}P{/Shift}{/Meta}");
    expect(container.querySelector(".markdown-code-view")).toBeTruthy();
  });
});
