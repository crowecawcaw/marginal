import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import MarkdownEditor from "../MarkdownEditor";

describe("ContentSyncPlugin", () => {
  describe("RenderedContentSyncPlugin", () => {
    describe("empty document initialization", () => {
      it("initializes with h1 heading when content is empty", async () => {
        render(
          <MarkdownEditor
            initialContent=""
            viewMode="rendered"
            onChange={vi.fn()}
          />,
        );

        // Wait for the editor to initialize with a heading
        await vi.waitFor(() => {
          const heading = document.querySelector(".editor-heading-h1");
          expect(heading).toBeInTheDocument();
        });
      });

      it("initializes with h1 heading when content is whitespace only", async () => {
        render(
          <MarkdownEditor
            initialContent="   "
            viewMode="rendered"
            onChange={vi.fn()}
          />,
        );

        // Wait for the editor to initialize with a heading
        await vi.waitFor(() => {
          const heading = document.querySelector(".editor-heading-h1");
          expect(heading).toBeInTheDocument();
        });
      });

      it("h1 heading is empty and ready for input", async () => {
        render(
          <MarkdownEditor
            initialContent=""
            viewMode="rendered"
            onChange={vi.fn()}
          />,
        );

        // Wait for the editor to initialize with an empty heading
        await vi.waitFor(() => {
          const heading = document.querySelector(".editor-heading-h1");
          expect(heading).toBeInTheDocument();
          // The heading should be empty, ready for user input
          expect(heading?.textContent).toBe("");
        });
      });

      it("does not fire onChange on initial mount with empty content", async () => {
        const onChange = vi.fn();

        render(
          <MarkdownEditor
            initialContent=""
            viewMode="rendered"
            onChange={onChange}
          />,
        );

        // Wait for initialization
        await vi.waitFor(() => {
          const heading = document.querySelector(".editor-heading-h1");
          expect(heading).toBeInTheDocument();
        });

        // editorState initializer runs before OnChangePlugin mounts,
        // so no spurious onChange on initial render
        expect(onChange).not.toHaveBeenCalled();
      });
    });

    describe("non-empty document initialization", () => {
      it("parses markdown content normally when not empty", async () => {
        const content = "# Test Heading\n\nSome content here.";
        render(
          <MarkdownEditor
            initialContent={content}
            viewMode="rendered"
            onChange={vi.fn()}
          />,
        );

        await vi.waitFor(() => {
          const heading = document.querySelector(".editor-heading-h1");
          expect(heading).toBeInTheDocument();
          expect(heading?.textContent).toBe("Test Heading");
        });
      });

      it("does not add implicit heading when content already has one", async () => {
        const content = "# Existing Heading";
        render(
          <MarkdownEditor
            initialContent={content}
            viewMode="rendered"
            onChange={vi.fn()}
          />,
        );

        await vi.waitFor(() => {
          const headings = document.querySelectorAll(".editor-heading-h1");
          // Should only have one heading, not two
          expect(headings.length).toBe(1);
          expect(headings[0]?.textContent).toBe("Existing Heading");
        });
      });

      it("parses paragraph content when no heading is present", async () => {
        const content = "This is just a paragraph.";
        render(
          <MarkdownEditor
            initialContent={content}
            viewMode="rendered"
            onChange={vi.fn()}
          />,
        );

        await vi.waitFor(() => {
          const editor = document.querySelector(".markdown-editor-input");
          expect(editor).toBeInTheDocument();
          expect(editor?.textContent).toContain("This is just a paragraph.");
        });
      });

      it("preserves table content", async () => {
        const content =
          "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |";
        render(
          <MarkdownEditor
            initialContent={content}
            viewMode="rendered"
            onChange={vi.fn()}
          />,
        );

        await vi.waitFor(() => {
          const table = document.querySelector("table");
          expect(table).toBeInTheDocument();
        });
      });
    });

    describe("edge cases", () => {
      it("handles single space as empty", async () => {
        render(
          <MarkdownEditor
            initialContent=" "
            viewMode="rendered"
            onChange={vi.fn()}
          />,
        );

        await vi.waitFor(() => {
          const heading = document.querySelector(".editor-heading-h1");
          expect(heading).toBeInTheDocument();
        });
      });

      it("does not treat single character as empty", async () => {
        const content = "x";
        render(
          <MarkdownEditor
            initialContent={content}
            viewMode="rendered"
            onChange={vi.fn()}
          />,
        );

        await vi.waitFor(() => {
          const editor = document.querySelector(".markdown-editor-input");
          expect(editor).toBeInTheDocument();
          expect(editor?.textContent).toBe("x");
        });
      });
    });
  });

  describe("CodeContentSyncPlugin", () => {
    it("initializes code view with plain text content", async () => {
      const content = "# Test\n\nSome content";
      render(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const editor = document.querySelector(".markdown-code-input");
        expect(editor).toBeInTheDocument();
        expect(editor?.textContent).toBe(content);
      });
    });

    it("does not add implicit heading in code view when empty", async () => {
      render(
        <MarkdownEditor initialContent="" viewMode="code" onChange={vi.fn()} />,
      );

      await vi.waitFor(() => {
        const editor = document.querySelector(".markdown-code-input");
        expect(editor).toBeInTheDocument();
        // Code view should be empty, not have "# " added
        expect(editor?.textContent).toBe("");
      });
    });

    it("preserves exact content including whitespace in code view", async () => {
      const content = "  # Heading with leading spaces\n\n  Content with indent";
      render(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const editor = document.querySelector(".markdown-code-input");
        expect(editor).toBeInTheDocument();
        expect(editor?.textContent).toBe(content);
      });
    });
  });
});
