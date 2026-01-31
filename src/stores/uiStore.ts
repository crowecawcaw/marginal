import { create } from 'zustand';
import { SidebarView } from '../types';

interface UIState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  currentSidebarView: SidebarView;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setSidebarView: (view: SidebarView) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarVisible: true,
  sidebarWidth: 250,
  currentSidebarView: 'files',
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setSidebarView: (view) => set({ currentSidebarView: view }),
}));
