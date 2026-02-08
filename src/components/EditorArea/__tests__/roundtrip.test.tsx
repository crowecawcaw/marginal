import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";

describe("Roundtrip Tests", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("preserves bold text through rendered → code → rendered", async () => {
    h = await EditorTestHarness.create("This is **bold** text");

    expect(h.query.boldTexts()).toEqual(["bold"]);

    await h.toggleView(); // → code
    expect(h.getCodeViewText()).toContain("**bold**");

    await h.toggleView(); // → rendered
    expect(h.query.boldTexts()).toEqual(["bold"]);
  });

  it("preserves italic text through roundtrip", async () => {
    h = await EditorTestHarness.create("This is *italic* text");

    expect(h.query.italicTexts()).toEqual(["italic"]);

    await h.toggleView();
    expect(h.getCodeViewText()).toContain("*italic*");

    await h.toggleView();
    expect(h.query.italicTexts()).toEqual(["italic"]);
  });

  it("preserves bold + italic together through roundtrip", async () => {
    h = await EditorTestHarness.create(
      "Text with **bold** and *italic* formatting"
    );

    expect(h.query.boldTexts()).toEqual(["bold"]);
    expect(h.query.italicTexts()).toEqual(["italic"]);

    await h.toggleView();
    expect(h.getCodeViewText()).toContain("**bold**");
    expect(h.getCodeViewText()).toContain("*italic*");

    await h.toggleView();
    expect(h.query.boldTexts()).toEqual(["bold"]);
    expect(h.query.italicTexts()).toEqual(["italic"]);
  });

  it("is stable through multiple roundtrips (no degradation)", async () => {
    h = await EditorTestHarness.create("**bold** and *italic*");

    for (let i = 0; i < 3; i++) {
      await h.toggleView(); // → code
      expect(h.getCodeViewText()).toContain("**bold**");
      expect(h.getCodeViewText()).toContain("*italic*");

      await h.toggleView(); // → rendered
      expect(h.query.boldTexts()).toEqual(["bold"]);
      expect(h.query.italicTexts()).toEqual(["italic"]);
    }
  });

  it("preserves links (text + href) through roundtrip", async () => {
    h = await EditorTestHarness.create(
      "Click [here](https://example.com) for info"
    );

    expect(h.query.links()).toEqual([
      { text: "here", href: "https://example.com" },
    ]);

    await h.toggleView();
    expect(h.getCodeViewText()).toContain("[here](https://example.com)");

    await h.toggleView();
    expect(h.query.links()).toEqual([
      { text: "here", href: "https://example.com" },
    ]);
  });

  it("preserves code spans through roundtrip", async () => {
    h = await EditorTestHarness.create("Use `console.log()` for debugging");

    expect(h.query.codeTexts()).toEqual(["console.log()"]);

    await h.toggleView();
    expect(h.getCodeViewText()).toContain("`console.log()`");

    await h.toggleView();
    expect(h.query.codeTexts()).toEqual(["console.log()"]);
  });

  it("preserves headings (h1-h5) through roundtrip", async () => {
    const levels = [1, 2, 3, 4, 5];

    for (const level of levels) {
      const hashes = "#".repeat(level);
      h = await EditorTestHarness.create(`${hashes} Heading ${level}`);

      expect(h.query.heading(level)).toBe(`Heading ${level}`);

      await h.toggleView();
      expect(h.getCodeViewText()).toContain(`${hashes} Heading ${level}`);

      await h.toggleView();
      expect(h.query.heading(level)).toBe(`Heading ${level}`);

      h.destroy();
    }
  });

  it("preserves unordered lists through roundtrip", async () => {
    h = await EditorTestHarness.create("- Item A\n- Item B\n- Item C");

    expect(h.query.hasList("ul")).toBe(true);
    expect(h.query.listItems()).toEqual(["Item A", "Item B", "Item C"]);

    await h.toggleView();
    await h.toggleView();

    expect(h.query.hasList("ul")).toBe(true);
    expect(h.query.listItems()).toEqual(["Item A", "Item B", "Item C"]);
  });

  it("preserves ordered lists through roundtrip", async () => {
    h = await EditorTestHarness.create("1. First\n2. Second\n3. Third");

    expect(h.query.hasList("ol")).toBe(true);
    expect(h.query.listItems()).toEqual(["First", "Second", "Third"]);

    await h.toggleView();
    await h.toggleView();

    expect(h.query.hasList("ol")).toBe(true);
    expect(h.query.listItems()).toEqual(["First", "Second", "Third"]);
  });

  it("preserves blockquotes through roundtrip", async () => {
    h = await EditorTestHarness.create("> This is a quote");

    expect(h.query.hasBlockquote()).toBe(true);
    expect(h.query.blockquoteTexts()).toEqual(["This is a quote"]);

    await h.toggleView();
    expect(h.getCodeViewText()).toContain("> This is a quote");

    await h.toggleView();
    expect(h.query.hasBlockquote()).toBe(true);
    expect(h.query.blockquoteTexts()).toEqual(["This is a quote"]);
  });

  it("preserves complex document with all elements through roundtrip", async () => {
    const markdown = `# Main Title

This is a paragraph with **bold** and *italic* text.

- List item one
- List item two

Click [here](https://example.com) for more.

Use \`code\` inline.

> A blockquote`;

    h = await EditorTestHarness.create(markdown);

    expect(h.query.heading(1)).toBe("Main Title");
    expect(h.query.boldTexts()).toEqual(["bold"]);
    expect(h.query.italicTexts()).toEqual(["italic"]);
    expect(h.query.hasList("ul")).toBe(true);
    expect(h.query.links()).toEqual([
      { text: "here", href: "https://example.com" },
    ]);
    expect(h.query.codeTexts()).toEqual(["code"]);
    expect(h.query.hasBlockquote()).toBe(true);

    await h.toggleView(); // → code
    await h.toggleView(); // → rendered

    expect(h.query.heading(1)).toBe("Main Title");
    expect(h.query.boldTexts()).toEqual(["bold"]);
    expect(h.query.italicTexts()).toEqual(["italic"]);
    expect(h.query.hasList("ul")).toBe(true);
    expect(h.query.links()).toEqual([
      { text: "here", href: "https://example.com" },
    ]);
    expect(h.query.codeTexts()).toEqual(["code"]);
    expect(h.query.hasBlockquote()).toBe(true);
  });
});
