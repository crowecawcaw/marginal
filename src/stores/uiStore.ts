import { create } from 'zustand';
import { SidebarView } from '../types';
import { loadSettings, saveSettings } from '../utils/settings';

interface UIState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  currentSidebarView: SidebarView;
  isLoading: boolean;
  loadingMessage: string;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setSidebarView: (view: SidebarView) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
}

// Load initial settings from localStorage
const settings = loadSettings();

export const useUIStore = create<UIState>((set) => ({
  sidebarVisible: settings.sidebarVisible,
  sidebarWidth: settings.sidebarWidth,
  currentSidebarView: 'files',
  isLoading: false,
  loadingMessage: '',
  toggleSidebar: () =>
    set((state) => {
      const newVisible = !state.sidebarVisible;
      saveSettings({ sidebarVisible: newVisible });
      return { sidebarVisible: newVisible };
    }),
  setSidebarWidth: (width) => {
    saveSettings({ sidebarWidth: width });
    set({ sidebarWidth: width });
  },
  setSidebarView: (view) => set({ currentSidebarView: view }),
  setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),
}));
