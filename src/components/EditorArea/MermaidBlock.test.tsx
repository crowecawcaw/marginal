import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import MermaidBlock from "./MermaidBlock";

// Mock mermaid
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

import mermaid from "mermaid";

const mockedRender = vi.mocked(mermaid.render);

describe("MermaidBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRender.mockResolvedValue({ svg: '<svg class="mermaid-svg">diagram</svg>', diagramType: "flowchart" });
  });

  it("renders a container with proper class names", () => {
    render(<MermaidBlock code="graph TD; A-->B;" />);

    const block = document.querySelector(".mermaid-block");
    expect(block).toBeTruthy();

    const container = document.querySelector(".mermaid-container");
    expect(container).toBeTruthy();
  });

  it("calls mermaid.render with the provided code", async () => {
    render(<MermaidBlock code="graph TD; A-->B;" />);

    await waitFor(() => {
      expect(mockedRender).toHaveBeenCalledWith(
        expect.any(String),
        "graph TD; A-->B;"
      );
    });
  });

  it("displays rendered SVG on successful render", async () => {
    mockedRender.mockResolvedValue({
      svg: '<svg class="test-diagram">rendered</svg>',
      diagramType: "flowchart",
    });

    render(<MermaidBlock code="graph TD; A-->B;" />);

    await waitFor(() => {
      const container = document.querySelector(".mermaid-container");
      expect(container?.innerHTML).toContain('<svg class="test-diagram">rendered</svg>');
    });
  });

  it("shows error message when mermaid.render fails", async () => {
    mockedRender.mockRejectedValue(new Error("Invalid syntax"));

    render(<MermaidBlock code="invalid diagram code" />);

    await waitFor(() => {
      const error = document.querySelector(".mermaid-error");
      expect(error).toBeTruthy();
      expect(error?.textContent).toContain("Error rendering diagram");
      expect(error?.textContent).toContain("Invalid syntax");
    });
  });

  it("shows 'Unknown error' for non-Error exceptions", async () => {
    mockedRender.mockRejectedValue("something went wrong");

    render(<MermaidBlock code="bad code" />);

    await waitFor(() => {
      const error = document.querySelector(".mermaid-error");
      expect(error).toBeTruthy();
      expect(error?.textContent).toContain("Unknown error");
    });
  });

  it("returns null when language is not 'mermaid'", () => {
    const { container } = render(
      <MermaidBlock code="graph TD; A-->B;" language="javascript" />
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders normally when language is 'mermaid'", async () => {
    render(<MermaidBlock code="graph TD; A-->B;" language="mermaid" />);

    await waitFor(() => {
      const block = document.querySelector(".mermaid-block");
      expect(block).toBeTruthy();
    });
  });

  it("renders normally when language is not specified", async () => {
    render(<MermaidBlock code="graph TD; A-->B;" />);

    await waitFor(() => {
      const block = document.querySelector(".mermaid-block");
      expect(block).toBeTruthy();
    });
  });

  it("does not call mermaid.render when code is empty", async () => {
    render(<MermaidBlock code="" />);

    // Give it time to potentially call render
    await new Promise((r) => setTimeout(r, 50));
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it("does not call mermaid.render when code is only whitespace", async () => {
    render(<MermaidBlock code="   " />);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockedRender).not.toHaveBeenCalled();
  });

  it("re-renders when code prop changes", async () => {
    mockedRender
      .mockResolvedValueOnce({ svg: "<svg>first</svg>", diagramType: "flowchart" })
      .mockResolvedValueOnce({ svg: "<svg>second</svg>", diagramType: "flowchart" });

    const { rerender } = render(<MermaidBlock code="graph TD; A-->B;" />);

    await waitFor(() => {
      const container = document.querySelector(".mermaid-container");
      expect(container?.innerHTML).toContain("first");
    });

    rerender(<MermaidBlock code="graph LR; X-->Y;" />);

    await waitFor(() => {
      const container = document.querySelector(".mermaid-container");
      expect(container?.innerHTML).toContain("second");
    });
  });
});
