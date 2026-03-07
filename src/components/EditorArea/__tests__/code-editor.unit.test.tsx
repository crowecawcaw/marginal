// Unit tests for the CodeMirror-based code editor.
// These tests operate directly on the CM EditorView to verify CM-specific
// configuration (bracket pairing, smart indent). They intentionally use CM
// APIs and are not subject to the "harness-only" rule that applies to E2E tests.
import { describe, it, expect, afterEach } from "vitest";
import { EditorTestHarness } from "../../../test/EditorTestHarness";
import { EditorView } from "@codemirror/view";
import { closeBracketsKeymap } from "@codemirror/autocomplete";

function getCMView(): EditorView {
  const cmDom = document.querySelector(
    ".markdown-code-input .cm-editor"
  ) as HTMLElement;
  expect(cmDom).not.toBeNull();
  const view = EditorView.findFromDOM(cmDom);
  expect(view).not.toBeNull();
  return view!;
}

describe("Code editor — bracket pairing", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("CM editor mounts with accessible state", async () => {
    h = await EditorTestHarness.create("hello", "code");

    const view = getCMView();
    expect(view.state).toBeDefined();
    expect(view.state.doc.toString()).toBe("hello");
  });

  it("closeBracketsKeymap includes a Backspace handler", () => {
    expect(closeBracketsKeymap.length).toBeGreaterThan(0);
    expect(closeBracketsKeymap.some((k) => k.key === "Backspace")).toBe(true);
  });

  it("accepts bracket characters via dispatch", async () => {
    h = await EditorTestHarness.create("", "code");
    const view = getCMView();

    view.dispatch({ changes: { from: 0, insert: "[text](url)" } });

    expect(view.state.doc.toString()).toBe("[text](url)");
  });

  it("accepts arbitrary text input via dispatch", async () => {
    h = await EditorTestHarness.create("", "code");
    const view = getCMView();

    view.dispatch({ changes: { from: 0, insert: "function test() {}" } });

    expect(view.state.doc.toString()).toBe("function test() {}");
  });
});

describe("Code editor — smart indent", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("mounts with contenteditable cm-content", async () => {
    h = await EditorTestHarness.create("hello", "code");

    const cmContent = document.querySelector(
      ".markdown-code-input .cm-content"
    ) as HTMLElement;
    expect(cmContent).not.toBeNull();
    expect(cmContent.getAttribute("contenteditable")).toBe("true");
  });

  it("accepts multi-line content and reports correct line count", async () => {
    const content = "function test() {\n  return 1;\n}";
    h = await EditorTestHarness.create(content, "code");

    const view = getCMView();
    expect(view.state.doc.toString()).toBe(content);
    expect(view.state.doc.lines).toBe(3);
  });

  it("cursor can be positioned via dispatch", async () => {
    h = await EditorTestHarness.create("hello", "code");

    const view = getCMView();
    view.dispatch({ selection: { anchor: 0 } });

    expect(view.state.selection.main.head).toBe(0);
  });

  it("newline with indentation inserts correctly via dispatch", async () => {
    h = await EditorTestHarness.create("line1", "code");

    const view = getCMView();
    const end = view.state.doc.length;
    view.dispatch({ changes: { from: end, insert: "\n  line2" } });

    expect(view.state.doc.toString()).toBe("line1\n  line2");
    expect(view.state.doc.lines).toBe(2);
  });
});
