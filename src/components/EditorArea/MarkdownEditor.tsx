import React, { useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { EditorState } from 'lexical';
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  initialContent: string;
  viewMode: 'rendered' | 'code';
  onChange: (content: string) => void;
}

// Plugin to set and sync content from markdown
function ContentSyncPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = React.useState(false);

  useEffect(() => {
    if (!initialized) {
      // Initial load - parse markdown and set content
      editor.update(() => {
        $convertFromMarkdownString(content, TRANSFORMERS);
      });
      setInitialized(true);
    }
  }, [editor, initialized, content]);

  return null;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ initialContent, viewMode, onChange }) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Sync content when initialContent changes (e.g., switching tabs)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onChange(newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const pairs: { [key: string]: string } = {
      '[': ']',
      '(': ')',
    };

    // Check if typing a closing character and next char is the same - skip over it
    if ((e.key === ']' || e.key === ')') && value[selectionEnd] === e.key) {
      e.preventDefault();
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionEnd + 1;
      }, 0);
      return;
    }

    // Check if the pressed key has a closing pair
    if (e.key in pairs) {
      const nextChar = value[selectionEnd];
      const closingChar = pairs[e.key];

      // Only auto-pair if the next character is not the closing character
      if (nextChar !== closingChar) {
        e.preventDefault();
        const beforeCursor = value.substring(0, selectionStart);
        const afterCursor = value.substring(selectionEnd);
        const newValue = beforeCursor + e.key + closingChar + afterCursor;

        handleContentChange(newValue);

        // Move cursor between the pair
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
        }, 0);
      }
    }
  };

  // For code view, use a simple textarea
  if (viewMode === 'code') {
    return (
      <div className="markdown-editor-container">
        <textarea
          ref={textareaRef}
          className="markdown-code-editor"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Untitled"
          spellCheck={false}
        />
      </div>
    );
  }

  // For rendered view, use Lexical
  const initialConfig = {
    namespace: 'MarkdownEditor',
    theme: {
      paragraph: 'editor-paragraph',
      heading: {
        h1: 'editor-heading-h1',
        h2: 'editor-heading-h2',
        h3: 'editor-heading-h3',
        h4: 'editor-heading-h4',
        h5: 'editor-heading-h5',
        h6: 'editor-heading-h6',
      },
      list: {
        ul: 'editor-list-ul',
        ol: 'editor-list-ol',
        listitem: 'editor-list-item',
      },
      quote: 'editor-quote',
      code: 'editor-code',
      codeHighlight: {
        atrule: 'editor-token-atrule',
        attr: 'editor-token-attr',
        boolean: 'editor-token-boolean',
        builtin: 'editor-token-builtin',
        cdata: 'editor-token-cdata',
        char: 'editor-token-char',
        class: 'editor-token-class',
        'class-name': 'editor-token-class-name',
        comment: 'editor-token-comment',
        constant: 'editor-token-constant',
        deleted: 'editor-token-deleted',
        doctype: 'editor-token-doctype',
        entity: 'editor-token-entity',
        function: 'editor-token-function',
        important: 'editor-token-important',
        inserted: 'editor-token-inserted',
        keyword: 'editor-token-keyword',
        namespace: 'editor-token-namespace',
        number: 'editor-token-number',
        operator: 'editor-token-operator',
        prolog: 'editor-token-prolog',
        property: 'editor-token-property',
        punctuation: 'editor-token-punctuation',
        regex: 'editor-token-regex',
        selector: 'editor-token-selector',
        string: 'editor-token-string',
        symbol: 'editor-token-symbol',
        tag: 'editor-token-tag',
        url: 'editor-token-url',
        variable: 'editor-token-variable',
      },
      link: 'editor-link',
      text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
        underline: 'editor-text-underline',
        strikethrough: 'editor-text-strikethrough',
        code: 'editor-text-code',
      },
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
      AutoLinkNode,
      TableNode,
      TableCellNode,
      TableRowNode,
    ],
    onError: (error: Error) => {
      console.error('Lexical Error:', error);
    },
  };

  const handleChange = (editorState: EditorState) => {
    editorState.read(() => {
      // Convert editor state to markdown
      const markdown = $convertToMarkdownString(TRANSFORMERS);
      handleContentChange(markdown);
    });
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="markdown-editor-container">
        <RichTextPlugin
          contentEditable={<ContentEditable className="markdown-editor-input" />}
          placeholder={<div className="markdown-editor-placeholder">Untitled</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <ListPlugin />
        <LinkPlugin />
        <TabIndentationPlugin />
        <ContentSyncPlugin content={content} />
      </div>
    </LexicalComposer>
  );
};

export default MarkdownEditor;
