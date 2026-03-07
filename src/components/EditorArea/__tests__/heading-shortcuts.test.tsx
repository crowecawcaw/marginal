import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";

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
      await h.waitForHeading(level);
    });
  }

  it("Cmd+1 then Cmd+2 converts h1 to h2", async () => {
    h = await EditorTestHarness.create("Some text");

    await h.heading(1);
    await h.waitForHeading(1);

    await h.heading(2);
    await h.waitForHeading(2);
    expect(h.query.heading(1)).toBeNull();
  });
});
