import React, { useState, useEffect } from "react";
import { setupEventListeners } from "../../platform/eventAdapter";
import { useEditorStore } from "../../stores/editorStore";
import MarkdownEditor from "./MarkdownEditor";
import FindInDocument from "./FindInDocument";
import "./EditorArea.css";
import prettier from "prettier/standalone";
import prettierMarkdown from "prettier/plugins/markdown";

type ViewMode = "rendered" | "code";

const EditorArea: React.FC = () => {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    removeTab,
    updateTabContent,
    markTabDirty,
  } = useEditorStore();
  const [viewMode, setViewMode] = useState<ViewMode>("code");
  const [findVisible, setFindVisible] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Handle Cmd+F keyboard shortcut for find
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setFindVisible(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for menu events (works in both Tauri and web)
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    // Handle format document - defined inside useEffect to always use current activeTab
    const handleFormat = async () => {
      if (!activeTab || viewMode !== "code") return;

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

    const toggleView = () => {
      setViewMode((current) => (current === "code" ? "rendered" : "code"));
    };

    setupEventListeners([
      { event: "menu:format-document", callback: handleFormat },
      { event: "menu:toggle-view", callback: toggleView },
    ]).then((unlisten) => {
      cleanup = unlisten;
    });

    return () => {
      cleanup?.();
    };
  }, [activeTab, viewMode, updateTabContent, markTabDirty]);

  return (
    <div className="editor-area">
      {tabs.length > 1 && (
        <div className="editor-tabs">
          <div className="editor-tabs-left">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`editor-tab ${tab.id === activeTabId ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="editor-tab-name">
                  {tab.isDirty && "• "}
                  {tab.fileName}
                </span>
                <button
                  className="editor-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
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
            <div className="editor-view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === "rendered" ? "active" : ""}`}
                onClick={() => setViewMode("rendered")}
                title="Rendered view"
              >
                Aa
              </button>
              <button
                className={`view-toggle-btn ${viewMode === "code" ? "active" : ""}`}
                onClick={() => setViewMode("code")}
                title="Code view"
              >
                &lt;/&gt;
              </button>
            </div>
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
