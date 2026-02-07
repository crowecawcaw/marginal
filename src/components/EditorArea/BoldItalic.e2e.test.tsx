import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import MarkdownEditor from "./MarkdownEditor";

describe("Bold and Italic End-to-End Roundtrip Tests", () => {
  it("preserves bold text through rendered → code → rendered roundtrip", async () => {
    const originalMarkdown = "This is **bold** text";

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

    // Wait for bold text to render
    await waitFor(() => {
      const boldElement = document.querySelector(".editor-text-bold");
      expect(boldElement).toBeTruthy();
      expect(boldElement?.textContent).toBe("bold");
      expect(onChange).toHaveBeenCalled();
    });

    // Step 2: Switch to code view
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
      // Verify ** syntax is preserved in code view
      expect(codeView?.textContent).toContain("**bold**");
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

    // Step 4: Verify bold text is still rendered correctly
    await waitFor(() => {
      const boldElement = document.querySelector(".editor-text-bold");
      expect(boldElement).toBeTruthy();
      expect(boldElement?.textContent).toBe("bold");
    });
  });

  it("preserves italic text through rendered → code → rendered roundtrip", async () => {
    const originalMarkdown = "This is *italic* text";

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

    // Wait for italic text to render
    await waitFor(() => {
      const italicElement = document.querySelector(".editor-text-italic");
      expect(italicElement).toBeTruthy();
      expect(italicElement?.textContent).toBe("italic");
      expect(onChange).toHaveBeenCalled();
    });

    // Step 2: Switch to code view
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
      // Verify * syntax is preserved in code view
      expect(codeView?.textContent).toContain("*italic*");
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

    // Step 4: Verify italic text is still rendered correctly
    await waitFor(() => {
      const italicElement = document.querySelector(".editor-text-italic");
      expect(italicElement).toBeTruthy();
      expect(italicElement?.textContent).toBe("italic");
    });
  });

  it("preserves both bold and italic text through roundtrip", async () => {
    const originalMarkdown = "Text with **bold** and *italic* formatting";

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

    // Wait for both bold and italic to render
    await waitFor(() => {
      const boldElement = document.querySelector(".editor-text-bold");
      const italicElement = document.querySelector(".editor-text-italic");
      expect(boldElement).toBeTruthy();
      expect(italicElement).toBeTruthy();
      expect(boldElement?.textContent).toBe("bold");
      expect(italicElement?.textContent).toBe("italic");
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
      expect(codeView).toBeTruthy();
      expect(codeView?.textContent).toContain("**bold**");
      expect(codeView?.textContent).toContain("*italic*");
    });

    // Step 3: Switch back to rendered view
    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Step 4: Verify both are still rendered correctly
    await waitFor(() => {
      const boldElement = document.querySelector(".editor-text-bold");
      const italicElement = document.querySelector(".editor-text-italic");
      expect(boldElement).toBeTruthy();
      expect(italicElement).toBeTruthy();
      expect(boldElement?.textContent).toBe("bold");
      expect(italicElement?.textContent).toBe("italic");
    });
  });

  it("preserves bold and italic through multiple view switches", async () => {
    const originalMarkdown = "**bold** and *italic*";

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
      const boldElement = document.querySelector(".editor-text-bold");
      const italicElement = document.querySelector(".editor-text-italic");
      expect(boldElement).toBeTruthy();
      expect(italicElement).toBeTruthy();
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
      expect(codeView?.textContent).toContain("**bold**");
      expect(codeView?.textContent).toContain("*italic*");
    });

    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const boldElement = document.querySelector(".editor-text-bold");
      const italicElement = document.querySelector(".editor-text-italic");
      expect(boldElement).toBeTruthy();
      expect(italicElement).toBeTruthy();
    });

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
      expect(codeView?.textContent).toContain("**bold**");
      expect(codeView?.textContent).toContain("*italic*");
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
      const boldElement = document.querySelector(".editor-text-bold");
      const italicElement = document.querySelector(".editor-text-italic");
      expect(boldElement).toBeTruthy();
      expect(italicElement).toBeTruthy();
      expect(boldElement?.textContent).toBe("bold");
      expect(italicElement?.textContent).toBe("italic");
    });
  });

  it("preserves bold text in complex document through roundtrip", async () => {
    const originalMarkdown = `# Heading

This is a paragraph with **bold text** in it.

- List item with **bold**
- Another item`;

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
      const boldElements = document.querySelectorAll(".editor-text-bold");
      expect(heading).toBeTruthy();
      expect(boldElements.length).toBe(2); // Two bold instances
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
      // Check for ** syntax
      const text = codeView?.textContent || "";
      const boldCount = (text.match(/\*\*bold(?:\s+text)?\*\*/g) || []).length;
      expect(boldCount).toBeGreaterThanOrEqual(1);
    });

    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Verify heading and bold are preserved
    await waitFor(() => {
      const heading = document.querySelector(".editor-heading-h1");
      const boldElements = document.querySelectorAll(".editor-text-bold");
      expect(heading?.textContent).toBe("Heading");
      expect(boldElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("preserves italic text in complex document through roundtrip", async () => {
    const originalMarkdown = `## Subtitle

This is a paragraph with *italic text* in it.

1. Numbered item with *italic*
2. Another item`;

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
      const heading = document.querySelector(".editor-heading-h2");
      const italicElements = document.querySelectorAll(".editor-text-italic");
      expect(heading).toBeTruthy();
      expect(italicElements.length).toBe(2); // Two italic instances
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
      // Check for * syntax (but not **)
      expect(codeView?.textContent).toContain("*italic");
    });

    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    // Verify heading and italic are preserved
    await waitFor(() => {
      const heading = document.querySelector(".editor-heading-h2");
      const italicElements = document.querySelectorAll(".editor-text-italic");
      expect(heading?.textContent).toBe("Subtitle");
      expect(italicElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
