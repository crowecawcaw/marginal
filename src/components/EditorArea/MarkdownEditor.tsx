// Prism setup must be imported first (before @lexical/code)
import "../../lib/prismSetup";

import React, { useCallback } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { $createHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { EditorState, $getRoot, $createParagraphNode, $createTextNode } from "lexical";
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { TABLE, $createTableFromMarkdown } from "./tableTransformer";
import { TableContextMenuPlugin } from "./TableContextMenuPlugin";
import { InsertTablePlugin } from "./InsertTablePlugin";
import { TableResizePlugin } from "./TableResizePlugin";
import {
  CodeHighlightPlugin,
  LinkEditPlugin,
  ListExitPlugin,
  MarkdownSyntaxHighlightPlugin,
  RichTextFormattingPlugin,
  BracketPairingPlugin,
} from "./plugins";
import { renderedEditorTheme, codeEditorTheme } from "./editorTheme";
import "./MarkdownEditor.css";

// Custom transformers array that includes table support
const CUSTOM_TRANSFORMERS = [...TRANSFORMERS, TABLE];

interface MarkdownEditorProps {
  initialContent: string;
  viewMode: "rendered" | "code";
  zoom?: number;
  onChange: (content: string) => void;
}

// Shared nodes for rendered editor
const RENDERED_EDITOR_NODES = [
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
];

// Build the editorState initializer for the rendered editor.
// Runs synchronously during editor construction, before any plugin
// useEffect fires — which eliminates the race between content population
// and transform registration (e.g. CodeHighlightPlugin).
function buildEditorState(content: string): () => void {
  return () => {
    if (!content || content.trim() === "") {
      const root = $getRoot();
      root.clear();
      const heading = $createHeadingNode("h1");
      root.append(heading);
      return;
    }

    // Extract table blocks and process them separately
    const tableRegex = /(\|.+\|\n\|[-:\s|]+\|\n(?:\|.+\|\n?)*)/g;
    const tables: { text: string; index: number }[] = [];
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      tables.push({ text: match[1], index: match.index });
    }

    // If there are tables, replace them with placeholders
    let processedContent = content;
    const placeholder = "<!--TABLE_PLACEHOLDER-->";

    if (tables.length > 0) {
      for (let i = tables.length - 1; i >= 0; i--) {
        const table = tables[i];
        processedContent =
          processedContent.slice(0, table.index) +
          placeholder +
          processedContent.slice(table.index + table.text.length);
      }
    }

    // Convert the processed markdown
    $convertFromMarkdownString(processedContent, CUSTOM_TRANSFORMERS);

    // Now insert tables where placeholders are
    if (tables.length > 0) {
      const root = $getRoot();
      const children = root.getChildren();
      let tableIndex = 0;

      children.forEach((child) => {
        const text = child.getTextContent();
        if (text.includes(placeholder) && tableIndex < tables.length) {
          const tableNode = $createTableFromMarkdown(tables[tableIndex].text);
          if (tableNode) {
            child.insertAfter(tableNode);
            child.remove();
            tableIndex++;
          }
        }
      });
    }
  };
}

// Rendered view editor (WYSIWYG markdown)
function RenderedEditor({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (content: string) => void;
}) {
  const initialConfig = {
    namespace: "MarkdownEditor-Rendered",
    theme: renderedEditorTheme,
    nodes: RENDERED_EDITOR_NODES,
    editorState: buildEditorState(initialContent),
    onError: (error: Error) => {
      console.error("Lexical Error:", error);
    },
  };

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const markdown = $convertToMarkdownString(CUSTOM_TRANSFORMERS);
        onChange(markdown);
      });
    },
    [onChange]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="markdown-editor-container">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="markdown-editor-input" />
          }
          placeholder={
            <div className="markdown-editor-placeholder">Untitled</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
        <MarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
        <ListPlugin />
        <LinkPlugin />
        <LinkEditPlugin />
        <TablePlugin hasCellMerge={false} hasCellBackgroundColor={false} />
        <TabIndentationPlugin />
        <CodeHighlightPlugin />
        <ListExitPlugin />
        <RichTextFormattingPlugin />
        <TableContextMenuPlugin />
        <InsertTablePlugin />
        <TableResizePlugin />
      </div>
    </LexicalComposer>
  );
}

// Code view editor (plain text markdown source with syntax highlighting)
function CodeEditor({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (content: string) => void;
}) {
  const initialConfig = {
    namespace: "MarkdownEditor-Code",
    theme: codeEditorTheme,
    nodes: [],
    editorState: () => {
      if (initialContent) {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(initialContent));
        root.append(paragraph);
      }
    },
    onError: (error: Error) => {
      console.error("Lexical Error:", error);
    },
  };

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const root = $getRoot();
        const text = root.getTextContent();
        onChange(text);
      });
    },
    [onChange]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="markdown-editor-container markdown-code-view">
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className="markdown-editor-input markdown-code-input"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          }
          placeholder={
            <div className="markdown-editor-placeholder"># Untitled</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
        <MarkdownSyntaxHighlightPlugin />
        <BracketPairingPlugin />
      </div>
    </LexicalComposer>
  );
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialContent,
  viewMode,
  zoom = 100,
  onChange,
}) => {
  const zoomStyle = {
    "--editor-zoom": zoom,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  } as React.CSSProperties;

  if (viewMode === "code") {
    return (
      <div style={zoomStyle}>
        <CodeEditor
          key="code"
          initialContent={initialContent}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <div style={zoomStyle}>
      <RenderedEditor
        key="rendered"
        initialContent={initialContent}
        onChange={onChange}
      />
    </div>
  );
};

export default MarkdownEditor;
