import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $isParagraphNode,
  $isTextNode,
} from "lexical";
import { $createCodeNode } from "@lexical/code";

const CODE_BLOCK_REGEX = /^```(\w*)$/;

/**
 * Plugin that converts ``` to a code block immediately (without requiring
 * a trailing space), which Lexical's built-in MarkdownShortcutPlugin does not do.
 */
export function CodeBlockShortcutPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ tags }) => {
      // Only respond to user-initiated text changes
      if (tags.has("historic") || tags.has("collaboration")) {
        return;
      }

      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return;
        }

        const anchorNode = selection.anchor.getNode();
        if (!$isTextNode(anchorNode)) {
          return;
        }

        const parentNode = anchorNode.getParent();
        if (!$isParagraphNode(parentNode)) {
          return;
        }

        // Only match if this is the sole text node in the paragraph
        if (parentNode.getChildrenSize() !== 1) {
          return;
        }

        const text = anchorNode.getTextContent();
        const match = CODE_BLOCK_REGEX.exec(text);
        if (!match) {
          return;
        }

        const language = match[1] || undefined;
        const codeNode = $createCodeNode(language);
        parentNode.replace(codeNode);
        codeNode.selectStart();
      });
    });
  }, [editor]);

  return null;
}
