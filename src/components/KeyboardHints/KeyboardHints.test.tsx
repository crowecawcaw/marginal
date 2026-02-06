import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import KeyboardHints from "./KeyboardHints";

describe("KeyboardHints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is initially hidden", () => {
    const { container } = render(<KeyboardHints />);
    expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();
  });

  it("shows hints after 0.8 seconds when Cmd/Ctrl is pressed", async () => {
    const { container } = render(<KeyboardHints />);

    // Press Cmd key
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, repeat: false }));
    });

    // Hints should NOT be visible immediately
    expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();

    // Advance time by 0.8 seconds
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Hints should now be visible
    expect(container.querySelector(".keyboard-hints")).toBeInTheDocument();
  });

  it("hides hints when Cmd/Ctrl is released", async () => {
    const { container } = render(<KeyboardHints />);

    // Press and hold Cmd
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, repeat: false }));
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(container.querySelector(".keyboard-hints")).toBeInTheDocument();

    // Release Cmd
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta" }));
    });

    // Advance timers for exit animation
    act(() => {
      vi.advanceTimersByTime(240);
    });

    // Hints should be hidden
    expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();
  });

  it("displays correct shortcuts", async () => {
    render(<KeyboardHints />);

    // Press Cmd to show hints
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, repeat: false }));
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Check that key shortcuts are displayed
    expect(screen.getByText("New File")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Find")).toBeInTheDocument();
    expect(screen.getByText("Format")).toBeInTheDocument();
    expect(screen.getByText("Toggle View")).toBeInTheDocument();
  });

  it("shows Cmd symbol on Mac platform", async () => {
    // Mock navigator.platform for Mac
    Object.defineProperty(navigator, "platform", {
      value: "MacIntel",
      configurable: true,
    });

    const { container } = render(<KeyboardHints />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, repeat: false }));
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Should show ⌘ symbol
    const hints = container.querySelector(".keyboard-hints");
    expect(hints?.textContent).toContain("⌘");
  });

  it("shows Ctrl text on Windows platform", async () => {
    // Mock navigator.platform for Windows
    Object.defineProperty(navigator, "platform", {
      value: "Win32",
      configurable: true,
    });

    const { container } = render(<KeyboardHints />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, repeat: false }));
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Should show "Ctrl" text
    const hints = container.querySelector(".keyboard-hints");
    expect(hints?.textContent).toContain("Ctrl");
  });

  it("hides hints when window loses focus", async () => {
    const { container } = render(<KeyboardHints />);

    // Press Cmd to show hints
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, repeat: false }));
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(container.querySelector(".keyboard-hints")).toBeInTheDocument();

    // Simulate window blur
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    // Advance timer for exit animation
    act(() => {
      vi.advanceTimersByTime(240);
    });

    // Hints should be hidden after state update
    expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();
  });

  it("cancels timer if key is released before 0.8 seconds", async () => {
    const { container } = render(<KeyboardHints />);

    // Press Cmd
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, repeat: false }));
    });

    // Wait 400ms (less than 0.8 seconds)
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Release Cmd before timer completes
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta" }));
    });

    // Advance remaining time
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Hints should never have appeared
    expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();
  });
});
