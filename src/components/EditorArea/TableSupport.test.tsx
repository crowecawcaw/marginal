import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import MarkdownEditor from "./MarkdownEditor";

describe("Table Support", () => {
  describe("Inline Formatting Persistence", () => {
    it("should preserve inline code when switching from presentation to code and back", async () => {
      const tableWithCode = `| Function | Usage |
|----------|-------|
| \`foo()\` | Call foo |`;

      let currentContent = tableWithCode;
      const onChange = (content: string) => {
        currentContent = content;
      };

      // Start in presentation view
      const { rerender, unmount } = render(
        <MarkdownEditor
          initialContent={tableWithCode}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        const codeElements = document.querySelectorAll(".editor-text-code");
        expect(codeElements.length).toBeGreaterThan(0);
      });

      // Switch to code view
      rerender(
        <MarkdownEditor
          initialContent={currentContent}
          viewMode="code"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        const codeView = document.querySelector(".markdown-code-input");
        expect(codeView?.textContent).toContain("`foo()`");
      });

      unmount();

      // Switch back to presentation view
      render(
        <MarkdownEditor
          initialContent={currentContent}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        // Verify inline code is still present
        const codeElements = document.querySelectorAll(".editor-text-code");
        expect(codeElements.length).toBeGreaterThan(0);

        const codeText = Array.from(codeElements)
          .map((el) => el.textContent)
          .join("");
        expect(codeText).toContain("foo()");
      });
    });
  });

  describe("Inline Formatting in Cells", () => {
    it("should render inline code in table cells", async () => {
      const tableMarkdown = `| Function | Usage |
|----------|-------|
| \`foo()\` | Call foo |`;

      const onChange = () => {};

      render(
        <MarkdownEditor
          initialContent={tableMarkdown}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        const table = document.querySelector(".editor-table");
        expect(table).toBeTruthy();

        // Check for inline code formatting
        const codeElements = document.querySelectorAll(".editor-text-code");
        expect(codeElements.length).toBeGreaterThan(0);

        // Verify the code content
        const codeText = Array.from(codeElements)
          .map((el) => el.textContent)
          .join("");
        expect(codeText).toContain("foo()");
      });
    });

    it("should render multiple inline code blocks in one cell", async () => {
      const tableMarkdown = `| Code |
|------|
| Use \`foo()\` and \`bar()\` |`;

      const onChange = () => {};

      render(
        <MarkdownEditor
          initialContent={tableMarkdown}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        const codeElements = document.querySelectorAll(".editor-text-code");
        expect(codeElements.length).toBe(2);

        const codeTags = Array.from(codeElements).map((el) => el.textContent);
        expect(codeTags).toContain("foo()");
        expect(codeTags).toContain("bar()");
      });
    });

    it("should render inline code with special characters", async () => {
      const tableMarkdown = `| Example |
|---------|
| \`x => x + 1\` |`;

      const onChange = () => {};

      render(
        <MarkdownEditor
          initialContent={tableMarkdown}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        const codeElement = document.querySelector(".editor-text-code");
        expect(codeElement?.textContent).toBe("x => x + 1");
      });
    });

    it("should render mixed text and inline code in cells", async () => {
      const tableMarkdown = `| Description |
|-------------|
| The \`useState\` hook is useful |`;

      const onChange = () => {};

      render(
        <MarkdownEditor
          initialContent={tableMarkdown}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        // Get the data cell (not header)
        const cells = document.querySelectorAll(".editor-table-cell");
        const dataCell = Array.from(cells).find(
          (cell) =>
            !cell.classList.contains("editor-table-cell-header") &&
            cell.textContent?.includes("useState")
        );

        expect(dataCell?.textContent).toContain("The");
        expect(dataCell?.textContent).toContain("useState");
        expect(dataCell?.textContent).toContain("hook is useful");

        // Check that useState is formatted as code
        const codeElement = document.querySelector(".editor-text-code");
        expect(codeElement?.textContent).toBe("useState");
      });
    });
  });

  describe("Markdown to Presentation View", () => {
    it("should render a simple table in presentation view", async () => {
      const tableMarkdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;

      const onChange = () => {};

      render(
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

      // Check for header cells
      const headerCells = document.querySelectorAll(".editor-table-cell-header");
      expect(headerCells.length).toBe(2);

      // Check for data cells
      const dataCells = document.querySelectorAll(
        ".editor-table-cell:not(.editor-table-cell-header)"
      );
      expect(dataCells.length).toBe(2);
    });

    it("should render a table with multiple rows", async () => {
      const tableMarkdown = `| A | B | C |
|---|---|---|
| 1 | 2 | 3 |
| 4 | 5 | 6 |
| 7 | 8 | 9 |`;

      const onChange = () => {};

      render(
        <MarkdownEditor
          initialContent={tableMarkdown}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        const table = document.querySelector(".editor-table");
        expect(table).toBeTruthy();

        // 3 header cells + 9 data cells = 12 total cells
        const allCells = document.querySelectorAll(
          ".editor-table-cell, .editor-table-cell-header"
        );
        expect(allCells.length).toBe(12);
      });
    });

    it("should handle table with escaped pipes in cell content", async () => {
      const tableMarkdown = `| Header |
|--------|
| Cell with \\| pipe |`;

      const onChange = () => {};

      render(
        <MarkdownEditor
          initialContent={tableMarkdown}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        const table = document.querySelector(".editor-table");
        expect(table).toBeTruthy();

        // Check that the pipe character is rendered (check the data cell, not header)
        const cells = document.querySelectorAll(".editor-table-cell");
        const dataCell = Array.from(cells).find(cell =>
          cell.textContent?.includes("pipe")
        );
        expect(dataCell?.textContent).toContain("|");
      });
    });

    it("should render markdown content before and after tables", async () => {
      const markdown = `# Heading

Some text before the table.

| Col 1 | Col 2 |
|-------|-------|
| A     | B     |

Some text after the table.`;

      const onChange = () => {};

      render(
        <MarkdownEditor
          initialContent={markdown}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        // Check for heading
        const heading = document.querySelector(".editor-heading-h1");
        expect(heading).toBeTruthy();

        // Check for table
        const table = document.querySelector(".editor-table");
        expect(table).toBeTruthy();

        // Check for paragraphs
        const paragraphs = document.querySelectorAll(".editor-paragraph");
        expect(paragraphs.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Presentation to Markdown Conversion", () => {
    it("should convert table back to markdown format", async () => {
      const tableMarkdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;

      let capturedMarkdown = tableMarkdown;
      const onChange = (content: string) => {
        capturedMarkdown = content;
      };

      render(
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

      // Verify the content contains expected table elements
      expect(capturedMarkdown).toContain("|");
      expect(capturedMarkdown).toContain("Header 1");
      expect(capturedMarkdown).toContain("Header 2");
      expect(capturedMarkdown).toContain("Cell 1");
      expect(capturedMarkdown).toContain("Cell 2");
    });

    it("should preserve table structure when switching views", async () => {
      const tableMarkdown = `| A | B |
|---|---|
| 1 | 2 |`;

      const { rerender } = render(
        <MarkdownEditor
          initialContent={tableMarkdown}
          viewMode="rendered"
          onChange={() => {}}
        />
      );

      // Wait for table to render
      await waitFor(() => {
        const table = document.querySelector(".editor-table");
        expect(table).toBeTruthy();
      });

      // Switch to code view
      rerender(
        <MarkdownEditor
          initialContent={tableMarkdown}
          viewMode="code"
          onChange={() => {}}
        />
      );

      // Check that markdown is preserved
      await waitFor(() => {
        const codeView = document.querySelector(".markdown-code-input");
        expect(codeView?.textContent).toContain("|");
        expect(codeView?.textContent).toContain("A");
        expect(codeView?.textContent).toContain("B");
      });
    });
  });

  describe("View Mode Switching", () => {
    it("should preserve table when switching from rendered to code view", async () => {
      const tableMarkdown = `| Col 1 | Col 2 |
|-------|-------|
| A     | B     |`;

      let currentContent = tableMarkdown;
      const onChange = (content: string) => {
        currentContent = content;
      };

      const { rerender } = render(
        <MarkdownEditor
          initialContent={currentContent}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      // Wait for initial render
      await waitFor(() => {
        const table = document.querySelector(".editor-table");
        expect(table).toBeTruthy();
      });

      // Switch to code view with the updated content
      rerender(
        <MarkdownEditor
          initialContent={currentContent}
          viewMode="code"
          onChange={onChange}
        />
      );

      // Verify table markdown is present
      await waitFor(() => {
        expect(currentContent).toContain("|");
        expect(currentContent).toContain("Col 1");
        expect(currentContent).toContain("Col 2");
      });
    });

    it("should preserve table when switching from code to rendered view", async () => {
      const tableMarkdown = `| Header A | Header B |
|----------|----------|
| Value 1  | Value 2  |`;

      const { rerender } = render(
        <MarkdownEditor
          initialContent={tableMarkdown}
          viewMode="code"
          onChange={() => {}}
        />
      );

      // Switch to rendered view
      rerender(
        <MarkdownEditor
          initialContent={tableMarkdown}
          viewMode="rendered"
          onChange={() => {}}
        />
      );

      // Wait for table to render
      await waitFor(() => {
        const table = document.querySelector(".editor-table");
        expect(table).toBeTruthy();

        const cells = document.querySelectorAll(
          ".editor-table-cell, .editor-table-cell-header"
        );
        expect(cells.length).toBe(4); // 2 headers + 2 data cells
      });
    });

    it("should not lose table content during multiple view switches", async () => {
      const originalMarkdown = `| Name | Age |
|------|-----|
| John | 30  |
| Jane | 25  |`;

      let currentContent = originalMarkdown;
      const onChange = (content: string) => {
        currentContent = content;
      };

      const { rerender } = render(
        <MarkdownEditor
          initialContent={currentContent}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      // Wait for initial render
      await waitFor(() => {
        const table = document.querySelector(".editor-table");
        expect(table).toBeTruthy();
      });

      // Switch to code view
      rerender(
        <MarkdownEditor
          initialContent={currentContent}
          viewMode="code"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        expect(currentContent).toContain("Name");
        expect(currentContent).toContain("Age");
      });

      // Switch back to rendered view
      rerender(
        <MarkdownEditor
          initialContent={currentContent}
          viewMode="rendered"
          onChange={onChange}
        />
      );

      await waitFor(() => {
        const table = document.querySelector(".editor-table");
        expect(table).toBeTruthy();

        // Verify content is still present
        const tableText = table?.textContent || "";
        expect(tableText).toContain("Name");
        expect(tableText).toContain("Age");
        expect(tableText).toContain("John");
        expect(tableText).toContain("Jane");
      });
    });
  });
});
