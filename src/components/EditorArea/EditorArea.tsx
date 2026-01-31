import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import MarkdownEditor from './MarkdownEditor';
import './EditorArea.css';

type ViewMode = 'rendered' | 'code';

const EditorArea: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, updateTabContent, markTabDirty } = useEditorStore();
  const [viewMode, setViewMode] = useState<ViewMode>('code');

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <div className="editor-area">
      <div className="editor-tabs">
        <div className="editor-tabs-left">
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
        <div className="editor-view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'rendered' ? 'active' : ''}`}
            onClick={() => setViewMode('rendered')}
            title="Rendered view"
          >
            Aa
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'code' ? 'active' : ''}`}
            onClick={() => setViewMode('code')}
            title="Code view"
          >
            &lt;/&gt;
          </button>
        </div>
      </div>
      <div className="editor-content">
        {activeTab && (
          <MarkdownEditor
            key={`${activeTab.id}-${viewMode}`}
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
        )}
      </div>
    </div>
  );
};

export default EditorArea;
