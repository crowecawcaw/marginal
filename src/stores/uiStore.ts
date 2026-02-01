import { create } from "zustand";
import { SidebarView } from "../types";
import { loadSettings, saveSettings } from "../utils/settings";

interface UIState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  outlineVisible: boolean;
  outlineWidth: number;
  currentSidebarView: SidebarView;
  isLoading: boolean;
  loadingMessage: string;
  toggleSidebar: () => void;
  toggleOutline: () => void;
  setSidebarWidth: (width: number) => void;
  setOutlineWidth: (width: number) => void;
  setSidebarView: (view: SidebarView) => void;
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
  isLoading: false,
  loadingMessage: "",
  toggleSidebar: () =>
    set((state) => {
      const newVisible = !state.sidebarVisible;
      saveSettings({ sidebarVisible: newVisible });
      return { sidebarVisible: newVisible };
    }),
  toggleOutline: () =>
    set((state) => {
      const newVisible = !state.outlineVisible;
      saveSettings({ outlineVisible: newVisible });
      return { outlineVisible: newVisible };
    }),
  setSidebarWidth: (width) => {
    saveSettings({ sidebarWidth: width });
    set({ sidebarWidth: width });
  },
  setOutlineWidth: (width) => {
    saveSettings({ outlineWidth: width });
    set({ outlineWidth: width });
  },
  setSidebarView: (view) => set({ currentSidebarView: view }),
  setLoading: (isLoading, message = "") =>
    set({ isLoading, loadingMessage: message }),
}));
