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
    const el = document.querySelector(`.editor-heading-h${level}`);
    return el?.textContent ?? null;
  }

  boldTexts(): string[] {
    return Array.from(document.querySelectorAll(".editor-text-bold")).map(
      (el) => el.textContent ?? ""
    );
  }

  italicTexts(): string[] {
    return Array.from(document.querySelectorAll(".editor-text-italic")).map(
      (el) => el.textContent ?? ""
    );
  }

  codeTexts(): string[] {
    return Array.from(document.querySelectorAll(".editor-text-code")).map(
      (el) => el.textContent ?? ""
    );
  }

  strikethroughTexts(): string[] {
    return Array.from(
      document.querySelectorAll(".editor-text-strikethrough")
    ).map((el) => el.textContent ?? "");
  }

  tableData(): string[][] {
    const rows = document.querySelectorAll(".editor-table tr");
    return Array.from(rows).map((row) =>
      Array.from(
        row.querySelectorAll(
          ".editor-table-cell, .editor-table-cell-header"
        )
      ).map((cell) => cell.textContent ?? "")
    );
  }

  tableCell(row: number, col: number): HTMLElement | null {
    const rows = document.querySelectorAll(".editor-table tr");
    if (row >= rows.length) return null;
    const cells = rows[row].querySelectorAll(
      ".editor-table-cell, .editor-table-cell-header"
    );
    return (cells[col] as HTMLElement) ?? null;
  }

  links(): LinkInfo[] {
    return Array.from(
      document.querySelectorAll("a.editor-link")
    ).map((el) => ({
      text: el.textContent ?? "",
      href: el.getAttribute("href") ?? "",
    }));
  }

  paragraphs(): string[] {
    return Array.from(document.querySelectorAll(".editor-paragraph")).map(
      (el) => el.textContent ?? ""
    );
  }

  hasList(type: "ul" | "ol"): boolean {
    return document.querySelector(`.editor-list-${type}`) !== null;
  }

  listItems(): string[] {
    return Array.from(document.querySelectorAll(".editor-list-item")).map(
      (el) => el.textContent ?? ""
    );
  }

  hasTable(): boolean {
    return document.querySelector(".editor-table") !== null;
  }

  hasBlockquote(): boolean {
    return document.querySelector(".editor-quote") !== null;
  }

  blockquoteTexts(): string[] {
    return Array.from(document.querySelectorAll(".editor-quote")).map(
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
    // Lazy import to avoid circular deps and keep Lexical imports out of test files
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
        const el = document.querySelector(".markdown-editor-input");
        if (!el) throw new Error("Editor not mounted");
      });
    } else {
      await waitFor(() => {
        const el = document.querySelector(".markdown-code-input");
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
        const el = document.querySelector(".markdown-editor-input");
        if (!el) throw new Error("Editor not mounted after switch");
      });
    } else {
      await waitFor(() => {
        const el = document.querySelector(".markdown-code-input");
        if (!el) throw new Error("Code editor not mounted after switch");
      });
    }
  }

  // --- State ---

  getMarkdown(): string {
    return this.capturedContent;
  }

  getCodeViewText(): string {
    const el = document.querySelector(".markdown-code-input");
    return el?.textContent ?? "";
  }

  getViewMode(): ViewMode {
    return this.currentViewMode;
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
    await this.pressKey(String(level), { meta: true });
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

  // --- Private helpers ---

  private getEditorElement(): HTMLElement {
    if (this.currentViewMode === "rendered") {
      const el = document.querySelector(
        ".markdown-editor-input"
      ) as HTMLElement;
      if (!el) throw new Error("Rendered editor element not found");
      return el;
    }
    const el = document.querySelector(".markdown-code-input") as HTMLElement;
    if (!el) throw new Error("Code editor element not found");
    return el;
  }
}
