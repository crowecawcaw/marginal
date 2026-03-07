import { render, waitFor, RenderResult } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";

type ViewMode = "rendered" | "code";

interface LinkInfo {
  text: string;
  href: string;
}

class HarnessQuery {
  heading(level: number): string | null {
    const el = document.querySelector(`.milkdown-editor h${level}`);
    return el?.textContent ?? null;
  }

  boldTexts(): string[] {
    return Array.from(document.querySelectorAll(".milkdown-editor strong")).map(
      (el) => el.textContent ?? ""
    );
  }

  italicTexts(): string[] {
    return Array.from(document.querySelectorAll(".milkdown-editor em")).map(
      (el) => el.textContent ?? ""
    );
  }

  codeTexts(): string[] {
    // Select inline <code> elements but NOT those inside <pre> blocks
    return Array.from(
      document.querySelectorAll(".milkdown-editor code")
    )
      .filter((el) => !el.closest("pre"))
      .map((el) => el.textContent ?? "");
  }

  strikethroughTexts(): string[] {
    return Array.from(
      document.querySelectorAll(".milkdown-editor del")
    ).map((el) => el.textContent ?? "");
  }

  tableData(): string[][] {
    const rows = document.querySelectorAll(".milkdown-editor table tr");
    return Array.from(rows).map((row) =>
      Array.from(
        row.querySelectorAll("td, th")
      ).map((cell) => cell.textContent ?? "")
    );
  }

  tableCell(row: number, col: number): HTMLElement | null {
    const rows = document.querySelectorAll(".milkdown-editor table tr");
    if (row >= rows.length) return null;
    const cells = rows[row].querySelectorAll("td, th");
    return (cells[col] as HTMLElement) ?? null;
  }

  links(): LinkInfo[] {
    return Array.from(
      document.querySelectorAll(".milkdown-editor a")
    ).map((el) => ({
      text: el.textContent ?? "",
      href: el.getAttribute("href") ?? "",
    }));
  }

  paragraphs(): string[] {
    return Array.from(document.querySelectorAll(".milkdown-editor p")).map(
      (el) => el.textContent ?? ""
    );
  }

  hasList(type: "ul" | "ol"): boolean {
    return document.querySelector(`.milkdown-editor ${type}`) !== null;
  }

  listItems(): string[] {
    return Array.from(document.querySelectorAll(".milkdown-editor li")).map(
      (el) => el.textContent ?? ""
    );
  }

  hasTable(): boolean {
    return document.querySelector(".milkdown-editor table") !== null;
  }

  tableCount(): number {
    return document.querySelectorAll(".milkdown-editor table").length;
  }

  hasBlockquote(): boolean {
    return document.querySelector(".milkdown-editor blockquote") !== null;
  }

  blockquoteTexts(): string[] {
    return Array.from(document.querySelectorAll(".milkdown-editor blockquote")).map(
      (el) => el.textContent ?? ""
    );
  }

  hasCodeBlock(): boolean {
    return document.querySelector(".milkdown-editor pre") !== null;
  }

  codeBlockTexts(): string[] {
    return Array.from(document.querySelectorAll(".milkdown-editor pre")).map(
      (el) => el.textContent ?? ""
    );
  }
}

export class EditorTestHarness {
  private renderResult: RenderResult;
  private currentViewMode: ViewMode;
  private capturedContent: string;
  private onChange: (content: string) => void;
  readonly query = new HarnessQuery();

  private constructor(
    renderResult: RenderResult,
    viewMode: ViewMode,
    content: string,
    onChange: (content: string) => void
  ) {
    this.renderResult = renderResult;
    this.currentViewMode = viewMode;
    this.capturedContent = content;
    this.onChange = onChange;
  }

  static async create(
    markdown: string,
    initialViewMode: ViewMode = "rendered"
  ): Promise<EditorTestHarness> {
    // Lazy import to avoid circular deps
    const { default: MarkdownEditor } = await import(
      "../components/EditorArea/MarkdownEditor"
    );

    let capturedContent = markdown;
    const onChange = vi.fn<(content: string) => void>((content: string) => {
      capturedContent = content;
    });

    const result = render(
      React.createElement(MarkdownEditor, {
        initialContent: markdown,
        viewMode: initialViewMode,
        onChange,
      })
    );

    const harness = new EditorTestHarness(
      result,
      initialViewMode,
      markdown,
      onChange
    );
    // Wire up capturedContent sync
    Object.defineProperty(harness, "capturedContent", {
      get: () => capturedContent,
      set: (v: string) => {
        capturedContent = v;
      },
    });

    // Wait for initial render to settle
    if (initialViewMode === "rendered") {
      await waitFor(() => {
        const el = document.querySelector(".milkdown-editor .ProseMirror");
        if (!el) throw new Error("Editor not mounted");
      });
    } else {
      await waitFor(() => {
        const el = document.querySelector(".markdown-code-input .cm-editor");
        if (!el) throw new Error("Code editor not mounted");
      });
    }

    return harness;
  }

  // --- View mode ---

  async setViewMode(mode: ViewMode): Promise<void> {
    if (mode === this.currentViewMode) return;
    await this.switchTo(mode);
  }

  async switchToCodeView(): Promise<void> {
    await this.setViewMode("code");
  }

  async switchToRenderedView(): Promise<void> {
    await this.setViewMode("rendered");
  }

  async toggleView(): Promise<void> {
    const next: ViewMode =
      this.currentViewMode === "rendered" ? "code" : "rendered";
    await this.switchTo(next);
  }

  private async switchTo(mode: ViewMode): Promise<void> {
    const { default: MarkdownEditor } = await import(
      "../components/EditorArea/MarkdownEditor"
    );

    this.renderResult.rerender(
      React.createElement(MarkdownEditor, {
        initialContent: this.capturedContent,
        viewMode: mode,
        onChange: this.onChange,
      })
    );

    this.currentViewMode = mode;

    if (mode === "rendered") {
      await waitFor(() => {
        const el = document.querySelector(".milkdown-editor .ProseMirror");
        if (!el) throw new Error("Editor not mounted after switch");
      });
    } else {
      await waitFor(() => {
        const el = document.querySelector(".markdown-code-input .cm-editor");
        if (!el) throw new Error("Code editor not mounted after switch");
      });
    }
  }

  // --- State ---

  getMarkdown(): string {
    return this.capturedContent;
  }

  getCodeViewText(): string {
    const el = document.querySelector(".markdown-code-input .cm-content");
    return el?.textContent ?? "";
  }

  getViewMode(): ViewMode {
    return this.currentViewMode;
  }

  // Returns the current editor's root DOM element. Useful for stability tests
  // (asserting the same node is reused across re-renders).
  getEditorElement(): HTMLElement {
    if (this.currentViewMode === "rendered") {
      const el = document.querySelector(
        ".milkdown-editor .ProseMirror"
      ) as HTMLElement;
      if (!el) throw new Error("Rendered editor element not found");
      return el;
    }
    const el = document.querySelector(".markdown-code-input .cm-content") as HTMLElement;
    if (!el) throw new Error("Code editor element not found");
    return el;
  }

  // Re-renders the component with a new initialContent value while keeping the
  // current view mode. Use this to simulate upstream prop changes (e.g. from the
  // Zustand store) and verify that the editor does not recreate itself.
  async rerenderWithContent(content: string): Promise<void> {
    const { default: MarkdownEditor } = await import(
      "../components/EditorArea/MarkdownEditor"
    );

    this.renderResult.rerender(
      React.createElement(MarkdownEditor, {
        initialContent: content,
        viewMode: this.currentViewMode,
        onChange: this.onChange,
      })
    );

    if (this.currentViewMode === "rendered") {
      await waitFor(() => {
        const el = document.querySelector(".milkdown-editor .ProseMirror");
        if (!el) throw new Error("Editor not mounted after rerender");
      });
    } else {
      await waitFor(() => {
        const el = document.querySelector(".markdown-code-input .cm-editor");
        if (!el) throw new Error("Code editor not mounted after rerender");
      });
    }
  }

  // --- Interactions ---

  async pressKey(
    key: string,
    modifiers: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
  ): Promise<void> {
    const target = this.getEditorElement();
    const event = new KeyboardEvent("keydown", {
      key,
      code: `Key${key.toUpperCase()}`,
      bubbles: true,
      cancelable: true,
      metaKey: modifiers.meta ?? false,
      ctrlKey: modifiers.ctrl ?? false,
      shiftKey: modifiers.shift ?? false,
      altKey: modifiers.alt ?? false,
    });
    target.dispatchEvent(event);
  }

  async bold(): Promise<void> {
    await this.pressKey("b", { meta: true });
  }

  async italic(): Promise<void> {
    await this.pressKey("i", { meta: true });
  }

  async heading(level: number): Promise<void> {
    // Heading shortcuts use Digit codes, not letter codes
    const target = this.getEditorElement();
    const event = new KeyboardEvent("keydown", {
      key: String(level),
      code: `Digit${level}`,
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });
    target.dispatchEvent(event);
  }

  // Waits until the rendered view contains a heading at the given level.
  // Use after h.heading() since ProseMirror applies the command asynchronously.
  async waitForHeading(level: number): Promise<void> {
    await waitFor(() => {
      if (this.query.heading(level) === null)
        throw new Error(`h${level} not found`);
    });
  }

  // selectText is not supported in jsdom: ProseMirror and CodeMirror both rely
  // on real DOM Selection APIs that jsdom does not fully implement.
  async selectText(_text: string): Promise<void> {
    // no-op
  }

  async emitEvent(event: string): Promise<void> {
    const { getWebEventEmitter } = await import("../platform/eventAdapter");
    getWebEventEmitter().emit(event);
  }

  async clickCell(row: number, col: number): Promise<void> {
    const cell = this.query.tableCell(row, col);
    if (!cell) throw new Error(`No cell at (${row}, ${col})`);
    cell.click();
  }

  async rightClickCell(row: number, col: number): Promise<void> {
    const cell = this.query.tableCell(row, col);
    if (!cell) throw new Error(`No cell at (${row}, ${col})`);
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    cell.dispatchEvent(event);
  }

  async type(text: string): Promise<void> {
    const { default: userEvent } = await import(
      "@testing-library/user-event"
    );
    const target = this.getEditorElement();
    await userEvent.setup().type(target, text);
  }

  async keyboard(keys: string): Promise<void> {
    const { default: userEvent } = await import(
      "@testing-library/user-event"
    );
    await userEvent.setup().keyboard(keys);
  }

  // --- Roundtrip helpers ---

  async roundtrip(): Promise<void> {
    // rendered -> code -> rendered
    await this.setViewMode("rendered");
    await this.setViewMode("code");
    await this.setViewMode("rendered");
  }

  async reverseRoundtrip(): Promise<void> {
    // code -> rendered -> code
    await this.setViewMode("code");
    await this.setViewMode("rendered");
    await this.setViewMode("code");
  }

  // --- Cleanup ---

  destroy(): void {
    this.renderResult.unmount();
  }
}
