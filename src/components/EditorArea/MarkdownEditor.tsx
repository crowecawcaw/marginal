import React, { useEffect } from 'react';
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
import { $getRoot, $createParagraphNode, $createTextNode, EditorState } from 'lexical';
import { TRANSFORMERS } from '@lexical/markdown';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
}

// Plugin to set initial content from markdown
function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      root.clear();

      if (content.trim()) {
        // For now, treat content as plain text
        // We'll enhance this with proper markdown parsing later
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode(content);
        paragraph.append(textNode);
        root.append(paragraph);
      }
    });
  }, [editor, content]);

  return null;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ initialContent, onChange }) => {
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
      const root = $getRoot();
      const textContent = root.getTextContent();
      onChange(textContent);
    });
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="markdown-editor-container">
        <RichTextPlugin
          contentEditable={<ContentEditable className="markdown-editor-input" />}
          placeholder={<div className="markdown-editor-placeholder">Start writing...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <ListPlugin />
        <LinkPlugin />
        <TabIndentationPlugin />
        <InitialContentPlugin content={initialContent} />
      </div>
    </LexicalComposer>
  );
};

export default MarkdownEditor;
