import { createAppStore } from "./appStore";

export interface AutosaveEntry {
  content: string;
  fileName: string;
  filePath: string;
  frontmatter?: Record<string, any>;
  savedAt: number;
}

interface AutosaveData {
  entries: Record<string, AutosaveEntry>;
}

const store = createAppStore<AutosaveData>("autosave", { entries: {} });

export const saveAutosaveEntry = async (
  id: string,
  entry: AutosaveEntry,
): Promise<void> => {
  const current = store.load();
  await store.save({
    entries: { ...current.entries, [id]: entry },
  });
};

export const removeAutosaveEntry = async (id: string): Promise<void> => {
  const current = store.load();
  const { [id]: _, ...rest } = current.entries;
  await store.save({ entries: rest });
};

export const loadAutosaveEntries = (): Record<string, AutosaveEntry> => {
  return store.load().entries;
};

export const clearAllAutosaveEntries = async (): Promise<void> => {
  await store.clear();
};

export const initAutosave = async (): Promise<void> => {
  await store.init();
};
