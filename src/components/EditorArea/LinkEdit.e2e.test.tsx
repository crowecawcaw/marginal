import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import MarkdownEditor from "./MarkdownEditor";

const mockOpenUrl = vi.fn();
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: (...args: unknown[]) => mockOpenUrl(...args),
}));

describe("Link Editing E2E Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders links with correct href in rendered view", async () => {
    const markdown = "Click [here](https://example.com) for info";
    const onChange = vi.fn();

    render(
      <MarkdownEditor
        initialContent={markdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const link = document.querySelector("a.editor-link") as HTMLAnchorElement;
      expect(link).toBeTruthy();
      expect(link?.getAttribute("href")).toBe("https://example.com");
      expect(link?.textContent).toBe("here");
    });
  });

  it("opens link via Tauri openUrl on Cmd+mousedown", async () => {
    const markdown = "Visit [Google](https://google.com) today";
    const onChange = vi.fn();

    render(
      <MarkdownEditor
        initialContent={markdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const link = document.querySelector("a.editor-link");
      expect(link).toBeTruthy();
    });

    const link = document.querySelector("a.editor-link") as HTMLElement;
    const mousedownEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });
    link.dispatchEvent(mousedownEvent);

    expect(mockOpenUrl).toHaveBeenCalledWith("https://google.com");
  });

  it("opens link via Tauri openUrl on Ctrl+mousedown", async () => {
    const markdown = "Visit [Google](https://google.com) today";
    const onChange = vi.fn();

    render(
      <MarkdownEditor
        initialContent={markdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const link = document.querySelector("a.editor-link");
      expect(link).toBeTruthy();
    });

    const link = document.querySelector("a.editor-link") as HTMLElement;
    const mousedownEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    link.dispatchEvent(mousedownEvent);

    expect(mockOpenUrl).toHaveBeenCalledWith("https://google.com");
  });

  it("does not open link on regular mousedown (no modifier key)", async () => {
    const markdown = "Visit [Google](https://google.com) today";
    const onChange = vi.fn();

    render(
      <MarkdownEditor
        initialContent={markdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const link = document.querySelector("a.editor-link");
      expect(link).toBeTruthy();
    });

    const link = document.querySelector("a.editor-link") as HTMLElement;
    const mousedownEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    link.dispatchEvent(mousedownEvent);

    expect(mockOpenUrl).not.toHaveBeenCalled();
  });

  it("shows link edit tooltip on regular click", async () => {
    const markdown = "Click [here](https://example.com) for info";
    const onChange = vi.fn();

    render(
      <MarkdownEditor
        initialContent={markdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const link = document.querySelector("a.editor-link");
      expect(link).toBeTruthy();
    });

    const link = document.querySelector("a.editor-link") as HTMLElement;
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    link.dispatchEvent(clickEvent);

    await waitFor(() => {
      const tooltip = document.querySelector(".link-edit-tooltip");
      expect(tooltip).toBeTruthy();
    });

    // Verify the URL input contains the link URL
    await waitFor(() => {
      const input = document.querySelector(
        ".link-edit-tooltip-input"
      ) as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input?.value).toBe("https://example.com");
    });
  });

  it("opens link from tooltip open button via Tauri openUrl", async () => {
    const markdown = "Click [here](https://example.com) for info";
    const onChange = vi.fn();

    render(
      <MarkdownEditor
        initialContent={markdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const link = document.querySelector("a.editor-link");
      expect(link).toBeTruthy();
    });

    // Open the tooltip
    const link = document.querySelector("a.editor-link") as HTMLElement;
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    link.dispatchEvent(clickEvent);

    await waitFor(() => {
      const tooltip = document.querySelector(".link-edit-tooltip");
      expect(tooltip).toBeTruthy();
    });

    // Click the open link button
    const openButton = document.querySelector(
      ".link-edit-tooltip-btn--open"
    ) as HTMLElement;
    expect(openButton).toBeTruthy();
    openButton.click();

    expect(mockOpenUrl).toHaveBeenCalledWith("https://example.com");
  });

  it("preserves links through rendered → code → rendered roundtrip", async () => {
    const originalMarkdown = "Click [here](https://example.com) for info";

    let capturedContent = originalMarkdown;
    const onChange = vi.fn((content: string) => {
      capturedContent = content;
    });

    const { rerender } = render(
      <MarkdownEditor
        initialContent={originalMarkdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const link = document.querySelector("a.editor-link");
      expect(link).toBeTruthy();
      expect(link?.textContent).toBe("here");
      expect(onChange).toHaveBeenCalled();
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
      expect(codeView?.textContent).toContain("[here](https://example.com)");
    });

    // Switch back to rendered view
    rerender(
      <MarkdownEditor
        initialContent={capturedContent}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const link = document.querySelector("a.editor-link");
      expect(link).toBeTruthy();
      expect(link?.textContent).toBe("here");
      expect(link?.getAttribute("href")).toBe("https://example.com");
    });
  });

  it("does not open link when Cmd+clicking non-link text", async () => {
    const markdown = "Plain text and [a link](https://example.com)";
    const onChange = vi.fn();

    render(
      <MarkdownEditor
        initialContent={markdown}
        viewMode="rendered"
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const paragraph = document.querySelector(".editor-paragraph");
      expect(paragraph).toBeTruthy();
    });

    // Cmd+click on the paragraph text (not the link)
    const paragraph = document.querySelector(".editor-paragraph") as HTMLElement;
    const mousedownEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });
    paragraph.dispatchEvent(mousedownEvent);

    expect(mockOpenUrl).not.toHaveBeenCalled();
  });
});
