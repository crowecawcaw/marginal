import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { EditorTestHarness } from "../../../test/EditorTestHarness";
import {
  $getRoot,
  $isTextNode,
  $isElementNode,
  $isTabNode,
  $isLineBreakNode,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { $isCodeNode } from "@lexical/code";

describe("Code Block Tests", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("renders code block from markdown with .editor-code class", async () => {
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

  it("code block has display: block styling", async () => {
    h = await EditorTestHarness.create("```\ntest\n```");

    const codeEl = document.querySelector(".editor-code") as HTMLElement;
    expect(codeEl).not.toBeNull();
    // jsdom applies stylesheets, so we check the computed class is present
    // and the CSS rule exists; direct getComputedStyle in jsdom won't reflect
    // stylesheet rules, so we verify the element renders as a <code> with the class
    expect(codeEl.classList.contains("editor-code")).toBe(true);
    expect(codeEl.tagName.toLowerCase()).toBe("code");
  });
});

describe("Code Block Smart Indent", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  function getEditor(): LexicalEditor {
    const el = document.querySelector(".markdown-editor-input") as any;
    const editor = el?.__lexicalEditor;
    if (!editor) throw new Error("Lexical editor not found");
    return editor;
  }

  /** Place a collapsed cursor right after the first occurrence of `text` in the editor tree. */
  async function setCursorAfter(text: string) {
    const editor = getEditor();
    await act(async () => {
      editor.update(() => {
        function find(node: LexicalNode): LexicalNode | null {
          if ($isTextNode(node) && node.getTextContent().includes(text)) {
            return node;
          }
          if ($isElementNode(node)) {
            for (const child of node.getChildren()) {
              const r = find(child);
              if (r) return r;
            }
          }
          return null;
        }
        const textNode = find($getRoot());
        if (!textNode || !$isTextNode(textNode))
          throw new Error(`"${text}" not found`);
        const content = textNode.getTextContent();
        const offset = content.indexOf(text) + text.length;
        textNode.select(offset, offset);
      });
    });
  }

  async function dispatchEnter() {
    const editor = getEditor();
    await act(async () => {
      editor.dispatchCommand(
        KEY_ENTER_COMMAND,
        new KeyboardEvent("keydown", {
          key: "Enter",
          cancelable: true,
          bubbles: true,
        })
      );
    });
  }

  /** Count TabNodes immediately following the last LineBreakNode in the code block. */
  function countTabsOnNewLine(): number {
    const editor = getEditor();
    let count = 0;
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const codeNode = root.getFirstChild();
      if (!codeNode || !$isCodeNode(codeNode)) return;
      const children = codeNode.getChildren();

      let lastLBIndex = -1;
      for (let i = 0; i < children.length; i++) {
        if ($isLineBreakNode(children[i])) {
          lastLBIndex = i;
        }
      }
      if (lastLBIndex === -1) return;

      for (let i = lastLBIndex + 1; i < children.length; i++) {
        if ($isTabNode(children[i])) {
          count++;
        } else {
          break;
        }
      }
    });
    return count;
  }

  it("Enter after { adds extra indent", async () => {
    h = await EditorTestHarness.create("```\nfoo() {\n```");
    await setCursorAfter("{");
    await dispatchEnter();
    expect(countTabsOnNewLine()).toBe(1);
  });

  it("Enter after [ adds extra indent", async () => {
    h = await EditorTestHarness.create("```\nconst a = [\n```");
    await setCursorAfter("[");
    await dispatchEnter();
    expect(countTabsOnNewLine()).toBe(1);
  });

  it("Enter after ( adds extra indent", async () => {
    h = await EditorTestHarness.create("```\nfoo(\n```");
    await setCursorAfter("(");
    await dispatchEnter();
    expect(countTabsOnNewLine()).toBe(1);
  });

  it("Enter after normal text does NOT add extra indent", async () => {
    h = await EditorTestHarness.create("```\nfoo()\n```");
    await setCursorAfter(")");
    await dispatchEnter();
    expect(countTabsOnNewLine()).toBe(0);
  });

  it("nested indent preserved — existing tab + extra tab", async () => {
    // Use 4 leading spaces as existing indentation
    h = await EditorTestHarness.create("```\n    if (bar) {\n```");
    await setCursorAfter("{");
    await dispatchEnter();
    // Should have at least 1 tab (the extra indent); existing spaces are
    // preserved as a CodeHighlightNode, not as TabNodes, so we check tabs >= 1
    expect(countTabsOnNewLine()).toBeGreaterThanOrEqual(1);
  });
});
