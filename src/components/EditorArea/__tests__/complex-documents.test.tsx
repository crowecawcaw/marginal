import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";

describe("Complex Document Tests", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("heading + paragraph + bold/italic", async () => {
    h = await EditorTestHarness.create(`# Welcome

This paragraph has **bold** and *italic* words.`);

    expect(h.query.heading(1)).toBe("Welcome");
    expect(h.query.boldTexts()).toEqual(["bold"]);
    expect(h.query.italicTexts()).toEqual(["italic"]);

    await h.toggleView();
    await h.toggleView();

    expect(h.query.heading(1)).toBe("Welcome");
    expect(h.query.boldTexts()).toEqual(["bold"]);
    expect(h.query.italicTexts()).toEqual(["italic"]);
  });

  it("heading + table", async () => {
    h = await EditorTestHarness.create(`## Data

| Key | Value |
|-----|-------|
| x | 1 |
| y | 2 |`);

    expect(h.query.heading(2)).toBe("Data");
    expect(h.query.hasTable()).toBe(true);
    expect(h.query.tableData()).toEqual([
      ["Key", "Value"],
      ["x", "1"],
      ["y", "2"],
    ]);

    await h.toggleView();
    await h.toggleView();

    expect(h.query.heading(2)).toBe("Data");
    expect(h.query.hasTable()).toBe(true);
  });

  it("heading + list + table", async () => {
    h = await EditorTestHarness.create(`## Overview

- Point one
- Point two

| A | B |
|---|---|
| 1 | 2 |`);

    expect(h.query.heading(2)).toBe("Overview");
    expect(h.query.hasList("ul")).toBe(true);
    expect(h.query.listItems()).toEqual(["Point one", "Point two"]);
    expect(h.query.hasTable()).toBe(true);

    await h.toggleView();
    await h.toggleView();

    expect(h.query.heading(2)).toBe("Overview");
    expect(h.query.hasList("ul")).toBe(true);
    expect(h.query.hasTable()).toBe(true);
  });

  it("full document: heading + paragraphs + bold + italic + code + list + table + link", async () => {
    const markdown = `# Project README

This is the **introduction** with *emphasis* and \`inline code\`.

Visit [docs](https://docs.example.com) for more.

- Feature A
- Feature B
- Feature C

| Component | Status |
|-----------|--------|
| Core | Done |
| UI | WIP |`;

    h = await EditorTestHarness.create(markdown);

    expect(h.query.heading(1)).toBe("Project README");
    expect(h.query.boldTexts()).toEqual(["introduction"]);
    expect(h.query.italicTexts()).toEqual(["emphasis"]);
    expect(h.query.codeTexts()).toEqual(["inline code"]);
    expect(h.query.hasList("ul")).toBe(true);
    expect(h.query.listItems()).toEqual([
      "Feature A",
      "Feature B",
      "Feature C",
    ]);
    expect(h.query.hasTable()).toBe(true);
    expect(h.query.tableData()).toEqual([
      ["Component", "Status"],
      ["Core", "Done"],
      ["UI", "WIP"],
    ]);
    expect(h.query.links()).toEqual([
      { text: "docs", href: "https://docs.example.com" },
    ]);

    // Roundtrip
    await h.toggleView();
    await h.toggleView();

    expect(h.query.heading(1)).toBe("Project README");
    expect(h.query.boldTexts()).toEqual(["introduction"]);
    expect(h.query.italicTexts()).toEqual(["emphasis"]);
    expect(h.query.codeTexts()).toEqual(["inline code"]);
    expect(h.query.hasList("ul")).toBe(true);
    expect(h.query.hasTable()).toBe(true);
    expect(h.query.links()).toEqual([
      { text: "docs", href: "https://docs.example.com" },
    ]);
  });

  it("code view shows raw markdown correctly", async () => {
    h = await EditorTestHarness.create("# Hello **world**", "code");

    const text = h.getCodeViewText();
    expect(text).toContain("# Hello **world**");
  });

  it("switching from code → rendered preserves structure", async () => {
    h = await EditorTestHarness.create(
      `## Title

Some **bold** text and a [link](https://example.com).`,
      "code"
    );

    expect(h.getCodeViewText()).toContain("## Title");
    expect(h.getCodeViewText()).toContain("**bold**");

    await h.toggleView(); // → rendered

    expect(h.query.heading(2)).toBe("Title");
    expect(h.query.boldTexts()).toEqual(["bold"]);
    expect(h.query.links()).toEqual([
      { text: "link", href: "https://example.com" },
    ]);
  });
});
