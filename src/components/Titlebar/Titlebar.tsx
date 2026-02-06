import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEditorStore } from "../../stores/editorStore";
import { emit } from "../../platform/eventAdapter";
import "./Titlebar.css";

const Titlebar: React.FC = () => {
  const { files, activeFileId, setActiveFile } = useEditorStore();

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      if (e.detail === 2) {
        getCurrentWindow().toggleMaximize();
      } else {
        getCurrentWindow().startDragging();
      }
    }
  };

  const handleTabClose = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    // Emit close event with the specific file ID
    // Layout will handle the save confirmation
    emit("close-tab", { fileId });
  };

  return (
    <div className="titlebar">
      {/* Left drag region - includes space for traffic lights */}
      <div className="titlebar-drag-left" onMouseDown={handleDragStart} />

      {/* Tab items - Render each file as a tab in the titlebar */}
      <div className="titlebar-tabs">
        {files.map((file) => (
          <button
            key={file.id}
            className={`titlebar-tab ${file.id === activeFileId ? "active" : ""}`}
            onClick={() => setActiveFile(file.id)}
          >
            <span className="titlebar-tab-name">
              {file.isDirty && <span className="titlebar-tab-dirty">●</span>}
              {file.fileName}
            </span>
            {files.length > 1 && (
              <span
                className="titlebar-tab-close"
                onClick={(e) => handleTabClose(e, file.id)}
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Right drag region */}
      <div className="titlebar-drag-right" onMouseDown={handleDragStart} />
    </div>
  );
};

export default Titlebar;
