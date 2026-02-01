// Prism setup must be imported first (before @lexical/code)
import "../../lib/prismSetup";

import React, { useEffect, useCallback } from "react";
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
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  registerCodeHighlighting,
  CodeNode,
  CodeHighlightNode,
} from "@lexical/code";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import {
  EditorState,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  KEY_BACKSPACE_COMMAND,
} from "lexical";
import { $isListItemNode, $isListNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import "./MarkdownEditor.css";

interface MarkdownEditorProps {
  initialContent: string;
  viewMode: "rendered" | "code";
  onChange: (content: string) => void;
}

// Plugin to set initial content for rendered view (parse markdown)
function RenderedContentSyncPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = React.useState(false);

  useEffect(() => {
    if (!initialized) {
      editor.update(() => {
        $convertFromMarkdownString(content, TRANSFORMERS);
      });
      setInitialized(true);
    }
  }, [editor, initialized, content]);

  return null;
}

// Plugin to set initial content for code view (plain text)
function CodeContentSyncPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = React.useState(false);

  useEffect(() => {
    if (!initialized) {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(content));
        root.append(paragraph);
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

// Plugin to handle list exit behavior (Enter twice or Backspace on empty bullet exits list)
function ListExitPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Handle Enter key - exit list if on empty list item
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        const listItemNode = anchorNode.getParent();

        // Check if we're in a list item
        if (!$isListItemNode(listItemNode)) {
          return false;
        }

        // Check if the list item is empty
        const textContent = listItemNode.getTextContent();
        if (textContent !== "") {
          return false;
        }

        // Get the parent list
        const listNode = listItemNode.getParent();
        if (!$isListNode(listNode)) {
          return false;
        }

        // Prevent default Enter behavior
        event?.preventDefault();

        // Create a new paragraph and insert it after the list
        const paragraph = $createParagraphNode();

        // Get all siblings after current list item
        const siblings = listItemNode.getNextSiblings();

        if (siblings.length === 0) {
          // No siblings after, just insert paragraph after list
          listNode.insertAfter(paragraph);
        } else {
          // There are siblings after, insert paragraph after list
          listNode.insertAfter(paragraph);
        }

        // Remove the empty list item
        listItemNode.remove();

        // If the list is now empty, remove it
        if (listNode.getChildrenSize() === 0) {
          listNode.remove();
        }

        // Move selection to the new paragraph
        paragraph.selectStart();

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    // Handle Backspace key - exit list if on empty list item at start
    const unregisterBackspace = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        // Only handle if cursor is at offset 0
        if (selection.anchor.offset !== 0) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        const listItemNode = anchorNode.getParent();

        // Check if we're in a list item
        if (!$isListItemNode(listItemNode)) {
          return false;
        }

        // Check if the list item is empty
        const textContent = listItemNode.getTextContent();
        if (textContent !== "") {
          return false;
        }

        // Get the parent list
        const listNode = listItemNode.getParent();
        if (!$isListNode(listNode)) {
          return false;
        }

        // Prevent default Backspace behavior
        event?.preventDefault();

        // Create a new paragraph
        const paragraph = $createParagraphNode();

        // Check if this is the first item in the list
        const previousSibling = listItemNode.getPreviousSibling();

        if (previousSibling === null) {
          // First item - insert paragraph before list
          listNode.insertBefore(paragraph);
        } else {
          // Not first item - insert paragraph after list
          listNode.insertAfter(paragraph);
        }

        // Remove the empty list item
        listItemNode.remove();

        // If the list is now empty, remove it
        if (listNode.getChildrenSize() === 0) {
          listNode.remove();
        }

        // Move selection to the new paragraph
        paragraph.selectStart();

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      unregisterEnter();
      unregisterBackspace();
    };
  }, [editor]);

  return null;
}

// Shared theme for code highlighting tokens
const codeHighlightTheme = {
  atrule: "editor-token-atrule",
  attr: "editor-token-attr",
  boolean: "editor-token-boolean",
  builtin: "editor-token-builtin",
  cdata: "editor-token-cdata",
  char: "editor-token-char",
  class: "editor-token-class",
  "class-name": "editor-token-class-name",
  comment: "editor-token-comment",
  constant: "editor-token-constant",
  deleted: "editor-token-deleted",
  doctype: "editor-token-doctype",
  entity: "editor-token-entity",
  function: "editor-token-function",
  important: "editor-token-important",
  inserted: "editor-token-inserted",
  keyword: "editor-token-keyword",
  namespace: "editor-token-namespace",
  number: "editor-token-number",
  operator: "editor-token-operator",
  prolog: "editor-token-prolog",
  property: "editor-token-property",
  punctuation: "editor-token-punctuation",
  regex: "editor-token-regex",
  selector: "editor-token-selector",
  string: "editor-token-string",
  symbol: "editor-token-symbol",
  tag: "editor-token-tag",
  url: "editor-token-url",
  variable: "editor-token-variable",
};

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
    theme: {
      paragraph: "editor-paragraph",
      heading: {
        h1: "editor-heading-h1",
        h2: "editor-heading-h2",
        h3: "editor-heading-h3",
        h4: "editor-heading-h4",
        h5: "editor-heading-h5",
        h6: "editor-heading-h6",
      },
      list: {
        ul: "editor-list-ul",
        ol: "editor-list-ol",
        listitem: "editor-list-item",
      },
      quote: "editor-quote",
      code: "editor-code",
      codeHighlight: codeHighlightTheme,
      link: "editor-link",
      text: {
        bold: "editor-text-bold",
        italic: "editor-text-italic",
        underline: "editor-text-underline",
        strikethrough: "editor-text-strikethrough",
        code: "editor-text-code",
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
      console.error("Lexical Error:", error);
    },
  };

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const markdown = $convertToMarkdownString(TRANSFORMERS);
        onChange(markdown);
      });
    },
    [onChange],
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
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <ListPlugin />
        <LinkPlugin />
        <TabIndentationPlugin />
        <RenderedContentSyncPlugin content={initialContent} />
        <CodeHighlightPlugin />
        <ListExitPlugin />
      </div>
    </LexicalComposer>
  );
}

// Code view editor (plain text markdown source)
function CodeEditor({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (content: string) => void;
}) {
  const initialConfig = {
    namespace: "MarkdownEditor-Code",
    theme: {
      paragraph: "editor-code-paragraph",
    },
    nodes: [],
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
    [onChange],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="markdown-editor-container markdown-code-view">
        <PlainTextPlugin
          contentEditable={
            <ContentEditable className="markdown-editor-input markdown-code-input" />
          }
          placeholder={
            <div className="markdown-editor-placeholder">Enter markdown...</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
        <CodeContentSyncPlugin content={initialContent} />
      </div>
    </LexicalComposer>
  );
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialContent,
  viewMode,
  onChange,
}) => {
  // Use key to force remount when switching views, ensuring fresh editor state
  if (viewMode === "code") {
    return (
      <CodeEditor
        key="code"
        initialContent={initialContent}
        onChange={onChange}
      />
    );
  }

  return (
    <RenderedEditor
      key="rendered"
      initialContent={initialContent}
      onChange={onChange}
    />
  );
};

export default MarkdownEditor;
