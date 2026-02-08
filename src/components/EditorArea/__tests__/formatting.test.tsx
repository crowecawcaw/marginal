import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";

describe("Formatting Tests", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("bold renders with correct CSS class", async () => {
    h = await EditorTestHarness.create("This is **bold** text");

    const boldEls = document.querySelectorAll(".editor-text-bold");
    expect(boldEls.length).toBe(1);
    expect(boldEls[0].textContent).toBe("bold");
  });

  it("italic renders with correct CSS class", async () => {
    h = await EditorTestHarness.create("This is *italic* text");

    const italicEls = document.querySelectorAll(".editor-text-italic");
    expect(italicEls.length).toBe(1);
    expect(italicEls[0].textContent).toBe("italic");
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

    // bold+italic text should have both classes
    const el = document.querySelector(
      ".editor-text-bold.editor-text-italic"
    );
    expect(el).toBeTruthy();
    expect(el?.textContent).toBe("bolditalic");
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

  // Note: Cmd+B, Cmd+I, Cmd+1..5 shortcut tests are omitted here because
  // Lexical's selection handling triggers getBoundingClientRect in jsdom,
  // which is not supported. These shortcuts are covered by
  // EditorArea.shortcuts.test.tsx at the routing level.
});
