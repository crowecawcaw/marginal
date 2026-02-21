import { describe, it, expect, beforeAll } from "vitest";
import { render, act } from "@testing-library/react";
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
  $isTextNode,
  LexicalEditor,
} from "lexical";
import { CodeViewFormattingPlugin, $toggleFormat } from "./plugins/CodeViewFormattingPlugin";
import { emit } from "../../platform/eventAdapter";

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
      <CodeViewFormattingPlugin />
      <EditorCapture />
    </LexicalComposer>,
  );

  const editor = testEditor!;

  // Set initial content
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      if (initialText) {
        const textNode = $createTextNode(initialText);
        paragraph.append(textNode);
        root.append(paragraph);
      } else {
        root.append(paragraph);
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


function selectText(editor: LexicalEditor, start: number, end: number) {
  act(() => {
    editor.update(
      () => {
        const root = $getRoot();
        const textNode = root.getFirstDescendant();
        if (textNode && $isTextNode(textNode)) {
          textNode.select(start, end);
        }
      },
      { discrete: true },
    );
  });
}

function getSelection(editor: LexicalEditor): { anchor: number; focus: number } {
  let anchor = 0;
  let focus = 0;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      anchor = selection.anchor.offset;
      focus = selection.focus.offset;
    }
  });
  return { anchor, focus };
}

async function selectAndFormat(editor: LexicalEditor, start: number, end: number, prefix: string) {
  act(() => {
    editor.update(() => {
      const root = $getRoot();
      const textNode = root.getFirstDescendant();
      if (textNode && $isTextNode(textNode)) {
        textNode.select(start, end);
      }
      $toggleFormat(prefix);
    }, { discrete: true });
  });
}

async function waitForUpdates() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

describe("CodeViewFormattingPlugin - Bold", () => {
  it("menu:bold event wraps selected text with **", async () => {
    const editor = renderTestEditor("hello world");
    selectText(editor, 0, 5); // Select "hello"

    await act(async () => {
      emit("menu:bold");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("**hello** world");
  });

  it("menu:bold event with no selection inserts ** at cursor", async () => {
    const editor = renderTestEditor("hello");
    selectText(editor, 5, 5); // Cursor at end

    await act(async () => {
      emit("menu:bold");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("hello****");
  });
});

describe("CodeViewFormattingPlugin - Italic", () => {
  it("menu:italic event wraps selected text with *", async () => {
    const editor = renderTestEditor("hello world");
    selectText(editor, 0, 5); // Select "hello"

    await act(async () => {
      emit("menu:italic");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("*hello* world");
  });

  it("menu:italic event with no selection inserts * at cursor", async () => {
    const editor = renderTestEditor("hello");
    selectText(editor, 5, 5); // Cursor at end

    await act(async () => {
      emit("menu:italic");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("hello**");
  });
});

describe("CodeViewFormattingPlugin - Headings", () => {
  it("menu:heading-1 event adds # heading", async () => {
    const editor = renderTestEditor("My Heading");
    selectText(editor, 3, 3);

    await act(async () => {
      emit("menu:heading-1");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("# My Heading");
  });

  it("menu:heading-2 event adds ## heading", async () => {
    const editor = renderTestEditor("My Heading");
    selectText(editor, 3, 3);

    await act(async () => {
      emit("menu:heading-2");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("## My Heading");
  });

  it("menu:heading-3 event adds ### heading", async () => {
    const editor = renderTestEditor("My Heading");
    selectText(editor, 3, 3);

    await act(async () => {
      emit("menu:heading-3");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("### My Heading");
  });

  it("menu:heading-4 event adds #### heading", async () => {
    const editor = renderTestEditor("My Heading");
    selectText(editor, 3, 3);

    await act(async () => {
      emit("menu:heading-4");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("#### My Heading");
  });

  it("menu:heading-5 event adds ##### heading", async () => {
    const editor = renderTestEditor("My Heading");
    selectText(editor, 3, 3);

    await act(async () => {
      emit("menu:heading-5");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("##### My Heading");
  });

  it("heading replaces existing heading markers", async () => {
    const editor = renderTestEditor("### Old Heading");
    selectText(editor, 5, 5); // Cursor after ###

    await act(async () => {
      emit("menu:heading-1");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("# Old Heading");
  });
});

describe("CodeViewFormattingPlugin - Table Insertion", () => {
  it("menu:insert-table event inserts a markdown table", async () => {
    const editor = renderTestEditor("");
    selectText(editor, 0, 0); // Ensure cursor is positioned

    await act(async () => {
      emit("menu:insert-table");
      await waitForUpdates();
    });

    const text = getEditorText(editor);
    expect(text).toContain("| Column 1 | Column 2 | Column 3 |");
    expect(text).toContain("|----------|----------|----------|");
  });

  it("inserting a table when cursor is inside existing table places new table after, not nested", async () => {
    const existingTable = `| A | B |
|---|---|
| 1 | 2 |`;
    const editor = renderTestEditor(existingTable);

    // Place cursor inside the table (at position 20, which is in the middle of "1")
    selectText(editor, 20, 20);

    await act(async () => {
      emit("menu:insert-table");
      await waitForUpdates();
    });

    const text = getEditorText(editor);

    // Should have the original table
    expect(text).toContain("| A | B |");
    expect(text).toContain("| 1 | 2 |");

    // Should have the new table
    expect(text).toContain("| Column 1 | Column 2 | Column 3 |");

    // New table should come after the original table (not nested)
    const firstTableEnd = text.indexOf("| 1 | 2 |") + "| 1 | 2 |".length;
    const secondTableStart = text.indexOf("| Column 1 | Column 2 | Column 3 |");
    expect(secondTableStart).toBeGreaterThan(firstTableEnd);
  });
});

describe("CodeViewFormattingPlugin - Combined Formatting", () => {
  it("can apply bold and italic together", async () => {
    const editor = renderTestEditor("hello world");

    // Make "hello" bold
    selectText(editor, 0, 5);
    await act(async () => {
      emit("menu:bold");
      await waitForUpdates();
    });
    expect(getEditorText(editor)).toBe("**hello** world");

    // Make "world" italic
    selectText(editor, 10, 15); // Account for added **
    await act(async () => {
      emit("menu:italic");
      await waitForUpdates();
    });
    expect(getEditorText(editor)).toBe("**hello** *world*");
  });

  it("can add heading and then format text within it", async () => {
    const editor = renderTestEditor("My Heading");

    // Add heading
    selectText(editor, 3, 3);
    await act(async () => {
      emit("menu:heading-1");
      await waitForUpdates();
    });
    expect(getEditorText(editor)).toBe("# My Heading");

    // Make "My" bold
    selectText(editor, 2, 4); // Account for "# "
    await act(async () => {
      emit("menu:bold");
      await waitForUpdates();
    });
    expect(getEditorText(editor)).toBe("# **My** Heading");
  });
});

describe("CodeViewFormattingPlugin - Selection Preservation", () => {
  it("bold preserves selection around the wrapped text", async () => {
    const editor = renderTestEditor("hello world");
    selectText(editor, 0, 5); // Select "hello"

    await act(async () => {
      emit("menu:bold");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("**hello** world");
    const sel = getSelection(editor);
    // Selection should cover "hello" inside the ** markers (offsets 2-7)
    expect(sel.anchor).toBe(2);
    expect(sel.focus).toBe(7);
  });

  it("italic preserves selection around the wrapped text", async () => {
    const editor = renderTestEditor("hello world");
    selectText(editor, 0, 5); // Select "hello"

    await act(async () => {
      emit("menu:italic");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("*hello* world");
    const sel = getSelection(editor);
    // Selection should cover "hello" inside the * markers (offsets 1-6)
    expect(sel.anchor).toBe(1);
    expect(sel.focus).toBe(6);
  });
});

describe("CodeViewFormattingPlugin - Toggle", () => {
  it("bolding already-bold selected text removes the ** markers", async () => {
    const editor = renderTestEditor("**hello** world");
    selectText(editor, 0, 9); // Select "**hello**"

    await act(async () => {
      emit("menu:bold");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("hello world");
  });

  it("italicizing already-italic selected text removes the * markers", async () => {
    const editor = renderTestEditor("*hello* world");
    selectText(editor, 0, 7); // Select "*hello*"

    await act(async () => {
      emit("menu:italic");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("hello world");
  });

  it("bolding text with surrounding ** context removes the markers", async () => {
    const editor = renderTestEditor("**hello** world");
    selectText(editor, 2, 7); // Select "hello" (inner text only)

    await act(async () => {
      emit("menu:bold");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("hello world");
  });

  it("italicizing text with surrounding * context removes the markers", async () => {
    const editor = renderTestEditor("*hello* world");
    selectText(editor, 1, 6); // Select "hello" (inner text only)

    await act(async () => {
      emit("menu:italic");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("hello world");
  });

  it("toggle bold preserves selection on the unwrapped text", async () => {
    const editor = renderTestEditor("**hello** world");
    selectText(editor, 0, 9); // Select "**hello**"

    await act(async () => {
      emit("menu:bold");
      await waitForUpdates();
    });

    expect(getEditorText(editor)).toBe("hello world");
    const sel = getSelection(editor);
    // Selection should cover "hello" (offsets 0-5)
    expect(sel.anchor).toBe(0);
    expect(sel.focus).toBe(5);
  });
});

describe("CodeViewFormattingPlugin - Combined Bold/Italic Toggle", () => {
  it("bold then italic on same text produces ***text***", async () => {
    const editor = renderTestEditor("hello world");

    await selectAndFormat(editor, 0, 5, "**");
    expect(getEditorText(editor)).toBe("**hello** world");

    await selectAndFormat(editor, 2, 7, "*");
    expect(getEditorText(editor)).toBe("***hello*** world");
  });

  it("italic then bold on same text produces ***text***", async () => {
    const editor = renderTestEditor("hello world");

    await selectAndFormat(editor, 0, 5, "*");
    expect(getEditorText(editor)).toBe("*hello* world");

    await selectAndFormat(editor, 1, 6, "**");
    expect(getEditorText(editor)).toBe("***hello*** world");
  });

  it("remove bold from bold+italic leaves italic", async () => {
    const editor = renderTestEditor("***hello*** world");

    await selectAndFormat(editor, 3, 8, "**");
    expect(getEditorText(editor)).toBe("*hello* world");
  });

  it("remove italic from bold+italic leaves bold", async () => {
    const editor = renderTestEditor("***hello*** world");

    await selectAndFormat(editor, 3, 8, "*");
    expect(getEditorText(editor)).toBe("**hello** world");
  });

  it("full cycle: plain → bold → bold+italic → remove italic → remove bold → plain", async () => {
    const editor = renderTestEditor("hello world");

    // Plain → Bold
    await selectAndFormat(editor, 0, 5, "**");
    expect(getEditorText(editor)).toBe("**hello** world");

    // Bold → Bold+Italic
    await selectAndFormat(editor, 2, 7, "*");
    expect(getEditorText(editor)).toBe("***hello*** world");

    // Bold+Italic → Bold (remove italic)
    await selectAndFormat(editor, 3, 8, "*");
    expect(getEditorText(editor)).toBe("**hello** world");

    // Bold → Plain (remove bold)
    await selectAndFormat(editor, 2, 7, "**");
    expect(getEditorText(editor)).toBe("hello world");
  });

  it("full cycle: plain → italic → bold+italic → remove bold → remove italic → plain", async () => {
    const editor = renderTestEditor("hello world");

    // Plain → Italic
    await selectAndFormat(editor, 0, 5, "*");
    expect(getEditorText(editor)).toBe("*hello* world");

    // Italic → Bold+Italic
    await selectAndFormat(editor, 1, 6, "**");
    expect(getEditorText(editor)).toBe("***hello*** world");

    // Bold+Italic → Italic (remove bold)
    await selectAndFormat(editor, 3, 8, "**");
    expect(getEditorText(editor)).toBe("*hello* world");

    // Italic → Plain (remove italic)
    await selectAndFormat(editor, 1, 6, "*");
    expect(getEditorText(editor)).toBe("hello world");
  });
});
