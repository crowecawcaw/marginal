import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import MarkdownEditor from "./MarkdownEditor";

describe("MarkdownEditor", () => {
  describe("Code View", () => {
    it("renders markdown content in code editor", async () => {
      const content = "# Hello World\n\nThis is **bold** text.";
      render(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const editor = document.querySelector(".markdown-code-input .cm-editor");
        expect(editor).toBeInTheDocument();
        // CodeMirror renders lines as separate divs, so textContent joins without newlines
        const cmContent = document.querySelector(".markdown-code-input .cm-content");
        expect(cmContent?.textContent).toContain("# Hello World");
        expect(cmContent?.textContent).toContain("This is **bold** text.");
      });
    });

    it("displays content in code view on initial render", async () => {
      const content = "# Test Content\n\nThis is a test.";
      render(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />,
      );

      // Verify the editor container exists
      await vi.waitFor(() => {
        const editorContainer = document.querySelector(".markdown-code-view");
        expect(editorContainer).toBeInTheDocument();

        // Verify the CM6 editor with content exists
        const editor = document.querySelector(".markdown-code-input .cm-editor");
        expect(editor).toBeInTheDocument();
        const cmContent = document.querySelector(".markdown-code-input .cm-content");
        expect(cmContent?.textContent).toContain("# Test Content");
        expect(cmContent?.textContent).toContain("This is a test.");
      });
    });

    it("maintains content after component re-renders in code view", async () => {
      const content = "# Persistent Content\n\nThis should remain visible.";
      const { rerender } = render(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />,
      );

      // Verify initial content
      await vi.waitFor(() => {
        const cmContent = document.querySelector(".markdown-code-input .cm-content");
        expect(cmContent?.textContent).toContain("# Persistent Content");
        expect(cmContent?.textContent).toContain("This should remain visible.");
      });

      // Force a re-render with same props
      rerender(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />,
      );

      // Verify content is still present after re-render
      await vi.waitFor(() => {
        const editor = document.querySelector(".markdown-code-input .cm-editor");
        expect(editor).toBeInTheDocument();
        const cmContent = document.querySelector(".markdown-code-input .cm-content");
        expect(cmContent?.textContent).toContain("# Persistent Content");
      });
    });

    it("does not fire onChange on initial mount with empty content in code view", async () => {
      const onChange = vi.fn();

      render(
        <MarkdownEditor
          initialContent=""
          viewMode="code"
          onChange={onChange}
        />,
      );

      // Wait for editor to initialize
      await vi.waitFor(() => {
        const editor = document.querySelector(".markdown-code-input .cm-editor");
        expect(editor).toBeInTheDocument();
      });

      // No spurious onChange on initial render
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("Rendered View", () => {
    it("renders the editor with Milkdown", async () => {
      render(
        <MarkdownEditor
          initialContent="# Hello World"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      // Milkdown creates asynchronously
      await vi.waitFor(() => {
        const editor = document.querySelector(".milkdown-editor .ProseMirror");
        expect(editor).toBeInTheDocument();
      });
    });

    it("converts markdown to rendered format", async () => {
      render(
        <MarkdownEditor
          initialContent="# Hello World"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      // Wait for the editor to initialize and render the heading
      await vi.waitFor(() => {
        const heading = document.querySelector(".milkdown-editor h1");
        expect(heading).toBeInTheDocument();
        expect(heading?.textContent).toBe("Hello World");
      });
    });

    it("converts bold markdown to rendered format", async () => {
      render(
        <MarkdownEditor
          initialContent="This is **bold** text"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const bold = document.querySelector(".milkdown-editor strong");
        expect(bold).toBeInTheDocument();
        expect(bold?.textContent).toBe("bold");
      });
    });

    it("converts italic markdown to rendered format", async () => {
      render(
        <MarkdownEditor
          initialContent="This is *italic* text"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const italic = document.querySelector(".milkdown-editor em");
        expect(italic).toBeInTheDocument();
        expect(italic?.textContent).toBe("italic");
      });
    });

    it("converts list markdown to rendered format", async () => {
      render(
        <MarkdownEditor
          initialContent="- Item 1\n- Item 2\n- Item 3"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const list = document.querySelector(".milkdown-editor ul");
        expect(list).toBeInTheDocument();
        const items = document.querySelectorAll(".milkdown-editor li");
        expect(items.length).toBeGreaterThan(0);
      });
    });

    it("editor is focusable for keyboard interaction", async () => {
      render(
        <MarkdownEditor
          initialContent="- Test item"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const list = document.querySelector(".milkdown-editor ul");
        expect(list).toBeInTheDocument();
      });

      // Verify the ProseMirror editor is available for interaction
      const editor = document.querySelector(".milkdown-editor .ProseMirror");
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveAttribute("contenteditable", "true");
    });
  });

  describe("View Mode Switching", () => {
    it("preserves content when switching from code to rendered", async () => {
      const content = "# Test Heading";
      const { rerender } = render(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />,
      );

      // Switch to rendered view
      rerender(
        <MarkdownEditor
          initialContent={content}
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const heading = document.querySelector(".milkdown-editor h1");
        expect(heading).toBeInTheDocument();
        expect(heading?.textContent).toBe("Test Heading");
      });
    });

    it("preserves content when switching from rendered to code", async () => {
      const content = "# Test Heading";
      const { rerender } = render(
        <MarkdownEditor
          initialContent={content}
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      // Wait for initial render
      await vi.waitFor(() => {
        const heading = document.querySelector(".milkdown-editor h1");
        expect(heading).toBeInTheDocument();
      });

      // Switch to code view
      rerender(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const cmContent = document.querySelector(".markdown-code-input .cm-content");
        expect(cmContent?.textContent).toContain("# Test Heading");
      });
    });

    it("syncs content when switching between views", async () => {
      const initialContent = "# Initial Heading";
      let currentContent = initialContent;
      const onChange = vi.fn((newContent: string) => {
        currentContent = newContent;
      });

      // Start in rendered view
      const { rerender } = render(
        <MarkdownEditor
          initialContent={currentContent}
          viewMode="rendered"
          onChange={onChange}
        />,
      );

      // Wait for initial render
      await vi.waitFor(() => {
        const heading = document.querySelector(".milkdown-editor h1");
        expect(heading).toBeInTheDocument();
        expect(heading?.textContent).toBe("Initial Heading");
      });

      // Simulate content update
      const updatedContent = "# Initial Heading\n\nAdded in rendered view.";
      currentContent = updatedContent;

      // Switch to code view with updated content
      rerender(
        <MarkdownEditor
          initialContent={currentContent}
          viewMode="code"
          onChange={onChange}
        />,
      );

      // Verify content is visible in code view
      await vi.waitFor(() => {
        const cmContent = document.querySelector(".markdown-code-input .cm-content");
        expect(cmContent).toBeInTheDocument();
        expect(cmContent?.textContent).toContain("# Initial Heading");
        expect(cmContent?.textContent).toContain("Added in rendered view.");
      });

      // Update content for code view
      const codeViewContent =
        "# Initial Heading\n\nAdded in rendered view.\n\n**Added in code view.**";
      currentContent = codeViewContent;

      // Switch back to rendered view
      rerender(
        <MarkdownEditor
          initialContent={currentContent}
          viewMode="rendered"
          onChange={onChange}
        />,
      );

      // Verify new content is visible in rendered view
      await vi.waitFor(() => {
        const heading = document.querySelector(".milkdown-editor h1");
        expect(heading).toBeInTheDocument();
        expect(heading?.textContent).toBe("Initial Heading");

        // Check for the bold text added in code view
        const bold = document.querySelector(".milkdown-editor strong");
        expect(bold).toBeInTheDocument();
        expect(bold?.textContent).toBe("Added in code view.");
      });
    });
  });
});
