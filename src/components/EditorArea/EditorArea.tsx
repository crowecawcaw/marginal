import React, { useState, useEffect } from "react";
import { setupEventListeners, emit } from "../../platform/eventAdapter";
import { useEditorStore } from "../../stores/editorStore";
import { useUIStore } from "../../stores/uiStore";
import { useNotificationStore } from "../../stores/notificationStore";
import MarkdownEditor from "./MarkdownEditor";
import FindInDocument from "./FindInDocument";
import "./EditorArea.css";
import prettier from "prettier/standalone";
import prettierMarkdown from "prettier/plugins/markdown";

const EditorArea: React.FC = () => {
  const { files, activeFileId, updateFileContent, markFileDirty } = useEditorStore();
  const { viewMode, codeZoom, renderedZoom, outlineVisible, outlineWidth } = useUIStore();
  const zoom = viewMode === "code" ? codeZoom : renderedZoom;
  const { addNotification } = useNotificationStore();
  const [findVisible, setFindVisible] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const activeFile = files.find((file) => file.id === activeFileId);

  // Handle keyboard shortcuts: Cmd+F for find, Cmd+Shift+F for format
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+F - Format document
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        emit("menu:format-document");
        return;
      }

      // Cmd+F - Find in document (only if Shift is NOT pressed)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "f") {
        e.preventDefault();
        setFindVisible(true);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for format-document event
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const handleFormat = async () => {
      if (!activeFile) return;

      if (viewMode !== "code") {
        addNotification(
          "Format document is only available in code view",
          "error",
        );
        return;
      }

      try {
        const formatted = await prettier.format(activeFile.content, {
          parser: "markdown",
          plugins: [prettierMarkdown],
          proseWrap: "preserve",
          printWidth: 120,
        });
        updateFileContent(activeFile.id, formatted);
        if (!activeFile.isDirty) {
          markFileDirty(activeFile.id, true);
        }
        // Force editor remount to show formatted content
        setEditorKey((prev) => prev + 1);
      } catch (error) {
        console.error("Failed to format document:", error);
      }
    };

    setupEventListeners([
      { event: "menu:format-document", callback: handleFormat },
    ]).then((unlisten) => {
      cleanup = unlisten;
    });

    return () => {
      cleanup?.();
    };
  }, [activeFile, viewMode, updateFileContent, markFileDirty, addNotification]);

  return (
    <div className="editor-area" style={outlineVisible ? { '--outline-offset': `${outlineWidth + 24}px` } as React.CSSProperties : undefined}>
      <div className="editor-content">
        {activeFile && (
          <>
            <MarkdownEditor
              key={`${activeFile.id}-${viewMode}-${editorKey}`}
              initialContent={activeFile.content}
              viewMode={viewMode}
              zoom={zoom}
              onChange={(content) => {
                const hasChanged = content !== activeFile.content;
                updateFileContent(activeFile.id, content);
                if (hasChanged && !activeFile.isDirty) {
                  markFileDirty(activeFile.id, true);
                }
              }}
            />
            {findVisible && (
              <FindInDocument
                content={activeFile.content}
                viewMode={viewMode}
                onClose={() => setFindVisible(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EditorArea;
