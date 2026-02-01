import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import KeyboardHints from "./KeyboardHints";

describe("KeyboardHints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is initially hidden", () => {
    const { container } = render(<KeyboardHints />);
    expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();
  });

  it("shows hints when Cmd/Ctrl is pressed", async () => {
    const user = userEvent.setup();
    const { container } = render(<KeyboardHints />);

    // Press Cmd key
    await user.keyboard("{Meta>}");

    // Hints should be visible
    expect(container.querySelector(".keyboard-hints")).toBeInTheDocument();
  });

  it("hides hints when Cmd/Ctrl is released", async () => {
    const user = userEvent.setup();
    const { container } = render(<KeyboardHints />);

    // Press and hold Cmd
    await user.keyboard("{Meta>}");
    expect(container.querySelector(".keyboard-hints")).toBeInTheDocument();

    // Release Cmd
    await user.keyboard("{/Meta}");

    // Hints should be hidden
    expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();
  });

  it("displays correct shortcuts", async () => {
    const user = userEvent.setup();
    render(<KeyboardHints />);

    // Press Cmd to show hints
    await user.keyboard("{Meta>}");

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

    const user = userEvent.setup();
    const { container } = render(<KeyboardHints />);

    await user.keyboard("{Meta>}");

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

    const user = userEvent.setup();
    const { container } = render(<KeyboardHints />);

    await user.keyboard("{Control>}");

    // Should show "Ctrl" text
    const hints = container.querySelector(".keyboard-hints");
    expect(hints?.textContent).toContain("Ctrl");
  });

  it("hides hints when window loses focus", async () => {
    const user = userEvent.setup();
    const { container } = render(<KeyboardHints />);

    // Press Cmd to show hints
    await user.keyboard("{Meta>}");
    expect(container.querySelector(".keyboard-hints")).toBeInTheDocument();

    // Simulate window blur
    window.dispatchEvent(new Event("blur"));

    // Hints should be hidden after state update
    await waitFor(() => {
      expect(container.querySelector(".keyboard-hints")).not.toBeInTheDocument();
    });
  });
});
