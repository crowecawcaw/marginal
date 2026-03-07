import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";
import { waitFor } from "@testing-library/react";

describe("Heading keyboard shortcuts in rendered mode", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  for (let level = 1; level <= 5; level++) {
    it(`Cmd+${level} converts a paragraph to h${level}`, async () => {
      h = await EditorTestHarness.create("Plain paragraph text");

      expect(h.query.heading(level)).toBeNull();

      await h.heading(level);

      await waitFor(() => {
        if (h.query.heading(level) === null)
          throw new Error(`h${level} not found after Cmd+${level}`);
      });
    });
  }

  it("Cmd+1 then Cmd+2 converts h1 to h2", async () => {
    h = await EditorTestHarness.create("Some text");

    await h.heading(1);
    await waitFor(() => {
      if (h.query.heading(1) === null) throw new Error("h1 not found");
    });

    await h.heading(2);
    await waitFor(() => {
      if (h.query.heading(2) === null) throw new Error("h2 not found after Cmd+2");
    });
    expect(h.query.heading(1)).toBeNull();
  });
});
