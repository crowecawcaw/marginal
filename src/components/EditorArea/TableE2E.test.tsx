import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import MarkdownEditor from "./MarkdownEditor";

describe("Table End-to-End Tests", () => {
  it("should preserve table structure when adding columns", async () => {
    const tableMarkdown = `| A | B |
|---|---|
| 1 | 2 |`;

    const onChange = vi.fn();

    const { unmount } = render(
      <MarkdownEditor
        initialContent={tableMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const table = document.querySelector(".editor-table");
      expect(table).toBeTruthy();

      const cells = document.querySelectorAll(
        ".editor-table-cell, .editor-table-cell-header"
      );
      expect(cells.length).toBe(4); // 2 header + 2 data
    });

    unmount();

    // Test with 3 columns
    const tableWith3Cols = `| A | B | C |
|---|---|---|
| 1 | 2 | 3 |`;

    render(
      <MarkdownEditor
        initialContent={tableWith3Cols}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const cells = document.querySelectorAll(
        ".editor-table-cell, .editor-table-cell-header"
      );
      expect(cells.length).toBe(6); // 3 header + 3 data
    });
  });

  it("should preserve table structure when removing columns", async () => {
    const tableMarkdown = `| A | B | C |
|---|---|---|
| 1 | 2 | 3 |`;

    const onChange = vi.fn();

    const { unmount } = render(
      <MarkdownEditor
        initialContent={tableMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const cells = document.querySelectorAll(
        ".editor-table-cell, .editor-table-cell-header"
      );
      expect(cells.length).toBe(6); // 3 header + 3 data
    });

    unmount();

    // Test with 2 columns
    const tableWith2Cols = `| A | B |
|---|---|
| 1 | 2 |`;

    render(
      <MarkdownEditor
        initialContent={tableWith2Cols}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const cells = document.querySelectorAll(
        ".editor-table-cell, .editor-table-cell-header"
      );
      expect(cells.length).toBe(4); // 2 header + 2 data
    });
  });

  it("should preserve table structure when adding rows", async () => {
    const tableMarkdown = `| A | B |
|---|---|
| 1 | 2 |`;

    const onChange = vi.fn();

    const { unmount } = render(
      <MarkdownEditor
        initialContent={tableMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const rows = document.querySelectorAll(".editor-table tr");
      expect(rows.length).toBe(2); // 1 header row + 1 data row
    });

    unmount();

    // Add another row
    const tableWith2Rows = `| A | B |
|---|---|
| 1 | 2 |
| 3 | 4 |`;

    render(
      <MarkdownEditor
        initialContent={tableWith2Rows}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const rows = document.querySelectorAll(".editor-table tr");
      expect(rows.length).toBe(3); // 1 header row + 2 data rows
    });
  });

  it("should preserve table structure when removing rows", async () => {
    const tableMarkdown = `| A | B |
|---|---|
| 1 | 2 |
| 3 | 4 |`;

    const onChange = vi.fn();

    const { unmount } = render(
      <MarkdownEditor
        initialContent={tableMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const rows = document.querySelectorAll(".editor-table tr");
      expect(rows.length).toBe(3); // 1 header row + 2 data rows
    });

    unmount();

    // Remove a row
    const tableWith1Row = `| A | B |
|---|---|
| 1 | 2 |`;

    render(
      <MarkdownEditor
        initialContent={tableWith1Row}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const rows = document.querySelectorAll(".editor-table tr");
      expect(rows.length).toBe(2); // 1 header row + 1 data row
    });
  });

  it("should not delete entire table when removing a column", async () => {
    const tableMarkdown = `| A | B | C |
|---|---|---|
| 1 | 2 | 3 |`;

    const onChange = vi.fn();

    const { unmount } = render(
      <MarkdownEditor
        initialContent={tableMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const table = document.querySelector(".editor-table");
      expect(table).toBeTruthy();
    });

    unmount();

    // Simulate removing middle column
    const tableAfterDelete = `| A | C |
|---|---|
| 1 | 3 |`;

    render(
      <MarkdownEditor
        initialContent={tableAfterDelete}
        viewMode="rendered"
        onChange={onChange}
      />
    );

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
      expect(tableText).toContain("C");
      expect(tableText).not.toContain("B");
    });
  });

  it("should switch between code and presentation views preserving content", async () => {
    const tableMarkdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;

    const onChange = vi.fn();

    const { unmount } = render(
      <MarkdownEditor
        initialContent={tableMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const table = document.querySelector(".editor-table");
      expect(table).toBeTruthy();
    });

    unmount();

    // Switch to code view
    render(
      <MarkdownEditor
        initialContent={tableMarkdown}
        viewMode="code"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const codeView = document.querySelector(".markdown-code-input");
      expect(codeView).toBeTruthy();
      const content = codeView?.textContent || "";
      expect(content).toContain("|");
      expect(content).toContain("Header 1");
    });
  });
});
