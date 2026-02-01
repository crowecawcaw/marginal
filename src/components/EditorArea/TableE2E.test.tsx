import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import MarkdownEditor from "./MarkdownEditor";

describe("Table End-to-End Roundtrip Tests", () => {
  it("preserves simple table through rendered → code → rendered roundtrip", async () => {
    const originalMarkdown = `| A | B |
|---|---|
| 1 | 2 |`;

    let capturedContent = originalMarkdown;
    const onChange = vi.fn((content: string) => {
      capturedContent = content;
    });

    // Step 1: Render in rendered view
    const { rerender } = render(
      <MarkdownEditor
        initialContent={originalMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Wait for table to render and onChange to be called
    await waitFor(() => {
      const table = document.querySelector(".editor-table");
      expect(table).toBeTruthy();
      expect(onChange).toHaveBeenCalled();
    });

    // Step 2: Get the content from rendered view, switch to code view
    const contentAfterRendered = capturedContent;

    rerender(
      <MarkdownEditor
        initialContent={contentAfterRendered}
        viewMode="code"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const codeView = document.querySelector(".markdown-code-input");
      expect(codeView).toBeTruthy();
    });

    // Step 3: Switch back to rendered view
    const contentAfterCode = capturedContent;

    rerender(
      <MarkdownEditor
        initialContent={contentAfterCode}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Step 4: Verify table is still rendered correctly
    await waitFor(() => {
      const table = document.querySelector(".editor-table");
      expect(table).toBeTruthy();

      const cells = document.querySelectorAll(
        ".editor-table-cell, .editor-table-cell-header"
      );
      expect(cells.length).toBe(4); // 2 header + 2 data

      // Verify content
      const tableText = table?.textContent || "";
      expect(tableText).toContain("A");
      expect(tableText).toContain("B");
      expect(tableText).toContain("1");
      expect(tableText).toContain("2");
    });
  });

  it("preserves inline code in table cells through roundtrip", async () => {
    const originalMarkdown = `| Code |
|------|
| \`foo()\` |`;

    let capturedContent = originalMarkdown;
    const onChange = vi.fn((content: string) => {
      capturedContent = content;
    });

    // Step 1: Render in rendered view
    const { rerender } = render(
      <MarkdownEditor
        initialContent={originalMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const codeElement = document.querySelector(".editor-text-code");
      expect(codeElement).toBeTruthy();
      expect(codeElement?.textContent).toBe("foo()");
    });

    // Step 2: Switch to code view
    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="code"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const codeView = document.querySelector(".markdown-code-input");
      expect(codeView?.textContent).toContain("`foo()`");
    });

    // Step 3: Switch back to rendered view
    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Step 4: Verify inline code is still formatted
    await waitFor(() => {
      const codeElement = document.querySelector(".editor-text-code");
      expect(codeElement).toBeTruthy();
      expect(codeElement?.textContent).toBe("foo()");
    });
  });

  it("preserves multi-row table through roundtrip", async () => {
    const originalMarkdown = `| Name | Age |
|------|-----|
| Alice | 30 |
| Bob | 25 |
| Carol | 28 |`;

    let capturedContent = originalMarkdown;
    const onChange = vi.fn((content: string) => {
      capturedContent = content;
    });

    // Render in rendered view
    const { rerender } = render(
      <MarkdownEditor
        initialContent={originalMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const rows = document.querySelectorAll(".editor-table tr");
      expect(rows.length).toBe(4); // 1 header + 3 data rows
    });

    // Switch to code and back
    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="code"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const codeView = document.querySelector(".markdown-code-input");
      expect(codeView).toBeTruthy();
    });

    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Verify all rows preserved
    await waitFor(() => {
      const table = document.querySelector(".editor-table");
      expect(table).toBeTruthy();

      const tableText = table?.textContent || "";
      expect(tableText).toContain("Alice");
      expect(tableText).toContain("Bob");
      expect(tableText).toContain("Carol");
      expect(tableText).toContain("30");
      expect(tableText).toContain("25");
      expect(tableText).toContain("28");
    });
  });

  it("preserves escaped pipes in table cells through roundtrip", async () => {
    const originalMarkdown = `| Expression |
|------------|
| a \\| b |`;

    let capturedContent = originalMarkdown;
    const onChange = vi.fn((content: string) => {
      capturedContent = content;
    });

    // Render in rendered view
    const { rerender } = render(
      <MarkdownEditor
        initialContent={originalMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const table = document.querySelector(".editor-table");
      expect(table).toBeTruthy();
      // The pipe should be rendered (unescaped) in the cell
      const cells = document.querySelectorAll(".editor-table-cell");
      const dataCell = Array.from(cells).find(
        (cell) => cell.textContent?.includes("a") && cell.textContent?.includes("b")
      );
      expect(dataCell?.textContent).toContain("|");
    });

    // Switch to code view
    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="code"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const codeView = document.querySelector(".markdown-code-input");
      expect(codeView).toBeTruthy();
      // Content should contain a pipe (escaped or not)
      expect(codeView?.textContent).toContain("|");
    });

    // Switch back to rendered view
    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Verify table still renders with the cell content
    await waitFor(() => {
      const table = document.querySelector(".editor-table");
      expect(table).toBeTruthy();
      expect(table?.textContent).toContain("a");
      expect(table?.textContent).toContain("b");
    });
  });

  it("preserves table with heading through roundtrip", async () => {
    const originalMarkdown = `# Title

| Col A | Col B |
|-------|-------|
| X | Y |`;

    let capturedContent = originalMarkdown;
    const onChange = vi.fn((content: string) => {
      capturedContent = content;
    });

    // Render in rendered view
    const { rerender } = render(
      <MarkdownEditor
        initialContent={originalMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const heading = document.querySelector(".editor-heading-h1");
      const table = document.querySelector(".editor-table");
      expect(heading).toBeTruthy();
      expect(table).toBeTruthy();
    });

    // Switch to code and back
    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="code"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const codeView = document.querySelector(".markdown-code-input");
      expect(codeView).toBeTruthy();
    });

    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Verify heading and table are preserved
    await waitFor(() => {
      const heading = document.querySelector(".editor-heading-h1");
      const table = document.querySelector(".editor-table");

      expect(heading?.textContent).toBe("Title");
      expect(table).toBeTruthy();
      expect(table?.textContent).toContain("X");
      expect(table?.textContent).toContain("Y");
    });
  });

  it("preserves table content through multiple view switches", async () => {
    // Test that a table's data survives multiple roundtrips
    const originalMarkdown = `| Product | Price |
|---------|-------|
| Apple | $1.00 |
| Banana | $0.50 |`;

    let capturedContent = originalMarkdown;
    const onChange = vi.fn((content: string) => {
      capturedContent = content;
    });

    // Render in rendered view
    const { rerender } = render(
      <MarkdownEditor
        initialContent={originalMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const table = document.querySelector(".editor-table");
      expect(table).toBeTruthy();
      expect(table?.textContent).toContain("Apple");
    });

    // First roundtrip: rendered → code → rendered
    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="code"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const codeView = document.querySelector(".markdown-code-input");
      expect(codeView).toBeTruthy();
    });

    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Second roundtrip to ensure stability
    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="code"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const codeView = document.querySelector(".markdown-code-input");
      expect(codeView).toBeTruthy();
    });

    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Verify all content is preserved after multiple roundtrips
    await waitFor(() => {
      const table = document.querySelector(".editor-table");
      expect(table).toBeTruthy();

      const tableText = table?.textContent || "";
      expect(tableText).toContain("Product");
      expect(tableText).toContain("Price");
      expect(tableText).toContain("Apple");
      expect(tableText).toContain("Banana");
      expect(tableText).toContain("$1.00");
      expect(tableText).toContain("$0.50");
    });
  });
});
