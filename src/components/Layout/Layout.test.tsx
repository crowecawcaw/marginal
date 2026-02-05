import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUIStore } from "../../stores/uiStore";
import {
  getWebEventEmitter,
  resetWebEventEmitter,
  setupEventListeners,
} from "../../platform/eventAdapter";

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Menu event handling integration", () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset event emitter to avoid listener accumulation between tests
    resetWebEventEmitter();
    // Reset store to default state
    useUIStore.setState({
      viewMode: "code",
      outlineVisible: false,
    });
  });

  describe("menu:toggle-view event pattern", () => {
    it("setupEventListeners registers callbacks that respond to emitted events", async () => {
      const { toggleViewMode } = useUIStore.getState();

      // Set up listener the same way Layout does
      const unlisten = await setupEventListeners([
        { event: "menu:toggle-view", callback: () => toggleViewMode() },
      ]);

      // Initial state
      expect(useUIStore.getState().viewMode).toBe("code");

      // Emit the event (simulating menu click)
      const emitter = getWebEventEmitter();
      emitter.emit("menu:toggle-view");

      // State should be updated
      expect(useUIStore.getState().viewMode).toBe("rendered");

      // Cleanup
      unlisten();
    });

    it("toggles view mode from rendered to code", async () => {
      useUIStore.setState({ viewMode: "rendered" });
      const { toggleViewMode } = useUIStore.getState();

      const unlisten = await setupEventListeners([
        { event: "menu:toggle-view", callback: () => toggleViewMode() },
      ]);

      expect(useUIStore.getState().viewMode).toBe("rendered");

      const emitter = getWebEventEmitter();
      emitter.emit("menu:toggle-view");

      expect(useUIStore.getState().viewMode).toBe("code");

      unlisten();
    });

    it("can toggle view mode multiple times", async () => {
      const { toggleViewMode } = useUIStore.getState();

      const unlisten = await setupEventListeners([
        { event: "menu:toggle-view", callback: () => toggleViewMode() },
      ]);

      const emitter = getWebEventEmitter();

      emitter.emit("menu:toggle-view");
      expect(useUIStore.getState().viewMode).toBe("rendered");

      emitter.emit("menu:toggle-view");
      expect(useUIStore.getState().viewMode).toBe("code");

      emitter.emit("menu:toggle-view");
      expect(useUIStore.getState().viewMode).toBe("rendered");

      unlisten();
    });

    it("unlisten removes the callback", async () => {
      const { toggleViewMode } = useUIStore.getState();

      const unlisten = await setupEventListeners([
        { event: "menu:toggle-view", callback: () => toggleViewMode() },
      ]);

      const emitter = getWebEventEmitter();

      // First emit should work
      emitter.emit("menu:toggle-view");
      expect(useUIStore.getState().viewMode).toBe("rendered");

      // Remove listener
      unlisten();

      // Second emit should not change state
      emitter.emit("menu:toggle-view");
      expect(useUIStore.getState().viewMode).toBe("rendered");
    });
  });

  describe("menu:toggle-outline event pattern", () => {
    it("toggles outline visibility when event is emitted", async () => {
      const { toggleOutline } = useUIStore.getState();

      const unlisten = await setupEventListeners([
        { event: "menu:toggle-outline", callback: () => toggleOutline() },
      ]);

      expect(useUIStore.getState().outlineVisible).toBe(false);

      const emitter = getWebEventEmitter();
      emitter.emit("menu:toggle-outline");

      expect(useUIStore.getState().outlineVisible).toBe(true);

      unlisten();
    });
  });
});
