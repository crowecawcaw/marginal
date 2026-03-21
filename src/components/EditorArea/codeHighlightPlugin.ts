import { $prose } from "@milkdown/kit/utils";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "prosemirror-view";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import xml from "highlight.js/lib/languages/xml";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import sql from "highlight.js/lib/languages/sql";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("sql", sql);

const highlightKey = new PluginKey("code-highlight");

interface HljsToken {
  scope?: string;
  children: (string | HljsToken)[];
}

export function flattenTokens(
  nodes: (string | HljsToken)[],
  offset: number,
  result: { from: number; to: number; class: string }[]
): number {
  let pos = offset;
  for (const node of nodes) {
    if (typeof node === "string") {
      pos += node.length;
    } else {
      const start = pos;
      pos = flattenTokens(node.children, pos, result);
      if (node.scope) {
        result.push({ from: start, to: pos, class: `hljs-${node.scope}` });
      }
    }
  }
  return pos;
}

export function buildDecorations(doc: any): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node: any, pos: number) => {
    if (node.type.name !== "code_block") return;

    const lang = node.attrs.language;
    if (!lang || !hljs.getLanguage(lang)) return;

    const code = node.textContent;
    if (!code) return;

    const result = hljs.highlight(code, { language: lang });
    const emitter = result._emitter as any;
    const rootChildren: (string | HljsToken)[] =
      emitter?.rootNode?.children ?? [];

    const tokens: { from: number; to: number; class: string }[] = [];
    flattenTokens(rootChildren, 0, tokens);

    // code_block content starts at pos + 1 (after the opening of the node)
    const contentStart = pos + 1;

    for (const token of tokens) {
      if (token.from === token.to) continue;
      decorations.push(
        Decoration.inline(contentStart + token.from, contentStart + token.to, {
          class: token.class,
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const codeHighlightPlugin = $prose(() => {
  return new Plugin({
    key: highlightKey,
    state: {
      init(_, state) {
        return buildDecorations(state.doc);
      },
      apply(tr, oldDecorations, _oldState, newState) {
        if (tr.docChanged) {
          return buildDecorations(newState.doc);
        }
        return oldDecorations;
      },
    },
    props: {
      decorations(state) {
        return highlightKey.getState(state);
      },
    },
  });
});
