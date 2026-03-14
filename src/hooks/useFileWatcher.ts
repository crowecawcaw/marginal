import { useEffect, useRef } from "react";
import { isTauri } from "../platform";
import { getFileMtime, readFileContent } from "../platform/fileSystemAdapter";
import { useEditorStore } from "../stores/editorStore";
import { useUIStore } from "../stores/uiStore";
import { merge3 } from "../utils/mergeText";
import { emit } from "../platform/eventAdapter";

const POLL_INTERVAL_MS = 3000;

export function useFileWatcher(
  onExternalChangeDialog: (fileId: string) => void,
) {
  const onExternalChangeDialogRef = useRef(onExternalChangeDialog);
  onExternalChangeDialogRef.current = onExternalChangeDialog;

  useEffect(() => {
    if (!isTauri()) return;

    const checkFiles = async () => {
      if (document.visibilityState !== "visible") return;

      const state = useEditorStore.getState();
      const settings = useUIStore.getState();

      for (const file of state.files) {
        if (!file.filePath) continue;

        let newMtime: number | null;
        try {
          newMtime = await getFileMtime(file.filePath);
        } catch {
          continue;
        }

        if (newMtime === null) {
          // File was deleted — just record null, no prompt
          useEditorStore.getState().setDiskMtime(file.id, null);
          continue;
        }

        // No known mtime yet — record and skip
        if (file.diskMtime === null) {
          useEditorStore.getState().setDiskMtime(file.id, newMtime);
          continue;
        }

        if (newMtime <= file.diskMtime) {
          // No change
          continue;
        }

        // mtime changed — re-fetch current file state (may have been updated)
        const currentFile = useEditorStore.getState().files.find(
          (f) => f.id === file.id,
        );
        if (!currentFile) continue;

        // If user previously ignored this change and the mtime is newer, clear ignoredAt
        if (
          currentFile.ignoredExternalChangeAt !== null &&
          newMtime > currentFile.ignoredExternalChangeAt
        ) {
          useEditorStore.getState().clearIgnoredAt(file.id);
        }

        let newContent: string;
        try {
          newContent = await readFileContent(file.filePath);
        } catch {
          continue;
        }

        // Eagerly compute merge
        const precomputedMerge = merge3(
          currentFile.baseContent,
          currentFile.content,
          newContent,
        );
        const canMerge = precomputedMerge !== null;

        useEditorStore.getState().setDiskMtime(file.id, newMtime);

        const setting = settings.onExternalChange;

        if (setting === "merge" && !currentFile.isDirty) {
          // Fast path: no local edits, just update
          emit<{ fileId: string; content: string }>("external-merge-content", {
            fileId: file.id,
            content: newContent,
          });
          useEditorStore.getState().setBaseContent(file.id, newContent);
        } else if (setting === "merge" && currentFile.isDirty && canMerge) {
          // Auto-apply clean merge
          emit<{ fileId: string; content: string }>("external-merge-content", {
            fileId: file.id,
            content: precomputedMerge,
          });
          useEditorStore.getState().setBaseContent(file.id, newContent);
        } else {
          // Fall through to dialog (either "ask" setting, or merge conflict)
          useEditorStore
            .getState()
            .setPendingExternalContent(file.id, newContent, precomputedMerge);
          onExternalChangeDialogRef.current(file.id);
        }
      }
    };

    const intervalId = setInterval(checkFiles, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkFiles();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
