import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUIStore } from "./uiStore";

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

describe("uiStore zoom functionality", () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset store to default state
    useUIStore.setState({
      viewMode: "code",
      codeZoom: 100,
      renderedZoom: 100,
    });
  });

  describe("zoomIn", () => {
    it("increases code zoom when in code view", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 100 });

      useUIStore.getState().zoomIn();

      expect(useUIStore.getState().codeZoom).toBe(110);
    });

    it("increases rendered zoom when in rendered view", () => {
      useUIStore.setState({ viewMode: "rendered", renderedZoom: 100 });

      useUIStore.getState().zoomIn();

      expect(useUIStore.getState().renderedZoom).toBe(110);
    });

    it("does not exceed maximum zoom (200%)", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 200 });

      useUIStore.getState().zoomIn();

      expect(useUIStore.getState().codeZoom).toBe(200);
    });

    it("increases by 10% step", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 80 });

      useUIStore.getState().zoomIn();

      expect(useUIStore.getState().codeZoom).toBe(90);
    });
  });

  describe("zoomOut", () => {
    it("decreases code zoom when in code view", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 100 });

      useUIStore.getState().zoomOut();

      expect(useUIStore.getState().codeZoom).toBe(90);
    });

    it("decreases rendered zoom when in rendered view", () => {
      useUIStore.setState({ viewMode: "rendered", renderedZoom: 100 });

      useUIStore.getState().zoomOut();

      expect(useUIStore.getState().renderedZoom).toBe(90);
    });

    it("does not go below minimum zoom (50%)", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 50 });

      useUIStore.getState().zoomOut();

      expect(useUIStore.getState().codeZoom).toBe(50);
    });

    it("decreases by 10% step", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 120 });

      useUIStore.getState().zoomOut();

      expect(useUIStore.getState().codeZoom).toBe(110);
    });
  });

  describe("independent zoom levels", () => {
    it("maintains separate zoom levels for code and rendered views", () => {
      useUIStore.setState({
        viewMode: "code",
        codeZoom: 100,
        renderedZoom: 100,
      });

      // Zoom in on code view
      useUIStore.getState().zoomIn();
      expect(useUIStore.getState().codeZoom).toBe(110);
      expect(useUIStore.getState().renderedZoom).toBe(100);

      // Switch to rendered view and zoom in
      useUIStore.setState({ viewMode: "rendered" });
      useUIStore.getState().zoomIn();
      expect(useUIStore.getState().codeZoom).toBe(110);
      expect(useUIStore.getState().renderedZoom).toBe(110);
    });
  });
});
