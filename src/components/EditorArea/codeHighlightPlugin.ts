import { $prose } from "@milkdown/kit/utils";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
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

export const codeHighlightPlugin = $prose(() => {
  return new Plugin({
    key: highlightKey,
    view(editorView) {
      const highlight = () => {
        const codeBlocks = editorView.dom.querySelectorAll("pre code");
        codeBlocks.forEach((block) => {
          const el = block as HTMLElement;
          if (el.dataset.highlighted === "yes") return;
          const lang =
            el.getAttribute("data-language") ||
            el.className.match(/language-(\w+)/)?.[1];
          if (lang && hljs.getLanguage(lang)) {
            el.innerHTML = hljs.highlight(el.textContent || "", {
              language: lang,
            }).value;
          }
          el.dataset.highlighted = "yes";
        });
      };
      setTimeout(highlight, 0);
      return {
        update() {
          editorView.dom.querySelectorAll("pre code").forEach((el) => {
            delete (el as HTMLElement).dataset.highlighted;
          });
          setTimeout(highlight, 0);
        },
      };
    },
  });
});
