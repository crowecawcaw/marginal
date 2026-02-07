import { useEditorStore } from "./editorStore";
import { saveAutosaveEntry, removeAutosaveEntry } from "../utils/autosave";

const DEBOUNCE_MS = 5000;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

let unsubscribe: (() => void) | null = null;

export function setupAutosaveSubscription(): () => void {
  if (unsubscribe) return unsubscribe;

  unsubscribe = useEditorStore.subscribe((state, prevState) => {
    const currentIds = new Set(state.files.map((f) => f.id));

    // Cancel timers for removed files and clear their autosave entries
    for (const [id, timer] of timers) {
      if (!currentIds.has(id)) {
        clearTimeout(timer);
        timers.delete(id);
        removeAutosaveEntry(id);
      }
    }

    // Check each file for content changes
    for (const file of state.files) {
      const prevFile = prevState.files.find((f) => f.id === file.id);

      if (!prevFile) continue;
      if (file.content === prevFile.content) continue;
      if (!file.isDirty) continue;

      // Reset debounce timer for this file
      const existing = timers.get(file.id);
      if (existing) clearTimeout(existing);

      const fileSnapshot = { ...file };
      timers.set(
        file.id,
        setTimeout(() => {
          timers.delete(fileSnapshot.id);
          saveAutosaveEntry(fileSnapshot.id, {
            content: fileSnapshot.content,
            fileName: fileSnapshot.fileName,
            filePath: fileSnapshot.filePath,
            frontmatter: fileSnapshot.frontmatter,
            savedAt: Date.now(),
          });
        }, DEBOUNCE_MS),
      );
    }
  });

  return () => {
    // Cleanup all timers
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
    unsubscribe?.();
    unsubscribe = null;
  };
}
