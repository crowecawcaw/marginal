import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEditorStore } from "../../stores/editorStore";
import { useUIStore } from "../../stores/uiStore";
import { emit } from "../../platform/eventAdapter";
import "./Titlebar.css";

const Titlebar: React.FC = () => {
  const { tabs, activeTabId, setActiveTab } = useEditorStore();
  const { viewMode, setViewMode } = useUIStore();

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      if (e.detail === 2) {
        getCurrentWindow().toggleMaximize();
      } else {
        getCurrentWindow().startDragging();
      }
    }
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    // Set as active tab first, then emit close event
    // Layout will handle the save confirmation
    setActiveTab(tabId);
    emit("menu:close-tab");
  };

  return (
    <div className="titlebar">
      {/* Left drag region - includes space for traffic lights */}
      <div className="titlebar-drag-left" onMouseDown={handleDragStart} />

      {/* Tab items */}
      <div className="titlebar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`titlebar-tab ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="titlebar-tab-name">
              {tab.isDirty && <span className="titlebar-tab-dirty">●</span>}
              {tab.fileName}
            </span>
            {tabs.length > 1 && (
              <span
                className="titlebar-tab-close"
                onClick={(e) => handleTabClose(e, tab.id)}
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Right drag region */}
      <div className="titlebar-drag-right" onMouseDown={handleDragStart} />

      {/* View mode toggle */}
      <div className="titlebar-view-toggle">
        <button
          className={`titlebar-toggle-btn ${viewMode === "rendered" ? "active" : ""}`}
          onClick={() => setViewMode("rendered")}
          title="Rendered view"
        >
          Aa
        </button>
        <button
          className={`titlebar-toggle-btn ${viewMode === "code" ? "active" : ""}`}
          onClick={() => setViewMode("code")}
          title="Code view"
        >
          &lt;/&gt;
        </button>
      </div>
    </div>
  );
};

export default Titlebar;
