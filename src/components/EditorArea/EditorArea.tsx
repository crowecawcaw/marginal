import React from 'react';
import { useEditorStore } from '../../stores/editorStore';
import MarkdownEditor from './MarkdownEditor';
import './EditorArea.css';

const EditorArea: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, updateTabContent, markTabDirty } = useEditorStore();

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  if (tabs.length === 0) {
    return (
      <div className="editor-area">
        <div className="editor-welcome">
          <h1>Marginal</h1>
          <p>A modern markdown editor</p>
          <div className="welcome-actions">
            <p className="welcome-hint">Open a folder from the sidebar to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-area">
      <div className="editor-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`editor-tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="editor-tab-name">
              {tab.isDirty && '• '}
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
      <div className="editor-content">
        {activeTab && (
          <MarkdownEditor
            key={activeTab.id}
            initialContent={activeTab.content}
            onChange={(content) => {
              const hasChanged = content !== activeTab.content;
              updateTabContent(activeTab.id, content);
              if (hasChanged && !activeTab.isDirty) {
                markTabDirty(activeTab.id, true);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default EditorArea;
