import { create } from 'zustand';
import { FileNode } from '../types';

interface FileState {
  rootPath: string | null;
  fileTree: FileNode[];
  recentFiles: string[];
  setRootPath: (path: string) => void;
  setFileTree: (tree: FileNode[]) => void;
  addRecentFile: (path: string) => void;
}

export const useFileStore = create<FileState>((set) => ({
  rootPath: null,
  fileTree: [],
  recentFiles: [],
  setRootPath: (path) => set({ rootPath: path }),
  setFileTree: (tree) => set({ fileTree: tree }),
  addRecentFile: (path) =>
    set((state) => ({
      recentFiles: [path, ...state.recentFiles.filter((p) => p !== path)].slice(0, 10),
    })),
}));
