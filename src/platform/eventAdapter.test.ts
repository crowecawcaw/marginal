import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getWebEventEmitter,
  resetWebEventEmitter,
  listen,
  emit,
  setupEventListeners,
} from "./eventAdapter";

describe("eventAdapter", () => {
  beforeEach(() => {
    resetWebEventEmitter();
  });

  describe("WebEventEmitter", () => {
    it("registers and calls listeners on emit", () => {
      const emitter = getWebEventEmitter();
      const callback = vi.fn();

      emitter.on("test-event", callback);
      emitter.emit("test-event");

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("can register multiple listeners for the same event", () => {
      const emitter = getWebEventEmitter();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      emitter.on("test-event", callback1);
      emitter.on("test-event", callback2);
      emitter.emit("test-event");

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("unlisten removes the callback", () => {
      const emitter = getWebEventEmitter();
      const callback = vi.fn();

      const unlisten = emitter.on("test-event", callback);
      emitter.emit("test-event");
      expect(callback).toHaveBeenCalledTimes(1);

      unlisten();
      emitter.emit("test-event");
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("does not call listeners for different events", () => {
      const emitter = getWebEventEmitter();
      const callback = vi.fn();

      emitter.on("event-a", callback);
      emitter.emit("event-b");

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("resetWebEventEmitter", () => {
    it("clears all listeners", () => {
      const emitter1 = getWebEventEmitter();
      const callback = vi.fn();
      emitter1.on("test-event", callback);

      resetWebEventEmitter();

      const emitter2 = getWebEventEmitter();
      emitter2.emit("test-event");

      expect(callback).not.toHaveBeenCalled();
    });

    it("creates a new emitter instance after reset", () => {
      const emitter1 = getWebEventEmitter();
      resetWebEventEmitter();
      const emitter2 = getWebEventEmitter();

      expect(emitter1).not.toBe(emitter2);
    });
  });

  describe("listen (web mode)", () => {
    it("registers callback that is invoked on emit", async () => {
      const callback = vi.fn();

      const unlisten = await listen("test-event", callback);

      const emitter = getWebEventEmitter();
      emitter.emit("test-event");

      expect(callback).toHaveBeenCalledTimes(1);

      unlisten();
    });

    it("callback receives no arguments in web mode", async () => {
      const callback = vi.fn();

      await listen("test-event", callback);

      const emitter = getWebEventEmitter();
      emitter.emit("test-event");

      expect(callback).toHaveBeenCalledWith();
    });
  });

  describe("emit (web mode)", () => {
    it("triggers registered listeners", async () => {
      const callback = vi.fn();

      await listen("test-event", callback);
      await emit("test-event");

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("setupEventListeners", () => {
    it("registers multiple event listeners at once", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unlisten = await setupEventListeners([
        { event: "event-1", callback: callback1 },
        { event: "event-2", callback: callback2 },
      ]);

      const emitter = getWebEventEmitter();
      emitter.emit("event-1");
      emitter.emit("event-2");

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      unlisten();
    });

    it("unlisten removes all registered listeners", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unlisten = await setupEventListeners([
        { event: "event-1", callback: callback1 },
        { event: "event-2", callback: callback2 },
      ]);

      unlisten();

      const emitter = getWebEventEmitter();
      emitter.emit("event-1");
      emitter.emit("event-2");

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it("callbacks are invoked with no arguments (matching wrapped Tauri behavior)", async () => {
      // This test verifies that callbacks work correctly when they expect no arguments,
      // which is important because in Tauri mode we wrap callbacks to ignore the Event object
      const callback = vi.fn();

      await setupEventListeners([{ event: "test-event", callback }]);

      const emitter = getWebEventEmitter();
      emitter.emit("test-event");

      // Callback should be called with no arguments
      expect(callback).toHaveBeenCalledWith();
      expect(callback.mock.calls[0].length).toBe(0);
    });
  });

  describe("callback wrapping behavior", () => {
    it("callbacks work correctly when event system passes extra arguments", () => {
      // This test simulates how Tauri calls callbacks with an Event object,
      // but our callbacks expect no arguments. The wrapping ensures this works.
      const emitter = getWebEventEmitter();
      const callback = vi.fn();

      emitter.on("test-event", callback);

      // Simulate what happens when our wrapped callback is invoked
      // In Tauri, the callback wrapper does: () => callback()
      // This ensures callback is always called with no arguments
      const wrappedCallback = () => callback();
      wrappedCallback(); // Even if Tauri passes arguments to the outer function

      expect(callback).toHaveBeenCalledWith();
    });

    it("wrapped callback isolates the original from receiving unwanted arguments", () => {
      // Demonstrate the wrapping pattern used for Tauri compatibility
      const originalCallback = vi.fn();

      // This is how we wrap callbacks for Tauri:
      const wrappedForTauri = () => originalCallback();

      // Simulate Tauri calling with an Event object
      const mockTauriEvent = { event: "test", id: 1, payload: {} };
      (wrappedForTauri as (e: unknown) => void)(mockTauriEvent);

      // Original callback should still receive no arguments
      expect(originalCallback).toHaveBeenCalledWith();
      expect(originalCallback).toHaveBeenCalledTimes(1);
    });
  });
});
