import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
} from "lexical";
import { useEventListeners } from "../../../platform/useEventListener";

/**
 * Plugin to handle formatting in code view by wrapping text with markdown syntax
 * - Cmd+B: Wraps selected text with ** ** (bold)
 * - Cmd+I: Wraps selected text with * * (italic)
 * - Cmd+1-5: Adds # headers to the current line
 * - Cmd+Shift+T: Inserts a markdown table
 */
export function CodeViewFormattingPlugin() {
  const [editor] = useLexicalComposerContext();

  const wrapSelection = (prefix: string, suffix: string = prefix) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const selectedText = selection.getTextContent();
      const wrappedText = `${prefix}${selectedText}${suffix}`;

      selection.insertNodes([$createTextNode(wrappedText)]);
    });
  };

  const addHeading = (level: 1 | 2 | 3 | 4 | 5) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const anchor = selection.anchor.getNode();
      const text = anchor.getTextContent();
      const offset = selection.anchor.offset;

      // Find the start of the current line
      const beforeCursor = text.substring(0, offset);
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;

      // Get the current line text
      const afterLineStart = text.substring(lineStart);
      const lineEnd = afterLineStart.indexOf('\n');
      const currentLine = lineEnd === -1 ? afterLineStart : afterLineStart.substring(0, lineEnd);

      // Remove existing heading markers if present
      const cleanLine = currentLine.replace(/^#+\s*/, '');

      // Create new heading
      const headingPrefix = '#'.repeat(level) + ' ';
      const newLine = headingPrefix + cleanLine;

      // Replace the line
      const beforeLine = text.substring(0, lineStart);
      const afterLine = lineEnd === -1 ? '' : text.substring(lineStart + lineEnd);
      const newText = beforeLine + newLine + afterLine;

      // Replace entire node text
      anchor.setTextContent(newText);

      // Move cursor to the end of the heading prefix
      const newOffset = lineStart + headingPrefix.length;
      selection.anchor.set(anchor.getKey(), newOffset, 'text');
      selection.focus.set(anchor.getKey(), newOffset, 'text');
    });
  };

  const insertTable = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      // Default 3x3 table template
      const tableTemplate = `
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

`;

      selection.insertNodes([$createTextNode(tableTemplate)]);
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { metaKey, ctrlKey, shiftKey, key } = event;
      const modKey = metaKey || ctrlKey;

      if (!modKey) return;

      // Cmd+B - Toggle bold
      if (key === "b" && !shiftKey) {
        event.preventDefault();
        wrapSelection("**");
        return;
      }

      // Cmd+I - Toggle italic
      if (key === "i" && !shiftKey) {
        event.preventDefault();
        wrapSelection("*");
        return;
      }

      // Cmd+1 through Cmd+5 - Headings
      if (["1", "2", "3", "4", "5"].includes(key) && !shiftKey) {
        event.preventDefault();
        const headingLevel = parseInt(key, 10) as 1 | 2 | 3 | 4 | 5;
        addHeading(headingLevel);
        return;
      }

      // Cmd+Shift+T - Insert table
      if (key === "T" && shiftKey) {
        event.preventDefault();
        insertTable();
        return;
      }
    };

    // Attach to the editor's root element
    const rootElement = editor.getRootElement();
    if (rootElement) {
      rootElement.addEventListener("keydown", handleKeyDown);
      return () => {
        rootElement.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [editor]);

  // Listen for menu events to dispatch formatting commands
  useEventListeners([
    { event: "menu:bold", callback: () => wrapSelection("**") },
    { event: "menu:italic", callback: () => wrapSelection("*") },
    { event: "menu:heading-1", callback: () => addHeading(1) },
    { event: "menu:heading-2", callback: () => addHeading(2) },
    { event: "menu:heading-3", callback: () => addHeading(3) },
    { event: "menu:heading-4", callback: () => addHeading(4) },
    { event: "menu:heading-5", callback: () => addHeading(5) },
    { event: "menu:insert-table", callback: () => insertTable() },
  ], [editor]);

  return null;
}
