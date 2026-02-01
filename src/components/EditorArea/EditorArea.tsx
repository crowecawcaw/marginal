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
  const { tabs, activeTabId, updateTabContent, markTabDirty } = useEditorStore();
  const { viewMode, toggleViewMode } = useUIStore();
  const { addNotification } = useNotificationStore();
  const [findVisible, setFindVisible] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Handle keyboard shortcuts: Cmd+F for find, Cmd+Shift+F for format, Cmd+Shift+P for toggle view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+P - Toggle view
      // Use emit() to dispatch event instead of directly toggling,
      // to avoid double-toggle when Tauri menu accelerator also fires
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        emit("menu:toggle-view");
        return;
      }

      // Cmd+Shift+F - Format document
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        // Trigger format event
        window.dispatchEvent(new CustomEvent("menu:format-document"));
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

  // Listen for toggle-view event
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    setupEventListeners([
      { event: "menu:toggle-view", callback: toggleViewMode },
    ]).then((unlisten) => {
      cleanup = unlisten;
    });

    return () => {
      cleanup?.();
    };
  }, [toggleViewMode]);

  // Listen for format-document event
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const handleFormat = async () => {
      if (!activeTab) return;

      if (viewMode !== "code") {
        addNotification(
          "Format document is only available in code view",
          "error",
        );
        return;
      }

      try {
        const formatted = await prettier.format(activeTab.content, {
          parser: "markdown",
          plugins: [prettierMarkdown],
          proseWrap: "preserve",
          printWidth: 120,
        });
        updateTabContent(activeTab.id, formatted);
        if (!activeTab.isDirty) {
          markTabDirty(activeTab.id, true);
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
  }, [activeTab, viewMode, updateTabContent, markTabDirty, addNotification]);

  return (
    <div className="editor-area">
      <div className="editor-content">
        {activeTab && (
          <>
            <MarkdownEditor
              key={`${activeTab.id}-${viewMode}-${editorKey}`}
              initialContent={activeTab.content}
              viewMode={viewMode}
              onChange={(content) => {
                const hasChanged = content !== activeTab.content;
                updateTabContent(activeTab.id, content);
                if (hasChanged && !activeTab.isDirty) {
                  markTabDirty(activeTab.id, true);
                }
              }}
            />
            {findVisible && (
              <FindInDocument
                content={activeTab.content}
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
