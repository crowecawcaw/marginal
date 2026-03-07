import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";

describe("Code Block Tests", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("renders code block from markdown", async () => {
    h = await EditorTestHarness.create("```\nconsole.log('hello');\n```");

    expect(h.query.hasCodeBlock()).toBe(true);
    expect(h.query.codeBlockTexts()[0]).toContain("console.log('hello');");
  });

  it("preserves code block through roundtrip", async () => {
    h = await EditorTestHarness.create("```\nlet x = 1;\n```");

    expect(h.query.hasCodeBlock()).toBe(true);

    await h.toggleView(); // → code
    expect(h.getCodeViewText()).toContain("```");
    expect(h.getCodeViewText()).toContain("let x = 1;");

    await h.toggleView(); // → rendered
    expect(h.query.hasCodeBlock()).toBe(true);
    expect(h.query.codeBlockTexts()[0]).toContain("let x = 1;");
  });

  it("renders code block with language annotation", async () => {
    h = await EditorTestHarness.create(
      "```javascript\nconst y = 2;\n```"
    );

    expect(h.query.hasCodeBlock()).toBe(true);
    expect(h.query.codeBlockTexts()[0]).toContain("const y = 2;");
  });

  it("renders multi-line code block", async () => {
    h = await EditorTestHarness.create(
      "```\nline 1\nline 2\nline 3\n```"
    );

    expect(h.query.hasCodeBlock()).toBe(true);
    const text = h.query.codeBlockTexts()[0];
    expect(text).toContain("line 1");
    expect(text).toContain("line 2");
    expect(text).toContain("line 3");
  });
});
