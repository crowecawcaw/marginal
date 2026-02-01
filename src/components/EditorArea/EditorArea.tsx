import React, { useState, useEffect } from 'react';
import { setupEventListeners } from '../../platform/eventAdapter';
import { useEditorStore } from '../../stores/editorStore';
import MarkdownEditor from './MarkdownEditor';
import FindInDocument from './FindInDocument';
import './EditorArea.css';
import prettier from 'prettier/standalone';
import prettierMarkdown from 'prettier/plugins/markdown';

type ViewMode = 'rendered' | 'code';

const EditorArea: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, updateTabContent, markTabDirty } = useEditorStore();
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  const [findVisible, setFindVisible] = useState(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Handle format document
  const handleFormat = async () => {
    if (!activeTab || viewMode !== 'code') return;

    try {
      const formatted = await prettier.format(activeTab.content, {
        parser: 'markdown',
        plugins: [prettierMarkdown],
        proseWrap: 'preserve',
      });
      updateTabContent(activeTab.id, formatted);
      if (!activeTab.isDirty) {
        markTabDirty(activeTab.id, true);
      }
    } catch (error) {
      console.error('Failed to format document:', error);
    }
  };

  // Handle Cmd+F keyboard shortcut for find
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setFindVisible(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for format menu event (works in both Tauri and web)
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    setupEventListeners([
      { event: 'menu:format-document', callback: () => handleFormat() },
      { event: 'menu:view-rendered', callback: () => setViewMode('rendered') },
      { event: 'menu:view-code', callback: () => setViewMode('code') },
    ]).then((unlisten) => {
      cleanup = unlisten;
    });

    return () => {
      cleanup?.();
    };
  }, [activeTab, viewMode]);

  return (
    <div className="editor-area">
      {tabs.length > 1 && (
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
        </div>
      )}
      <div className="editor-content" style={{ position: 'relative' }}>
        {activeTab && (
          <>
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
