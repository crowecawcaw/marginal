import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";

/**
 * Plugin to auto-close brackets and parentheses in code view.
 * - Typing `[` inserts `[]` with cursor between
 * - Typing `(` inserts `()` with cursor between, but only after `]`
 *
 * - Typing `]` when the next character is `]` skips over it (overtype)
 * - Typing `)` when the next character is `)` skips over it (overtype)
 *
 * This supports markdown link syntax: [text](url)
 */
export function BracketPairingPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "[") {
        event.preventDefault();
        editor.update(
          () => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            selection.insertRawText("[]");
            // Move cursor back between the brackets
            selection.anchor.offset -= 1;
            selection.focus.offset = selection.anchor.offset;
          },
          { discrete: true },
        );
        return;
      }

      if (event.key === "]" || event.key === ")") {
        // Overtype: if next char matches, skip over it instead of inserting
        let shouldSkip = false;
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
          const anchorNode = selection.anchor.getNode();
          const text = anchorNode.getTextContent();
          const offset = selection.anchor.offset;
          if (offset < text.length && text[offset] === event.key) {
            shouldSkip = true;
          }
        });

        if (shouldSkip) {
          event.preventDefault();
          editor.update(
            () => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              selection.anchor.offset += 1;
              selection.focus.offset = selection.anchor.offset;
            },
            { discrete: true },
          );
          return;
        }
      }

      if (event.key === "(") {
        // Only auto-close if character before cursor is `]`
        let shouldPair = false;
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
          const anchorNode = selection.anchor.getNode();
          const text = anchorNode.getTextContent();
          const offset = selection.anchor.offset;
          if (offset > 0 && text[offset - 1] === "]") {
            shouldPair = true;
          }
        });

        if (shouldPair) {
          event.preventDefault();
          editor.update(
            () => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              selection.insertRawText("()");
              selection.anchor.offset -= 1;
              selection.focus.offset = selection.anchor.offset;
            },
            { discrete: true },
          );
        }
      }
    };

    const rootElement = editor.getRootElement();
    if (rootElement) {
      rootElement.addEventListener("keydown", handleKeyDown);
      return () => {
        rootElement.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [editor]);

  return null;
}
