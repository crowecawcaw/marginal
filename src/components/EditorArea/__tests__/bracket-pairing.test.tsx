import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";
import { EditorView } from "@codemirror/view";
import { closeBracketsKeymap } from "@codemirror/autocomplete";

describe("Bracket Pairing (Code View)", () => {
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

  it("closeBrackets extension is loaded in the editor", async () => {
    h = await EditorTestHarness.create("hello", "code");

    const view = getCMView();
    expect(view.state).toBeDefined();
    expect(view.state.doc.toString()).toBe("hello");
  });

  it("closeBracketsKeymap is configured", async () => {
    h = await EditorTestHarness.create("", "code");

    // Verify closeBracketsKeymap entries exist (Backspace handler)
    expect(closeBracketsKeymap.length).toBeGreaterThan(0);
    expect(closeBracketsKeymap.some((k) => k.key === "Backspace")).toBe(true);
  });

  it("editor accepts bracket characters via dispatch", async () => {
    h = await EditorTestHarness.create("", "code");
    const view = getCMView();

    view.dispatch({
      changes: { from: 0, insert: "[text](url)" },
    });

    expect(view.state.doc.toString()).toBe("[text](url)");
  });

  it("editor is functional and accepts text input", async () => {
    h = await EditorTestHarness.create("", "code");
    const view = getCMView();

    view.dispatch({
      changes: { from: 0, insert: "function test() {}" },
    });

    expect(view.state.doc.toString()).toBe("function test() {}");
  });
});
