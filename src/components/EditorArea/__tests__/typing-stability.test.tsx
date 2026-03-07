import { describe, it, expect, afterEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React from "react";
import * as MilkdownCore from "@milkdown/kit/core";

describe("Typing stability in rendered mode", () => {
  let unmount: (() => void) | null = null;

  afterEach(() => {
    unmount?.();
    unmount = null;
    vi.restoreAllMocks();
  });

  it("creates the Milkdown editor only once, not on every initialContent prop change", async () => {
    const makeSpy = vi.spyOn(MilkdownCore.Editor, "make");

    const { default: MarkdownEditor } = await import("../MarkdownEditor");
    const onChange = vi.fn();

    const { rerender, unmount: u } = render(
      React.createElement(MarkdownEditor, {
        initialContent: "Hello",
        viewMode: "rendered",
        onChange,
      })
    );
    unmount = u;

    await waitFor(() => {
      if (!document.querySelector(".milkdown-editor .ProseMirror"))
        throw new Error("Editor not ready");
    });

    const callsAfterMount = makeSpy.mock.calls.length;
    expect(callsAfterMount).toBe(1);

    // Re-render with updated initialContent — this is what EditorArea does when
    // the Zustand store updates after Milkdown fires markdownUpdated on a keystroke.
    rerender(
      React.createElement(MarkdownEditor, {
        initialContent: "Hello world",
        viewMode: "rendered",
        onChange,
      })
    );

    await waitFor(() => {
      if (!document.querySelector(".milkdown-editor .ProseMirror"))
        throw new Error("Editor disappeared");
    });

    // Bug: useEffect([initialContent]) re-runs on every prop change → Editor.make() called again.
    // Fix: useEffect([]) only runs on mount → Editor.make() called exactly once.
    expect(makeSpy).toHaveBeenCalledTimes(1);
  });
});
