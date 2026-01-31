import React from 'react';
import './EditorArea.css';

const EditorArea: React.FC = () => {
  return (
    <div className="editor-area">
      <div className="editor-welcome">
        <h1>Marginal</h1>
        <p>A modern markdown editor</p>
        <div className="welcome-actions">
          <button className="welcome-button">Open File</button>
          <button className="welcome-button">Open Folder</button>
        </div>
      </div>
    </div>
  );
};

export default EditorArea;
