import React from "react";
import { useUIStore } from "../../stores/uiStore";
import { useEditorStore } from "../../stores/editorStore";
import Outline from "./Outline/Outline";
import "./Sidebar.css";

const OutlineSidebar: React.FC = () => {
  const { outlineVisible, outlineWidth } = useUIStore();
  const { files, activeFileId } = useEditorStore();

  // Get the active file's content for outline
  const activeFile = files.find((file) => file.id === activeFileId);
  const activeContent = activeFile?.content || "";

  if (!outlineVisible) return null;

  return (
    <div className="sidebar outline-sidebar" style={{ '--outline-width': `${outlineWidth}px` } as React.CSSProperties}>
      <div className="sidebar-content">
        <Outline content={activeContent} />
      </div>
    </div>
  );
};

export default OutlineSidebar;
