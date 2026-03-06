import React, { useEffect, useRef } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { EditorView as CMEditorView } from "@codemirror/view";
import { EditorState as CMEditorState } from "@codemirror/state";
import { markdown as cmMarkdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, historyKeymap, history as cmHistory, indentWithTab } from "@codemirror/commands";
import { keymap } from "@codemirror/view";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { indentOnInput } from "@codemirror/language";
import "./MarkdownEditor.css";

interface MarkdownEditorProps {
  initialContent: string;
  viewMode: "rendered" | "code";
  zoom?: number;
  onChange: (content: string) => void;
}

// Rendered view editor (WYSIWYG markdown via Milkdown)
function RenderedEditor({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (content: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const milkdownRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editorRef.current) return;

    let destroyed = false;
    const el = editorRef.current;

    const create = async () => {
      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, el);
          ctx.set(defaultValueCtx, initialContent);
          ctx.get(listenerCtx).markdownUpdated((_ctx, md) => {
            if (!destroyed) {
              onChangeRef.current(md);
            }
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener)
        .create();

      if (destroyed) {
        editor.destroy();
        return;
      }

      milkdownRef.current = editor;
    };

    create();

    return () => {
      destroyed = true;
      milkdownRef.current?.destroy();
      milkdownRef.current = null;
    };
  }, [initialContent]);

  return (
    <div className="markdown-editor-container">
      <div
        ref={editorRef}
        className="markdown-editor-input milkdown-editor"
      />
    </div>
  );
}

// Code view editor (plain text markdown source via CodeMirror 6)
function CodeEditor({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (content: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const cmRef = useRef<CMEditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editorRef.current) return;

    const state = CMEditorState.create({
      doc: initialContent,
      extensions: [
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        cmHistory(),
        closeBrackets(),
        indentOnInput(),
        cmMarkdown({ codeLanguages: languages }),
        CMEditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        CMEditorView.contentAttributes.of({
          "autocorrect": "off",
          "autocapitalize": "off",
          "spellcheck": "false",
        }),
      ],
    });

    const view = new CMEditorView({
      state,
      parent: editorRef.current,
    });

    cmRef.current = view;

    return () => {
      view.destroy();
      cmRef.current = null;
    };
  }, [initialContent]);

  return (
    <div className="markdown-editor-container markdown-code-view">
      <div
        ref={editorRef}
        className="markdown-code-input"
      />
    </div>
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
