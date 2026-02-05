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

      expect(useUIStore.getState().codeZoom).toBe(125);
    });

    it("increases rendered zoom when in rendered view", () => {
      useUIStore.setState({ viewMode: "rendered", renderedZoom: 100 });

      useUIStore.getState().zoomIn();

      expect(useUIStore.getState().renderedZoom).toBe(125);
    });

    it("does not exceed maximum zoom (200%)", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 200 });

      useUIStore.getState().zoomIn();

      expect(useUIStore.getState().codeZoom).toBe(200);
    });

    it("increases by 25% step", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 75 });

      useUIStore.getState().zoomIn();

      expect(useUIStore.getState().codeZoom).toBe(100);
    });
  });

  describe("zoomOut", () => {
    it("decreases code zoom when in code view", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 100 });

      useUIStore.getState().zoomOut();

      expect(useUIStore.getState().codeZoom).toBe(75);
    });

    it("decreases rendered zoom when in rendered view", () => {
      useUIStore.setState({ viewMode: "rendered", renderedZoom: 100 });

      useUIStore.getState().zoomOut();

      expect(useUIStore.getState().renderedZoom).toBe(75);
    });

    it("does not go below minimum zoom (50%)", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 50 });

      useUIStore.getState().zoomOut();

      expect(useUIStore.getState().codeZoom).toBe(50);
    });

    it("decreases by 25% step", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 125 });

      useUIStore.getState().zoomOut();

      expect(useUIStore.getState().codeZoom).toBe(100);
    });
  });

  describe("resetZoom", () => {
    it("resets code zoom to 100% when in code view", () => {
      useUIStore.setState({ viewMode: "code", codeZoom: 150 });

      useUIStore.getState().resetZoom();

      expect(useUIStore.getState().codeZoom).toBe(100);
    });

    it("resets rendered zoom to 100% when in rendered view", () => {
      useUIStore.setState({ viewMode: "rendered", renderedZoom: 75 });

      useUIStore.getState().resetZoom();

      expect(useUIStore.getState().renderedZoom).toBe(100);
    });

    it("only resets current view zoom, not the other view", () => {
      useUIStore.setState({
        viewMode: "code",
        codeZoom: 150,
        renderedZoom: 75,
      });

      useUIStore.getState().resetZoom();

      expect(useUIStore.getState().codeZoom).toBe(100);
      expect(useUIStore.getState().renderedZoom).toBe(75);
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
      expect(useUIStore.getState().codeZoom).toBe(125);
      expect(useUIStore.getState().renderedZoom).toBe(100);

      // Switch to rendered view and zoom in
      useUIStore.setState({ viewMode: "rendered" });
      useUIStore.getState().zoomIn();
      expect(useUIStore.getState().codeZoom).toBe(125);
      expect(useUIStore.getState().renderedZoom).toBe(125);
    });
  });

  describe("toggleViewMode", () => {
    it("toggles from code to rendered view", () => {
      useUIStore.setState({ viewMode: "code" });

      useUIStore.getState().toggleViewMode();

      expect(useUIStore.getState().viewMode).toBe("rendered");
    });

    it("toggles from rendered to code view", () => {
      useUIStore.setState({ viewMode: "rendered" });

      useUIStore.getState().toggleViewMode();

      expect(useUIStore.getState().viewMode).toBe("code");
    });

    it("toggles back and forth correctly", () => {
      useUIStore.setState({ viewMode: "code" });

      useUIStore.getState().toggleViewMode();
      expect(useUIStore.getState().viewMode).toBe("rendered");

      useUIStore.getState().toggleViewMode();
      expect(useUIStore.getState().viewMode).toBe("code");
    });
  });

  describe("setViewMode", () => {
    it("sets view mode to code", () => {
      useUIStore.setState({ viewMode: "rendered" });

      useUIStore.getState().setViewMode("code");

      expect(useUIStore.getState().viewMode).toBe("code");
    });

    it("sets view mode to rendered", () => {
      useUIStore.setState({ viewMode: "code" });

      useUIStore.getState().setViewMode("rendered");

      expect(useUIStore.getState().viewMode).toBe("rendered");
    });
  });
});
