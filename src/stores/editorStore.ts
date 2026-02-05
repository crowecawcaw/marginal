import { create } from "zustand";
import { EditorFile } from "../types";

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
  files: EditorFile[];
  activeFileId: string | null;
  openFile: (file: EditorFile) => void;
  addFile: (file: EditorFile) => void;
  removeFile: (id: string) => void;
  setActiveFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  markFileDirty: (id: string, isDirty: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  files: [],
  activeFileId: null,
  openFile: (file) =>
    set((state) => {
      const existingFile = state.files.find((f) => f.id === file.id);
      if (existingFile) {
        return { activeFileId: file.id };
      }
      return {
        files: [...state.files, file],
        activeFileId: file.id,
      };
    }),
  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file],
      activeFileId: file.id,
    })),
  removeFile: (id) =>
    set((state) => {
      const newFiles = state.files.filter((f) => f.id !== id);
      const newActiveFileId =
        state.activeFileId === id
          ? newFiles.length > 0
            ? newFiles[newFiles.length - 1].id
            : null
          : state.activeFileId;
      return { files: newFiles, activeFileId: newActiveFileId };
    }),
  setActiveFile: (id) => set({ activeFileId: id }),
  updateFileContent: (id, content) =>
    set((state) => ({
      files: state.files.map((file) => {
        if (file.id === id) {
          // For unsaved files, update fileName based on first header
          if (!file.filePath) {
            const firstHeader = extractFirstHeader(content);
            if (firstHeader) {
              return { ...file, content, fileName: `${firstHeader}.md` };
            }
          }
          return { ...file, content };
        }
        return file;
      }),
    })),
  markFileDirty: (id, isDirty) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id ? { ...file, isDirty } : file,
      ),
    })),
}));
