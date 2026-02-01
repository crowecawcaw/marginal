import { create } from "zustand";
import { EditorTab } from "../types";

// Extract first header from markdown content
const extractFirstHeader = (content: string): string | null => {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      // Remove the # symbols and any extra whitespace
      return trimmed.replace(/^#+\s*/, "").trim();
    }
  }
  return null;
};

interface EditorState {
  tabs: EditorTab[];
  activeTabId: string | null;
  openTab: (tab: EditorTab) => void;
  addTab: (tab: EditorTab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  markTabDirty: (id: string, isDirty: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  tabs: [],
  activeTabId: null,
  openTab: (tab) =>
    set((state) => {
      const existingTab = state.tabs.find((t) => t.id === tab.id);
      if (existingTab) {
        return { activeTabId: tab.id };
      }
      return {
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      };
    }),
  addTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    })),
  removeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      const newActiveTabId =
        state.activeTabId === id
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].id
            : null
          : state.activeTabId;
      return { tabs: newTabs, activeTabId: newActiveTabId };
    }),
  setActiveTab: (id) => set({ activeTabId: id }),
  updateTabContent: (id, content) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id === id) {
          // For unsaved files, update fileName based on first header
          if (!tab.filePath) {
            const firstHeader = extractFirstHeader(content);
            if (firstHeader) {
              return { ...tab, content, fileName: firstHeader };
            }
          }
          return { ...tab, content };
        }
        return tab;
      }),
    })),
  markTabDirty: (id, isDirty) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, isDirty } : tab,
      ),
    })),
}));
