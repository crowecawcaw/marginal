import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";
import { waitFor } from "@testing-library/react";

// Why the old test missed this: formatting.test.tsx "Cmd+1..5 heading shortcuts dispatch
// without error" only checked that no exception was thrown — it never verified the
// paragraph was actually converted to a heading element in the DOM.

describe("Heading keyboard shortcuts in rendered mode", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  for (let level = 1; level <= 5; level++) {
    it(`Cmd+${level} converts a paragraph to h${level}`, async () => {
      h = await EditorTestHarness.create("Plain paragraph text");

      // Sanity: starts as paragraph, not a heading
      expect(document.querySelector(`.milkdown-editor h${level}`)).toBeNull();

      // Press Cmd+{level} on the ProseMirror editor
      const pmEl = document.querySelector(".milkdown-editor .ProseMirror") as HTMLElement;
      pmEl.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: String(level),
          code: `Digit${level}`,
          metaKey: true,
          bubbles: true,
          cancelable: true,
        })
      );

      // The paragraph should now be an h{level}
      await waitFor(() => {
        const heading = document.querySelector(`.milkdown-editor h${level}`);
        if (!heading) throw new Error(`h${level} not found after Cmd+${level}`);
      });
    });
  }

  it("Cmd+1 then Cmd+2 converts h1 to h2", async () => {
    h = await EditorTestHarness.create("Some text");

    const pmEl = document.querySelector(".milkdown-editor .ProseMirror") as HTMLElement;

    pmEl.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "1",
        code: "Digit1",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      })
    );

    await waitFor(() => {
      if (!document.querySelector(".milkdown-editor h1"))
        throw new Error("h1 not found");
    });

    pmEl.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "2",
        code: "Digit2",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      })
    );

    await waitFor(() => {
      if (!document.querySelector(".milkdown-editor h2"))
        throw new Error("h2 not found after Cmd+2");
    });
    expect(document.querySelector(".milkdown-editor h1")).toBeNull();
  });
});
