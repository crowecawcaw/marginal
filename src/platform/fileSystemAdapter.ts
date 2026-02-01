/**
 * File System Adapter
 *
 * Provides a unified interface for file system operations that works
 * in both Tauri (desktop) and web browser environments.
 */

import { isTauri } from "./index";
import { FileNode } from "../types";

// Types for dialog options
export interface OpenDialogOptions {
  directory?: boolean;
  multiple?: boolean;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface SaveDialogOptions {
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

// In-memory file storage for web mode
interface WebFile {
  name: string;
  content: string;
  lastModified: number;
}

class WebFileStorage {
  private files: Map<string, WebFile> = new Map();
  private nextId = 1;

  constructor() {
    // Try to restore from localStorage
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem("marginal-files");
      if (stored) {
        const data = JSON.parse(stored);
        this.files = new Map(Object.entries(data.files || {}));
        this.nextId = data.nextId || 1;
      }
    } catch (e) {
      console.warn("Failed to load files from localStorage:", e);
    }
  }

  private saveToStorage() {
    try {
      const data = {
        files: Object.fromEntries(this.files),
        nextId: this.nextId,
      };
      localStorage.setItem("marginal-files", JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save files to localStorage:", e);
    }
  }

  addFile(name: string, content: string): string {
    const id = `web-file-${this.nextId++}`;
    this.files.set(id, {
      name,
      content,
      lastModified: Date.now(),
    });
    this.saveToStorage();
    return id;
  }

  getFile(id: string): WebFile | undefined {
    return this.files.get(id);
  }

  updateFile(id: string, content: string) {
    const file = this.files.get(id);
    if (file) {
      file.content = content;
      file.lastModified = Date.now();
      this.saveToStorage();
    }
  }

  deleteFile(id: string) {
    this.files.delete(id);
    this.saveToStorage();
  }

  getAllFiles(): FileNode[] {
    return Array.from(this.files.entries()).map(([id, file]) => ({
      name: file.name,
      path: id,
      isDirectory: false,
    }));
  }
}

// Singleton instance for web file storage
let webFileStorage: WebFileStorage | null = null;

const getWebFileStorage = (): WebFileStorage => {
  if (!webFileStorage) {
    webFileStorage = new WebFileStorage();
  }
  return webFileStorage;
};

/**
 * Open a file or folder dialog
 */
export async function openDialog(
  options: OpenDialogOptions,
): Promise<string | null> {
  if (isTauri()) {
    // Use Tauri dialog
    const { open } = await import("@tauri-apps/plugin-dialog");
    const result = await open(options);
    if (result && typeof result === "string") {
      return result;
    }
    return null;
  } else {
    // Web implementation using File System Access API or fallback
    if (options.directory) {
      // For directory selection, we'll show a message that it's not supported
      // and create a virtual folder instead
      return "web-folder";
    }

    // Use File input for file selection
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept =
        options.filters
          ?.flatMap((f) => f.extensions.map((ext) => `.${ext}`))
          .join(",") || "*";

      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) {
          const content = await file.text();
          const storage = getWebFileStorage();
          const id = storage.addFile(file.name, content);
          resolve(id);
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}

/**
 * Save file dialog (for Save As)
 */
export async function saveDialog(
  options: SaveDialogOptions,
): Promise<string | null> {
  if (isTauri()) {
    // Use Tauri dialog
    const { save } = await import("@tauri-apps/plugin-dialog");
    const result = await save({
      defaultPath: options.defaultPath,
      filters: options.filters,
    });
    return result;
  } else {
    // Web implementation - prompt for filename
    const defaultName = options.defaultPath || "document.md";
    const fileName = window.prompt("Enter file name:", defaultName);
    if (fileName) {
      const storage = getWebFileStorage();
      return storage.addFile(fileName, "");
    }
    return null;
  }
}

/**
 * Read directory tree
 */
export async function readDirTree(path: string): Promise<FileNode[]> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<FileNode[]>("read_dir_tree", { path });
  } else {
    // Return the web file storage contents
    const storage = getWebFileStorage();
    return storage.getAllFiles();
  }
}

/**
 * Read file content
 */
export async function readFileContent(path: string): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("read_file_content", { path });
  } else {
    const storage = getWebFileStorage();
    const file = storage.getFile(path);
    if (file) {
      return file.content;
    }
    throw new Error(`File not found: ${path}`);
  }
}

/**
 * Write file content
 */
export async function writeFileContent(
  path: string,
  content: string,
): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_file_content", { path, content });
  } else {
    const storage = getWebFileStorage();
    const file = storage.getFile(path);
    if (file) {
      storage.updateFile(path, content);
    } else {
      // Create new file if it doesn't exist
      storage.addFile(path.split("/").pop() || "untitled.md", content);
    }
  }
}

/**
 * Download file to user's computer (web only)
 */
export function downloadFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get the filename from a path
 */
export function getFileName(path: string): string {
  if (isTauri()) {
    return path.split("/").pop() || path.split("\\").pop() || "Untitled";
  } else {
    const storage = getWebFileStorage();
    const file = storage.getFile(path);
    return file?.name || path.split("/").pop() || "Untitled";
  }
}
