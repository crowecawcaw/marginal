import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Queue of deferred resolvers for controlling async timing
let listenResolvers: Array<() => void> = [];
let mockUnlistens: Array<ReturnType<typeof vi.fn>> = [];

let setupResolvers: Array<() => void> = [];
let setupMockUnlistens: Array<ReturnType<typeof vi.fn>> = [];

vi.mock("./eventAdapter", () => ({
  listen: vi.fn((_event: string, _callback: unknown) => {
    const unlisten = vi.fn();
    mockUnlistens.push(unlisten);
    return new Promise<() => void>((resolve) => {
      listenResolvers.push(() => resolve(unlisten));
    });
  }),
  setupEventListeners: vi.fn(
    (_events: Array<{ event: string; callback: unknown }>) => {
      const unlisten = vi.fn();
      setupMockUnlistens.push(unlisten);
      return new Promise<() => void>((resolve) => {
        setupResolvers.push(() => resolve(unlisten));
      });
    },
  ),
}));

import { listen, setupEventListeners } from "./eventAdapter";
import { useEventListener, useEventListeners } from "./useEventListener";

describe("useEventListener", () => {
  beforeEach(() => {
    listenResolvers = [];
    mockUnlistens = [];
    setupResolvers = [];
    setupMockUnlistens = [];
    vi.clearAllMocks();
  });

  it("calls listen with the event name and callback", () => {
    const callback = vi.fn();
    renderHook(() => useEventListener("test-event", callback, []));

    expect(listen).toHaveBeenCalledWith("test-event", callback);
  });

  it("cleans up listener on unmount after listen resolves", async () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() =>
      useEventListener("test-event", callback, []),
    );

    // Resolve the listen promise so cleanup is stored
    await act(async () => {
      listenResolvers[0]();
    });

    // Unlisten should not have been called yet
    expect(mockUnlistens[0]).not.toHaveBeenCalled();

    // Unmount triggers cleanup
    unmount();

    expect(mockUnlistens[0]).toHaveBeenCalledTimes(1);
  });

  it("calls unlisten immediately if unmount happens before listen resolves (StrictMode fix)", async () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() =>
      useEventListener("test-event", callback, []),
    );

    expect(listen).toHaveBeenCalledTimes(1);

    // Unmount BEFORE the listen promise resolves (simulates StrictMode cleanup)
    unmount();

    // Now resolve the listen promise — the cancelled flag should trigger immediate unlisten
    await act(async () => {
      listenResolvers[0]();
    });

    expect(mockUnlistens[0]).toHaveBeenCalledTimes(1);
  });

  it("handles StrictMode double-mount without leaking listeners", async () => {
    const callback = vi.fn();

    // First mount
    const { unmount } = renderHook(() =>
      useEventListener("test-event", callback, []),
    );

    expect(listen).toHaveBeenCalledTimes(1);

    // StrictMode unmounts immediately
    unmount();

    // Resolve first listen — should be cleaned up because cancelled=true
    await act(async () => {
      listenResolvers[0]();
    });
    expect(mockUnlistens[0]).toHaveBeenCalledTimes(1);

    // Second mount (StrictMode re-mount)
    const { unmount: unmount2 } = renderHook(() =>
      useEventListener("test-event", callback, []),
    );

    expect(listen).toHaveBeenCalledTimes(2);

    // Resolve second listen
    await act(async () => {
      listenResolvers[1]();
    });

    // Should NOT be cleaned up yet (still mounted)
    expect(mockUnlistens[1]).not.toHaveBeenCalled();

    // Final unmount
    unmount2();
    expect(mockUnlistens[1]).toHaveBeenCalledTimes(1);
  });

  it("re-registers listener when deps change", async () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ dep }) => useEventListener("test-event", callback, [dep]),
      { initialProps: { dep: 1 } },
    );

    // Resolve first listen
    await act(async () => {
      listenResolvers[0]();
    });

    expect(listen).toHaveBeenCalledTimes(1);

    // Change dependency — triggers effect cleanup and re-run
    rerender({ dep: 2 });

    // First listener should be cleaned up
    expect(mockUnlistens[0]).toHaveBeenCalledTimes(1);

    // Second listen should be called
    expect(listen).toHaveBeenCalledTimes(2);

    // Resolve second listen
    await act(async () => {
      listenResolvers[1]();
    });

    expect(mockUnlistens[1]).not.toHaveBeenCalled();
  });
});

describe("useEventListeners", () => {
  beforeEach(() => {
    listenResolvers = [];
    mockUnlistens = [];
    setupResolvers = [];
    setupMockUnlistens = [];
    vi.clearAllMocks();
  });

  it("calls setupEventListeners with the events array", () => {
    const events = [
      { event: "event-1", callback: vi.fn() },
      { event: "event-2", callback: vi.fn() },
    ];
    renderHook(() => useEventListeners(events, []));

    expect(setupEventListeners).toHaveBeenCalledWith(events);
  });

  it("cleans up on unmount after setup resolves", async () => {
    const events = [{ event: "event-1", callback: vi.fn() }];
    const { unmount } = renderHook(() => useEventListeners(events, []));

    await act(async () => {
      setupResolvers[0]();
    });

    expect(setupMockUnlistens[0]).not.toHaveBeenCalled();

    unmount();

    expect(setupMockUnlistens[0]).toHaveBeenCalledTimes(1);
  });

  it("calls unlisten immediately if unmount happens before setup resolves (StrictMode fix)", async () => {
    const events = [{ event: "event-1", callback: vi.fn() }];
    const { unmount } = renderHook(() => useEventListeners(events, []));

    expect(setupEventListeners).toHaveBeenCalledTimes(1);

    // Unmount before promise resolves
    unmount();

    // Resolve — should trigger immediate cleanup
    await act(async () => {
      setupResolvers[0]();
    });

    expect(setupMockUnlistens[0]).toHaveBeenCalledTimes(1);
  });

  it("handles StrictMode double-mount without leaking listeners", async () => {
    const events = [{ event: "event-1", callback: vi.fn() }];

    // First mount
    const { unmount } = renderHook(() => useEventListeners(events, []));
    unmount();

    await act(async () => {
      setupResolvers[0]();
    });
    expect(setupMockUnlistens[0]).toHaveBeenCalledTimes(1);

    // Second mount
    const { unmount: unmount2 } = renderHook(() =>
      useEventListeners(events, []),
    );

    await act(async () => {
      setupResolvers[1]();
    });
    expect(setupMockUnlistens[1]).not.toHaveBeenCalled();

    unmount2();
    expect(setupMockUnlistens[1]).toHaveBeenCalledTimes(1);
  });
});
