import React, { useEffect, useRef } from "react";
import { Editor, rootCtx, defaultValueCtx, commandsCtx } from "@milkdown/kit/core";
import { commonmark, wrapInHeadingCommand } from "@milkdown/kit/preset/commonmark";
import { gfm, insertTableCommand } from "@milkdown/kit/preset/gfm";
import { useEventListener } from "../../platform/useEventListener";
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

// Milkdown GFM serializes empty cells as `<br />` and always emits colon
// alignment markers (e.g. `:----- `). Clean both so the stored markdown is
// plain and round-trips cleanly.
function cleanTableMarkdown(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      if (!line.trimStart().startsWith("|")) return line;
      // Separator row: only pipes, dashes, colons, spaces
      if (/^\s*\|[\s\-:|]+\|\s*$/.test(line)) {
        return line.replace(/:?-+:?/g, (m) => "-".repeat(m.replace(/:/g, "").length || m.length));
      }
      // Data row: strip <br /> from cells
      return line.replace(/<br\s*\/?>/g, "");
    })
    .join("\n");
}

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
              onChangeRef.current(cleanTableMarkdown(md));
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initialContent is used only for init; the component remounts via key when content source changes

  useEventListener("menu:insert-table", () => {
    milkdownRef.current?.action((ctx) => {
      ctx.get(commandsCtx).call(insertTableCommand.key);
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && /^[1-6]$/.test(e.key)) {
      const level = parseInt(e.key);
      milkdownRef.current?.action((ctx) => {
        ctx.get(commandsCtx).call(wrapInHeadingCommand.key, level);
      });
      e.preventDefault();
    }
  };

  return (
    <div className="markdown-editor-container" onKeyDown={handleKeyDown}>
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
        keymap.of([...closeBracketsKeymap, ...defaultKeymap.filter(b => b.key !== "Mod-/"), ...historyKeymap, indentWithTab]),
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initialContent is used only for init; the component remounts via key when content source changes

  const TABLE_TEMPLATE = "\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n|          |          |          |\n";

  useEventListener("menu:insert-table", () => {
    const view = cmRef.current;
    if (!view) return;
    const { from } = view.state.selection.main;
    view.dispatch({ changes: { from, to: from, insert: TABLE_TEMPLATE } });
  }, []);

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
