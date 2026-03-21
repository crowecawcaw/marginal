import { describe, it, expect, afterEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { EditorTestHarness } from "../../../test/EditorTestHarness";
import { flattenTokens } from "../codeHighlightPlugin";
import hljs from "highlight.js/lib/core";

describe("Syntax Highlighting", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  describe("rendered view (presentation mode)", () => {
    it("produces hljs tokens for javascript code", () => {
      const result = hljs.highlight("const x = 42;", {
        language: "javascript",
      });
      const rootChildren =
        (result._emitter as any)?.rootNode?.children ?? [];
      const tokens: { from: number; to: number; class: string }[] = [];
      flattenTokens(rootChildren, 0, tokens);

      expect(tokens.length).toBeGreaterThan(0);
      const classes = tokens.map((t) => t.class);
      expect(classes).toContain("hljs-keyword");
      expect(classes).toContain("hljs-number");
    });

    it("renders code block with data-language attribute", async () => {
      h = await EditorTestHarness.create(
        "```javascript\nconst x = 42;\n```"
      );

      const pre = document.querySelector(".milkdown-editor pre");
      expect(pre).not.toBeNull();
      expect(pre!.getAttribute("data-language")).toBe("javascript");
      expect(pre!.textContent).toContain("const x = 42;");
    });

    it("does not produce tokens for unrecognized languages", () => {
      const registered = hljs.getLanguage("fakeLang");
      expect(registered).toBeUndefined();
    });
  });

  describe("code view", () => {
    it("applies syntax highlighting classes to markdown source", async () => {
      h = await EditorTestHarness.create(
        "# Hello\n\nSome **bold** text",
        "code"
      );

      await waitFor(() => {
        const highlighted = document.querySelectorAll(
          ".markdown-code-input .cm-line span[class*='cm-syntax-']"
        );
        if (highlighted.length === 0)
          throw new Error("No syntax highlight classes found");
      });

      const classes = Array.from(
        document.querySelectorAll(
          ".markdown-code-input .cm-line span[class*='cm-syntax-']"
        )
      ).map((el) => el.className);

      expect(classes.some((c) => c.includes("cm-syntax-"))).toBe(true);
    });

    it("highlights fenced code block content in code view", async () => {
      h = await EditorTestHarness.create(
        "```javascript\nconst x = 1;\n```",
        "code"
      );

      await waitFor(() => {
        const highlighted = document.querySelectorAll(
          ".markdown-code-input .cm-line span[class*='cm-syntax-']"
        );
        if (highlighted.length === 0)
          throw new Error("No syntax highlight classes found");
      });

      const allText = document.querySelector(
        ".markdown-code-input .cm-content"
      )?.textContent;
      expect(allText).toContain("const x = 1;");
    });
  });
});
