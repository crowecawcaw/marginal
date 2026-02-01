import React, { useEffect, useState, useRef } from 'react';
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
import { registerCodeHighlighting } from '@lexical/code';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { EditorState } from 'lexical';
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import OverType, { OverTypeInstance } from 'overtype';
// Import Prism core first, then language components
import 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-shell-session';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-git';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-regex';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-scala';
import 'prismjs/components/prism-haskell';
import 'prismjs/components/prism-elixir';
import 'prismjs/components/prism-erlang';
import 'prismjs/components/prism-clojure';
import 'prismjs/components/prism-lua';
import 'prismjs/components/prism-vim';
import 'prismjs/components/prism-r';
import 'prismjs/components/prism-matlab';
import 'prismjs/components/prism-julia';
import 'prismjs/components/prism-latex';
import 'prismjs/components/prism-makefile';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-apacheconf';
import 'prismjs/components/prism-http';
import 'prismjs/components/prism-protobuf';
import 'prismjs/components/prism-wasm';
import 'prismjs/components/prism-xml-doc';
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

// Plugin to enable code syntax highlighting with Prism
function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);

  return null;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ initialContent, viewMode, onChange }) => {
  const [content, setContent] = useState(initialContent);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<OverTypeInstance | null>(null);

  // Sync content when initialContent changes (e.g., switching tabs)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onChange(newContent);
  };

  // Set up OverType for code view
  useEffect(() => {
    if (viewMode === 'code' && editorContainerRef.current && !editorRef.current) {
      const [editor] = new OverType(editorContainerRef.current, {
        value: content,
        theme: 'cave',
        onChange: (value: string) => {
          setContent(value);
          onChange(value);
        },
      });
      editorRef.current = editor;
    }

    // Only cleanup when switching away from code view or unmounting
    return () => {
      if (viewMode !== 'code' && editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [viewMode, onChange]);

  // Update OverType content when initialContent changes
  useEffect(() => {
    if (viewMode === 'code' && editorRef.current) {
      const currentContent = editorRef.current.getValue();
      if (currentContent !== initialContent) {
        editorRef.current.setValue(initialContent);
      }
    }
  }, [initialContent, viewMode]);

  // For code view, use OverType
  if (viewMode === 'code') {
    return (
      <div className="markdown-editor-container">
        <div ref={editorContainerRef} className="markdown-code-editor" />
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
        <CodeHighlightPlugin />
      </div>
    </LexicalComposer>
  );
};

export default MarkdownEditor;
