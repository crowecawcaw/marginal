import { create } from "zustand";
import { FileNode } from "../types";
import { loadSettings, saveSettings } from "../utils/settings";

interface FileState {
  rootPath: string | null;
  fileTree: FileNode[];
  recentFiles: string[];
  setRootPath: (path: string) => void;
  setFileTree: (tree: FileNode[]) => void;
  addRecentFile: (path: string) => void;
}

// Load initial settings from localStorage
const settings = loadSettings();

export const useFileStore = create<FileState>((set) => ({
  rootPath: settings.lastOpenedFolder,
  fileTree: [],
  recentFiles: settings.recentFiles,
  setRootPath: (path) => {
    saveSettings({ lastOpenedFolder: path });
    set({ rootPath: path });
  },
  setFileTree: (tree) => set({ fileTree: tree }),
  addRecentFile: (path) =>
    set((state) => {
      const newRecentFiles = [
        path,
        ...state.recentFiles.filter((p) => p !== path),
      ].slice(0, 10);
      saveSettings({ recentFiles: newRecentFiles });
      return { recentFiles: newRecentFiles };
    }),
}));
