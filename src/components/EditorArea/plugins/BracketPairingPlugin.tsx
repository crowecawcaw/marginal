import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from "lexical";

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
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.key === "[") {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          event.preventDefault();
          selection.insertRawText("[]");
          selection.anchor.offset -= 1;
          selection.focus.offset = selection.anchor.offset;
          return true;
        }

        if (event.key === "]" || event.key === ")") {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed())
            return false;
          const anchorNode = selection.anchor.getNode();
          const text = anchorNode.getTextContent();
          const offset = selection.anchor.offset;
          if (offset < text.length && text[offset] === event.key) {
            event.preventDefault();
            // Select the next character and replace with itself to move
            // cursor past it. A plain offset change doesn't persist across
            // Lexical update boundaries because no text mutation occurs.
            selection.focus.offset = offset + 1;
            selection.insertRawText(event.key);
            return true;
          }
          return false;
        }

        if (event.key === "(") {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed())
            return false;
          const anchorNode = selection.anchor.getNode();
          const text = anchorNode.getTextContent();
          const offset = selection.anchor.offset;
          if (offset > 0 && text[offset - 1] === "]") {
            event.preventDefault();
            selection.insertRawText("()");
            selection.anchor.offset -= 1;
            selection.focus.offset = selection.anchor.offset;
            return true;
          }
          return false;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
