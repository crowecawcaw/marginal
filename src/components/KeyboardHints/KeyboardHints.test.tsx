import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
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

  it("shows hints after 1 second when Cmd/Ctrl is pressed", async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = render(<KeyboardHints />);

    // Press Cmd key
    await user.keyboard("{Meta>}");

    // Hints should NOT be visible immediately
    expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();

    // Advance time by 1 second
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Hints should now be visible
    expect(container.querySelector(".keyboard-hints")).toBeInTheDocument();
  });

  it("hides hints when Cmd/Ctrl is released", async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = render(<KeyboardHints />);

    // Press and hold Cmd
    await user.keyboard("{Meta>}");
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.querySelector(".keyboard-hints")).toBeInTheDocument();

    // Release Cmd
    await user.keyboard("{/Meta}");

    // Hints should be hidden
    expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();
  });

  it("displays correct shortcuts", async () => {
    const user = userEvent.setup({ delay: null });
    render(<KeyboardHints />);

    // Press Cmd to show hints
    await user.keyboard("{Meta>}");
    await act(async () => {
      vi.advanceTimersByTime(1000);
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

    const user = userEvent.setup({ delay: null });
    const { container } = render(<KeyboardHints />);

    await user.keyboard("{Meta>}");
    await act(async () => {
      vi.advanceTimersByTime(1000);
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

    const user = userEvent.setup({ delay: null });
    const { container } = render(<KeyboardHints />);

    await user.keyboard("{Control>}");
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Should show "Ctrl" text
    const hints = container.querySelector(".keyboard-hints");
    expect(hints?.textContent).toContain("Ctrl");
  });

  it("hides hints when window loses focus", async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = render(<KeyboardHints />);

    // Press Cmd to show hints
    await user.keyboard("{Meta>}");
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.querySelector(".keyboard-hints")).toBeInTheDocument();

    // Simulate window blur
    window.dispatchEvent(new Event("blur"));

    // Hints should be hidden after state update
    await waitFor(() => {
      expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();
    });
  });

  it("cancels timer if key is released before 1 second", async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = render(<KeyboardHints />);

    // Press Cmd
    await user.keyboard("{Meta>}");

    // Wait 500ms (less than 1 second)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Release Cmd before timer completes
    await user.keyboard("{/Meta}");

    // Advance remaining time
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Hints should never have appeared
    expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();
  });
});
