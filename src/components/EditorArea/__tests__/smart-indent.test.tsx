import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";
import { EditorView } from "@codemirror/view";

describe("Smart Indent (Code View)", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  function getCMView(): EditorView {
    const cmDom = document.querySelector(
      ".markdown-code-input .cm-editor"
    ) as HTMLElement;
    expect(cmDom).not.toBeNull();
    const view = EditorView.findFromDOM(cmDom);
    expect(view).not.toBeNull();
    return view!;
  }

  it("code editor is mounted with cm-editor class", async () => {
    h = await EditorTestHarness.create("hello", "code");

    const cmEditor = document.querySelector(
      ".markdown-code-input .cm-editor"
    ) as HTMLElement;
    expect(cmEditor).not.toBeNull();

    const cmContent = document.querySelector(
      ".markdown-code-input .cm-content"
    ) as HTMLElement;
    expect(cmContent).not.toBeNull();
    expect(cmContent.getAttribute("contenteditable")).toBe("true");
  });

  it("editor accepts multi-line content with indentation", async () => {
    const content = "function test() {\n  return 1;\n}";
    h = await EditorTestHarness.create(content, "code");

    const view = getCMView();
    expect(view.state.doc.toString()).toBe(content);
    expect(view.state.doc.lines).toBe(3);
  });

  it("cursor can be positioned for indentation", async () => {
    h = await EditorTestHarness.create("hello", "code");

    const view = getCMView();
    view.dispatch({ selection: { anchor: 0 } });

    expect(view.state.selection.main.head).toBe(0);
  });

  it("inserting newline with indentation works via dispatch", async () => {
    h = await EditorTestHarness.create("line1", "code");

    const view = getCMView();
    const end = view.state.doc.length;
    view.dispatch({
      changes: { from: end, insert: "\n  line2" },
    });

    expect(view.state.doc.toString()).toBe("line1\n  line2");
    expect(view.state.doc.lines).toBe(2);
  });
});
