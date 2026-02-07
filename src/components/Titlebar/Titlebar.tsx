import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./Titlebar.css";

const Titlebar: React.FC = () => {
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      if (e.detail === 2) {
        getCurrentWindow().toggleMaximize();
      } else {
        getCurrentWindow().startDragging();
      }
    }
  };

  return (
    <div className="titlebar" onMouseDown={handleDragStart} />
  );
};

export default Titlebar;
