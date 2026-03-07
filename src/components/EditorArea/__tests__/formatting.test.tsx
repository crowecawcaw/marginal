import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";

describe("Formatting Tests", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("bold renders with correct element", async () => {
    h = await EditorTestHarness.create("This is **bold** text");

    expect(h.query.boldTexts()).toEqual(["bold"]);
  });

  it("italic renders with correct element", async () => {
    h = await EditorTestHarness.create("This is *italic* text");

    expect(h.query.italicTexts()).toEqual(["italic"]);
  });

  it("inline code renders correctly", async () => {
    h = await EditorTestHarness.create("Use `npm install` here");

    expect(h.query.codeTexts()).toEqual(["npm install"]);
  });

  it("strikethrough renders correctly", async () => {
    h = await EditorTestHarness.create("This is ~~deleted~~ text");

    expect(h.query.strikethroughTexts()).toEqual(["deleted"]);
  });

  it("bold+italic combined renders correctly", async () => {
    h = await EditorTestHarness.create("This is ***bolditalic*** text");

    expect(h.query.boldTexts().join("")).toContain("bolditalic");
    expect(h.query.italicTexts().join("")).toContain("bolditalic");
  });

  it("heading level 1 renders correctly", async () => {
    h = await EditorTestHarness.create("# Title");
    expect(h.query.heading(1)).toBe("Title");
  });

  it("heading level 2 renders correctly", async () => {
    h = await EditorTestHarness.create("## Subtitle");
    expect(h.query.heading(2)).toBe("Subtitle");
  });

  it("heading level 3 renders correctly", async () => {
    h = await EditorTestHarness.create("### Section");
    expect(h.query.heading(3)).toBe("Section");
  });

  it("heading level 4 renders correctly", async () => {
    h = await EditorTestHarness.create("#### Subsection");
    expect(h.query.heading(4)).toBe("Subsection");
  });

  it("heading level 5 renders correctly", async () => {
    h = await EditorTestHarness.create("##### Minor");
    expect(h.query.heading(5)).toBe("Minor");
  });

  it("Cmd+B dispatches bold formatting without error", async () => {
    h = await EditorTestHarness.create("# Hello");
    await h.bold();
  });

  it("Cmd+I dispatches italic formatting without error", async () => {
    h = await EditorTestHarness.create("# Hello");
    await h.italic();
  });

  it("Cmd+1..5 heading shortcuts dispatch without error", async () => {
    h = await EditorTestHarness.create("# Hello");
    for (let level = 1; level <= 5; level++) {
      await h.heading(level);
    }
  });
});
