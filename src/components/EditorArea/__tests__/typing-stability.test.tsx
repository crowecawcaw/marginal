import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";

// Regression: when the Zustand store fires onChange and passes updated
// initialContent back down as a prop, the editor must NOT recreate itself.
// Recreation causes a visible flash and resets cursor position.
describe("Typing stability in rendered mode", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("editor DOM node is stable when initialContent prop changes", async () => {
    h = await EditorTestHarness.create("Hello");

    const nodeBefore = h.getEditorElement();

    // Simulate EditorArea pushing an updated initialContent back to the editor
    // (as happens when Milkdown fires markdownUpdated → Zustand store → re-render)
    await h.rerenderWithContent("Hello world");

    const nodeAfter = h.getEditorElement();
    expect(nodeAfter).toBe(nodeBefore);
  });
});
