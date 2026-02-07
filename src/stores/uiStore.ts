import { create } from "zustand";
import { SidebarView, ViewMode } from "../types";
import { loadSettings, saveSettings, Theme } from "../utils/settings";
import { isTauri } from "../platform";

// Emit view mode change to Tauri backend for menu text updates
async function emitViewModeChange(mode: ViewMode): Promise<void> {
  if (isTauri()) {
    const { getCurrentWebviewWindow } = await import(
      "@tauri-apps/api/webviewWindow"
    );
    const appWindow = getCurrentWebviewWindow();
    await appWindow.emit("view-mode-changed", mode);
  }
}

// Zoom limits (percentage)
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 25;

interface UIState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  outlineVisible: boolean;
  outlineWidth: number;
  currentSidebarView: SidebarView;
  viewMode: ViewMode;
  codeZoom: number;
  renderedZoom: number;
  theme: Theme;
  isLoading: boolean;
  loadingMessage: string;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  toggleOutline: () => void;
  setSidebarWidth: (width: number) => void;
  setOutlineWidth: (width: number) => void;
  setSidebarView: (view: SidebarView) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setLoading: (isLoading: boolean, message?: string) => void;
}

// Load initial settings from localStorage
const settings = loadSettings();

export const useUIStore = create<UIState>((set) => ({
  sidebarVisible: settings.sidebarVisible,
  sidebarWidth: settings.sidebarWidth,
  outlineVisible: settings.outlineVisible,
  outlineWidth: settings.outlineWidth,
  currentSidebarView: "files",
  viewMode: settings.viewMode,
  codeZoom: settings.codeZoom,
  renderedZoom: settings.renderedZoom,
  theme: settings.theme,
  isLoading: false,
  loadingMessage: "",
  setTheme: (theme) => {
    void saveSettings({ theme });
    set({ theme });
  },
  toggleSidebar: () =>
    set((state) => {
      const newVisible = !state.sidebarVisible;
      void saveSettings({ sidebarVisible: newVisible });
      return { sidebarVisible: newVisible };
    }),
  toggleOutline: () =>
    set((state) => {
      const newVisible = !state.outlineVisible;
      void saveSettings({ outlineVisible: newVisible });
      return { outlineVisible: newVisible };
    }),
  setSidebarWidth: (width) => {
    void saveSettings({ sidebarWidth: width });
    set({ sidebarWidth: width });
  },
  setOutlineWidth: (width) => {
    void saveSettings({ outlineWidth: width });
    set({ outlineWidth: width });
  },
  setSidebarView: (view) => set({ currentSidebarView: view }),
  setViewMode: (mode) => {
    void saveSettings({ viewMode: mode });
    emitViewModeChange(mode);
    set({ viewMode: mode });
  },
  toggleViewMode: () =>
    set((state) => {
      const newMode = state.viewMode === "code" ? "rendered" : "code";
      void saveSettings({ viewMode: newMode });
      emitViewModeChange(newMode);
      return { viewMode: newMode };
    }),
  zoomIn: () =>
    set((state) => {
      if (state.viewMode === "code") {
        const newZoom = Math.min(state.codeZoom + ZOOM_STEP, MAX_ZOOM);
        void saveSettings({ codeZoom: newZoom });
        return { codeZoom: newZoom };
      } else {
        const newZoom = Math.min(state.renderedZoom + ZOOM_STEP, MAX_ZOOM);
        void saveSettings({ renderedZoom: newZoom });
        return { renderedZoom: newZoom };
      }
    }),
  zoomOut: () =>
    set((state) => {
      if (state.viewMode === "code") {
        const newZoom = Math.max(state.codeZoom - ZOOM_STEP, MIN_ZOOM);
        void saveSettings({ codeZoom: newZoom });
        return { codeZoom: newZoom };
      } else {
        const newZoom = Math.max(state.renderedZoom - ZOOM_STEP, MIN_ZOOM);
        void saveSettings({ renderedZoom: newZoom });
        return { renderedZoom: newZoom };
      }
    }),
  resetZoom: () =>
    set((state) => {
      const defaultZoom = 100;
      if (state.viewMode === "code") {
        void saveSettings({ codeZoom: defaultZoom });
        return { codeZoom: defaultZoom };
      } else {
        void saveSettings({ renderedZoom: defaultZoom });
        return { renderedZoom: defaultZoom };
      }
    }),
  setLoading: (isLoading, message = "") =>
    set({ isLoading, loadingMessage: message }),
}));

// Emit initial view mode to Tauri so menu text matches persisted state
void emitViewModeChange(settings.viewMode);
