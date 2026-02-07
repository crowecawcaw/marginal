import React, { useState, useEffect } from "react";
import { emit } from "../../platform/eventAdapter";
import { useEventListeners } from "../../platform/useEventListener";
import { useEditorStore } from "../../stores/editorStore";
import { useUIStore } from "../../stores/uiStore";
import { isCommandAvailable } from "../../utils/viewCommands";
import MarkdownEditor from "./MarkdownEditor";
import FindInDocument from "./FindInDocument";
import "./EditorArea.css";
import prettier from "prettier/standalone";
import prettierMarkdown from "prettier/plugins/markdown";

const EditorArea: React.FC = () => {
  const { files, activeFileId, updateFileContent, markFileDirty } = useEditorStore();
  const { viewMode, codeZoom, renderedZoom, outlineVisible } = useUIStore();
  const zoom = viewMode === "code" ? codeZoom : renderedZoom;
  const [findVisible, setFindVisible] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const activeFile = files.find((file) => file.id === activeFileId);

  // Handle keyboard shortcuts: Cmd+F for find, Cmd+Shift+F for format
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+F - Format document (only in code view)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        if (isCommandAvailable("format-document", viewMode)) {
          emit("menu:format-document");
        }
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
  }, [viewMode]);

  // Listen for format-document and find events
  const handleFormat = async () => {
    if (!activeFile) return;
    if (viewMode !== "code") return;

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

  useEventListeners([
    { event: "menu:format-document", callback: handleFormat },
    { event: "menu:find", callback: () => setFindVisible(true) },
  ], [activeFile, viewMode, updateFileContent, markFileDirty]);

  return (
    <div className={`editor-area${outlineVisible ? '' : ' no-outline'}`}>
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
