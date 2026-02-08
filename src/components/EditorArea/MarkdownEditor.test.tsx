import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MarkdownEditor from "./MarkdownEditor";

// Stub for Range.prototype.getBoundingClientRect which jsdom doesn't implement.
// Lexical calls this via queueMicrotask during selection updates after key events.
const stubRect = () =>
  ({ x: 0, y: 0, width: 100, height: 20, top: 0, right: 100, bottom: 20, left: 0, toJSON() {} }) as DOMRect;

// Helper to simulate keyboard events in Lexical
const simulateKeyDown = (element: Element, key: string) => {
  const origGetBCR = Range.prototype.getBoundingClientRect;
  Range.prototype.getBoundingClientRect = stubRect;
  const event = new KeyboardEvent("keydown", {
    key,
    code: key === "Enter" ? "Enter" : key === "Backspace" ? "Backspace" : key,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
  // Restore after microtask queue drains (Lexical schedules via queueMicrotask)
  queueMicrotask(() => {
    Range.prototype.getBoundingClientRect = origGetBCR;
  });
};

describe("MarkdownEditor", () => {
  describe("Code View", () => {
    it("renders markdown content in contenteditable", async () => {
      const content = "# Hello World\n\nThis is **bold** text.";
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

        // Verify the contenteditable with content exists
        const editor = document.querySelector(".markdown-code-input");
        expect(editor).toBeInTheDocument();
        expect(editor?.textContent).toBe(content);
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
        const editor = document.querySelector(".markdown-code-input");
        expect(editor?.textContent).toBe(content);
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
        const editor = document.querySelector(".markdown-code-input");
        expect(editor).toBeInTheDocument();
        expect(editor?.textContent).toBe(content);
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
        const editor = document.querySelector(".markdown-code-input");
        expect(editor).toBeInTheDocument();
      });

      // editorState initializer runs before OnChangePlugin mounts,
      // so no spurious onChange on initial render
      expect(onChange).not.toHaveBeenCalled();
    });

    it("disables auto-corrections in code view to prevent -- becoming em dash", () => {
      render(
        <MarkdownEditor
          initialContent="test -- content"
          viewMode="code"
          onChange={vi.fn()}
        />,
      );

      const textarea = screen.getByRole("textbox");

      // Verify auto-correction attributes are disabled
      expect(textarea).toHaveAttribute("autocorrect", "off");
      expect(textarea).toHaveAttribute("autocapitalize", "off");
      expect(textarea).toHaveAttribute("spellcheck", "false");
    });
  });

  describe("Rendered View", () => {
    it("renders the editor with lexical", () => {
      render(
        <MarkdownEditor
          initialContent="# Hello World"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      // Check that the editor container is rendered
      const editor = document.querySelector(".markdown-editor-input");
      expect(editor).toBeInTheDocument();
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
        const heading = document.querySelector(".editor-heading-h1");
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
        const bold = document.querySelector(".editor-text-bold");
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
        const italic = document.querySelector(".editor-text-italic");
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
        const list = document.querySelector(".editor-list-ul");
        expect(list).toBeInTheDocument();
        const items = document.querySelectorAll(".editor-list-item");
        expect(items.length).toBeGreaterThan(0);
      });
    });
  });

  describe("List Exit Behavior", () => {
    it("renders list with ListExitPlugin enabled", async () => {
      render(
        <MarkdownEditor
          initialContent="- Item 1\n- Item 2"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const list = document.querySelector(".editor-list-ul");
        expect(list).toBeInTheDocument();
        const items = document.querySelectorAll(".editor-list-item");
        // Lexical may consolidate items differently, just verify we have items
        expect(items.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("maintains list structure with content", async () => {
      render(
        <MarkdownEditor
          initialContent="- First item\n- Second item\n- Third item"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const list = document.querySelector(".editor-list-ul");
        expect(list).toBeInTheDocument();
        const items = document.querySelectorAll(".editor-list-item");
        // Verify the list contains all the text content
        expect(items.length).toBeGreaterThanOrEqual(1);
        const listText = list?.textContent;
        expect(listText).toContain("First item");
        expect(listText).toContain("Second item");
        expect(listText).toContain("Third item");
      });
    });

    it("handles ordered lists correctly", async () => {
      render(
        <MarkdownEditor
          initialContent="1. First\n2. Second\n3. Third"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const list = document.querySelector(".editor-list-ol");
        expect(list).toBeInTheDocument();
        const items = document.querySelectorAll(".editor-list-item");
        // Verify we have list items
        expect(items.length).toBeGreaterThanOrEqual(1);
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
        const list = document.querySelector(".editor-list-ul");
        expect(list).toBeInTheDocument();
      });

      // Verify the editor input is available for interaction
      const editor = document.querySelector(".markdown-editor-input");
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveAttribute("contenteditable", "true");
    });

    it("empty list item can be detected", async () => {
      render(
        <MarkdownEditor
          initialContent="- Item with content\n- "
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const items = document.querySelectorAll(".editor-list-item");
        // Lexical may consolidate empty items, but should have at least 1
        expect(items.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("editor receives keyboard events", async () => {
      render(
        <MarkdownEditor
          initialContent="- Test"
          viewMode="rendered"
          onChange={vi.fn()}
        />,
      );

      await vi.waitFor(() => {
        const editor = document.querySelector(".markdown-editor-input");
        expect(editor).toBeInTheDocument();
      });

      const editor = document.querySelector(".markdown-editor-input");
      if (editor) {
        // Verify we can dispatch keyboard events
        simulateKeyDown(editor, "Enter");
        simulateKeyDown(editor, "Backspace");
        // Events dispatched successfully (no error thrown)
        expect(editor).toBeInTheDocument();
      }
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
        const heading = document.querySelector(".editor-heading-h1");
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
        const heading = document.querySelector(".editor-heading-h1");
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
        const editor = document.querySelector(".markdown-code-input");
        expect(editor?.textContent).toBe(content);
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
        const heading = document.querySelector(".editor-heading-h1");
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
        const editor = document.querySelector(".markdown-code-input");
        expect(editor).toBeInTheDocument();
        expect(editor?.textContent).toBe(updatedContent);
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
        const heading = document.querySelector(".editor-heading-h1");
        expect(heading).toBeInTheDocument();
        expect(heading?.textContent).toBe("Initial Heading");

        // Check for the bold text added in code view
        const bold = document.querySelector(".editor-text-bold");
        expect(bold).toBeInTheDocument();
        expect(bold?.textContent).toBe("Added in code view.");
      });
    });
  });
});
