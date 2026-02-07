import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadSettings, saveSettings, clearSettings } from "./settings";

// Mock Tauri store
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: { load: vi.fn() },
}));

describe("settings", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe("loadSettings", () => {
    it("returns default settings when localStorage is empty", () => {
      const settings = loadSettings();

      expect(settings).toEqual({
        sidebarVisible: false,
        sidebarWidth: 250,
        outlineVisible: true,
        outlineWidth: 250,
        viewMode: "code",
        codeZoom: 100,
        renderedZoom: 100,
        recentFiles: [],
        lastOpenedFolder: null,
        openFiles: [],
        activeFilePath: null,
        theme: "system",
      });
    });

    it("loads settings from localStorage", () => {
      const storedSettings = {
        sidebarVisible: true,
        sidebarWidth: 300,
        outlineVisible: true,
        outlineWidth: 300,
        viewMode: "code" as const,
        codeZoom: 120,
        renderedZoom: 80,
        recentFiles: ["/path/to/file.md"],
        lastOpenedFolder: "/path/to/folder",
        openFiles: ["/path/to/file.md"],
        activeFilePath: "/path/to/file.md",
        theme: "system" as const,
      };

      localStorage.setItem("marginal:settings", JSON.stringify(storedSettings));

      const settings = loadSettings();
      expect(settings).toEqual(storedSettings);
    });

    it("merges stored settings with defaults", () => {
      // Only store partial settings
      const partialSettings = {
        sidebarVisible: true,
      };

      localStorage.setItem(
        "marginal:settings",
        JSON.stringify(partialSettings),
      );

      const settings = loadSettings();
      expect(settings).toEqual({
        sidebarVisible: true,
        sidebarWidth: 250,
        outlineVisible: true,
        outlineWidth: 250,
        viewMode: "code",
        codeZoom: 100,
        renderedZoom: 100,
        recentFiles: [],
        lastOpenedFolder: null,
        openFiles: [],
        activeFilePath: null,
        theme: "system",
      });
    });

    it("returns defaults when localStorage data is invalid", () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      localStorage.setItem("marginal:settings", "invalid json");

      const settings = loadSettings();
      expect(settings).toEqual({
        sidebarVisible: false,
        sidebarWidth: 250,
        outlineVisible: true,
        outlineWidth: 250,
        viewMode: "code",
        codeZoom: 100,
        renderedZoom: 100,
        recentFiles: [],
        lastOpenedFolder: null,
        openFiles: [],
        activeFilePath: null,
        theme: "system",
      });

      consoleSpy.mockRestore();
    });
  });

  describe("saveSettings", () => {
    it("saves settings to localStorage", async () => {
      await saveSettings({ sidebarVisible: true });

      const stored = JSON.parse(localStorage.getItem("marginal:settings")!);
      expect(stored.sidebarVisible).toBe(true);
    });

    it("merges new settings with existing settings", async () => {
      await saveSettings({ sidebarVisible: true });
      await saveSettings({ sidebarWidth: 300 });

      const settings = loadSettings();
      expect(settings.sidebarVisible).toBe(true);
      expect(settings.sidebarWidth).toBe(300);
    });

    it("preserves unmodified settings", async () => {
      await saveSettings({
        sidebarVisible: true,
        recentFiles: ["/file1.md", "/file2.md"],
      });

      await saveSettings({ sidebarWidth: 300 });

      const settings = loadSettings();
      expect(settings.sidebarVisible).toBe(true);
      expect(settings.recentFiles).toEqual(["/file1.md", "/file2.md"]);
      expect(settings.sidebarWidth).toBe(300);
    });

    it("saves zoom settings correctly", async () => {
      await saveSettings({ codeZoom: 125, renderedZoom: 75 });

      const settings = loadSettings();
      expect(settings.codeZoom).toBe(125);
      expect(settings.renderedZoom).toBe(75);
    });
  });

  describe("clearSettings", () => {
    it("removes settings from localStorage", async () => {
      await saveSettings({ sidebarVisible: true });

      await clearSettings();

      const stored = localStorage.getItem("marginal:settings");
      expect(stored).toBeNull();
    });

    it("causes loadSettings to return defaults after clearing", async () => {
      await saveSettings({ sidebarVisible: true, sidebarWidth: 300 });
      await clearSettings();

      const settings = loadSettings();
      expect(settings).toEqual({
        sidebarVisible: false,
        sidebarWidth: 250,
        outlineVisible: true,
        outlineWidth: 250,
        viewMode: "code",
        codeZoom: 100,
        renderedZoom: 100,
        recentFiles: [],
        lastOpenedFolder: null,
        openFiles: [],
        activeFilePath: null,
        theme: "system",
      });
    });
  });

  describe("openFiles and activeFilePath", () => {
    it("saves and loads openFiles", async () => {
      await saveSettings({ openFiles: ["/path/a.md", "/path/b.md"] });

      const settings = loadSettings();
      expect(settings.openFiles).toEqual(["/path/a.md", "/path/b.md"]);
    });

    it("saves and loads activeFilePath", async () => {
      await saveSettings({ activeFilePath: "/path/a.md" });

      const settings = loadSettings();
      expect(settings.activeFilePath).toBe("/path/a.md");
    });

    it("preserves openFiles when saving other settings", async () => {
      await saveSettings({
        openFiles: ["/path/a.md"],
        activeFilePath: "/path/a.md",
      });
      await saveSettings({ sidebarVisible: true });

      const settings = loadSettings();
      expect(settings.openFiles).toEqual(["/path/a.md"]);
      expect(settings.activeFilePath).toBe("/path/a.md");
    });
  });

  describe("default sidebar visibility", () => {
    it("defaults to sidebar closed for new users", () => {
      const settings = loadSettings();
      expect(settings.sidebarVisible).toBe(false);
    });
  });
});
