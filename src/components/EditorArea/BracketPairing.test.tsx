import { describe, it, expect, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  $createParagraphNode,
  LexicalEditor,
} from "lexical";
import { BracketPairingPlugin } from "./plugins/BracketPairingPlugin";

// jsdom doesn't implement getBoundingClientRect on text nodes,
// which Lexical calls during DOM selection updates with discrete mode.
beforeAll(() => {
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => {} }) as DOMRect;
  }
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as DOMRectList;
  }
});

// Helper to capture the editor instance from inside the LexicalComposer
let testEditor: LexicalEditor | null = null;
function EditorCapture() {
  const [editor] = useLexicalComposerContext();
  testEditor = editor;
  return null;
}

function renderTestEditor(initialText = "") {
  const config = {
    namespace: "test",
    theme: {},
    nodes: [],
    onError: (error: Error) => {
      throw error;
    },
  };

  render(
    <LexicalComposer initialConfig={config}>
      <PlainTextPlugin
        contentEditable={
          <ContentEditable className="test-editor" />
        }
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <BracketPairingPlugin />
      <EditorCapture />
    </LexicalComposer>,
  );

  const editor = testEditor!;

  // Set initial content and place cursor at the end
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      if (initialText) {
        const textNode = $createTextNode(initialText);
        paragraph.append(textNode);
        root.append(paragraph);
        textNode.select(initialText.length, initialText.length);
      } else {
        root.append(paragraph);
        paragraph.selectEnd();
      }
    },
    { discrete: true },
  );

  return editor;
}

function getEditorText(editor: LexicalEditor): string {
  let text = "";
  editor.getEditorState().read(() => {
    text = $getRoot().getTextContent();
  });
  return text;
}

function getCursorOffset(editor: LexicalEditor): number {
  let offset = -1;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      offset = selection.anchor.offset;
    }
  });
  return offset;
}

function dispatchKey(editor: LexicalEditor, key: string) {
  const rootElement = editor.getRootElement();
  if (!rootElement) throw new Error("No root element");
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  rootElement.dispatchEvent(event);
}

describe("BracketPairingPlugin", () => {
  it("typing [ inserts [] with cursor between brackets", () => {
    const editor = renderTestEditor();

    dispatchKey(editor, "[");

    expect(getEditorText(editor)).toBe("[]");
    expect(getCursorOffset(editor)).toBe(1);
  });

  it("typing text after [ goes between the brackets", () => {
    const editor = renderTestEditor();

    dispatchKey(editor, "[");

    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText("link text");
        }
      },
      { discrete: true },
    );

    expect(getEditorText(editor)).toBe("[link text]");
  });

  it("typing ( after ] inserts () with cursor between parens", () => {
    const editor = renderTestEditor();

    dispatchKey(editor, "[");

    // Move cursor past the ]
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.anchor.offset = 2;
          selection.focus.offset = 2;
        }
      },
      { discrete: true },
    );

    dispatchKey(editor, "(");

    expect(getEditorText(editor)).toBe("[]()");
    expect(getCursorOffset(editor)).toBe(3);
  });

  it("typing ( NOT after ] does not auto-pair", () => {
    const editor = renderTestEditor("hello");

    dispatchKey(editor, "(");

    // Plugin should not have inserted anything - cursor is after "o", not "]"
    expect(getEditorText(editor)).toBe("hello");
  });

  it("full markdown link flow: [text](url)", () => {
    const editor = renderTestEditor();

    dispatchKey(editor, "[");
    expect(getEditorText(editor)).toBe("[]");

    // Type link text between brackets
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText("click here");
        }
      },
      { discrete: true },
    );
    expect(getEditorText(editor)).toBe("[click here]");

    // Move cursor after ]
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const offset = selection.anchor.offset;
          selection.anchor.offset = offset + 1;
          selection.focus.offset = offset + 1;
        }
      },
      { discrete: true },
    );

    dispatchKey(editor, "(");
    expect(getEditorText(editor)).toBe("[click here]()");

    // Type URL between parens
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText("https://example.com");
        }
      },
      { discrete: true },
    );
    expect(getEditorText(editor)).toBe("[click here](https://example.com)");
  });

  it("typing ( in the middle of text (not after ]) does not auto-pair", () => {
    const editor = renderTestEditor("some text");

    // Place cursor at offset 4 (after "some")
    editor.update(
      () => {
        const root = $getRoot();
        const textNode = root.getFirstDescendant();
        if (textNode) {
          textNode.select(4, 4);
        }
      },
      { discrete: true },
    );

    dispatchKey(editor, "(");

    expect(getEditorText(editor)).toBe("some text");
  });

  it("typing ( immediately after ] auto-pairs even with text in brackets", () => {
    const editor = renderTestEditor("[hello]");

    dispatchKey(editor, "(");

    expect(getEditorText(editor)).toBe("[hello]()");
    expect(getCursorOffset(editor)).toBe(8);
  });

  it("typing [ with existing content inserts brackets at cursor", () => {
    const editor = renderTestEditor("prefix ");

    dispatchKey(editor, "[");

    expect(getEditorText(editor)).toBe("prefix []");
    expect(getCursorOffset(editor)).toBe(8);
  });

  it("typing ] when next char is ] skips over it instead of doubling", () => {
    const editor = renderTestEditor();

    // Type [ to get [] with cursor between
    dispatchKey(editor, "[");
    expect(getEditorText(editor)).toBe("[]");
    expect(getCursorOffset(editor)).toBe(1);

    // Type ] — should skip over the existing ] not insert another
    dispatchKey(editor, "]");

    expect(getEditorText(editor)).toBe("[]");
    expect(getCursorOffset(editor)).toBe(2);
  });

  it("typing ) when next char is ) skips over it instead of doubling", () => {
    const editor = renderTestEditor("[hello]");

    // Type ( to get [hello]() with cursor between parens
    dispatchKey(editor, "(");
    expect(getEditorText(editor)).toBe("[hello]()");
    expect(getCursorOffset(editor)).toBe(8);

    // Type ) — should skip over the existing )
    dispatchKey(editor, ")");

    expect(getEditorText(editor)).toBe("[hello]()");
    expect(getCursorOffset(editor)).toBe(9);
  });

  it("typing ] when next char is NOT ] inserts normally", () => {
    const editor = renderTestEditor("abc");

    // Place cursor at offset 1 (between a and b)
    editor.update(
      () => {
        const root = $getRoot();
        const textNode = root.getFirstDescendant();
        if (textNode) {
          textNode.select(1, 1);
        }
      },
      { discrete: true },
    );

    dispatchKey(editor, "]");

    // No skip — next char is "b", not "]", so plugin doesn't intercept
    expect(getEditorText(editor)).toBe("abc");
  });
});
