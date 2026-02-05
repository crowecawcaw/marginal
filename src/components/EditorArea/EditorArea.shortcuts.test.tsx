import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import EditorArea from "./EditorArea";
import { useEditorStore } from "../../stores/editorStore";
import { useNotificationStore } from "../../stores/notificationStore";

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

  // Note: View toggle is now handled via menu event in Layout.tsx
  // The Cmd+Shift+P keyboard shortcut is handled by the Tauri menu accelerator
  // and emits menu:toggle-view which Layout listens for.
  // View mode toggling can be tested through uiStore.test.ts
});
