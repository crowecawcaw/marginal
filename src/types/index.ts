export interface EditorFile {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  isDirty: boolean;
  frontmatter?: Record<string, any>;
  baseContent: string;
  diskMtime: number | null;
  ignoredExternalChangeAt: number | null;
  pendingExternalContent: string | null;
  precomputedMerge: string | null;
}

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export type SidebarView = "files" | "outline";

export type ViewMode = "rendered" | "code";
