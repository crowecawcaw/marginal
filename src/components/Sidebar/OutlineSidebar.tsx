import React from "react";
import { useUIStore } from "../../stores/uiStore";
import { useEditorStore } from "../../stores/editorStore";
import Outline from "./Outline/Outline";
import "./Sidebar.css";

const OutlineSidebar: React.FC = () => {
  const { outlineVisible, outlineWidth } = useUIStore();
  const { tabs, activeTabId } = useEditorStore();

  // Get the active tab's content for TOC
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeContent = activeTab?.content || "";

  if (!outlineVisible) return null;

  return (
    <div className="sidebar" style={{ '--outline-width': `${outlineWidth}px` } as React.CSSProperties}>
      <div className="sidebar-content">
        <Outline content={activeContent} />
      </div>
    </div>
  );
};

export default OutlineSidebar;
