import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  $isTextNode,
} from "lexical";
import { useEventListeners } from "../../../platform/useEventListener";

/**
 * Toggle markdown format markers around the current selection.
 * Must be called inside an editor.update() callback.
 *
 * Uses star-counting to correctly handle overlapping bold (**) and italic (*):
 *   1 star = italic, 2 stars = bold, 3 stars = bold+italic
 */
export function $toggleFormat(prefix: string, suffix: string = prefix) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  const selectedText = selection.getTextContent();
  const anchor = selection.anchor.getNode();
  if (!$isTextNode(anchor)) return;

  const fullText = anchor.getTextContent();
  const start = Math.min(selection.anchor.offset, selection.focus.offset);
  const end = Math.max(selection.anchor.offset, selection.focus.offset);
  const markerChar = prefix[0];
  const markerLen = prefix.length;

  // Count consecutive marker chars outside the selection
  let outerBefore = 0;
  for (let i = start - 1; i >= 0 && fullText[i] === markerChar; i--) outerBefore++;
  let outerAfter = 0;
  for (let i = end; i < fullText.length && fullText[i] === markerChar; i++) outerAfter++;

  // Count leading/trailing marker chars inside the selection
  let innerBefore = 0;
  for (let i = 0; i < selectedText.length && selectedText[i] === markerChar; i++) innerBefore++;
  let innerAfter = 0;
  for (let i = selectedText.length - 1; i >= innerBefore && selectedText[i] === markerChar; i--) innerAfter++;

  const totalBefore = outerBefore + innerBefore;
  const totalAfter = outerAfter + innerAfter;

  // Bold (markerLen=2): present when total stars >= 2
  // Italic (markerLen=1): present when total stars is odd
  const isPresent = markerLen === 1
    ? totalBefore % 2 === 1 && totalAfter % 2 === 1
    : totalBefore >= markerLen && totalAfter >= markerLen;

  if (isPresent) {
    // Remove markers: take markerLen stars, preferring inner then outer
    const removeInnerBefore = Math.min(innerBefore, markerLen);
    const removeOuterBefore = markerLen - removeInnerBefore;
    const removeInnerAfter = Math.min(innerAfter, markerLen);
    const removeOuterAfter = markerLen - removeInnerAfter;

    const trimmedStart = start - removeOuterBefore;
    const trimmedEnd = end + removeOuterAfter;
    const innerText = selectedText.substring(removeInnerBefore, selectedText.length - removeInnerAfter);

    const newText = fullText.substring(0, trimmedStart) + innerText + fullText.substring(trimmedEnd);
    anchor.setTextContent(newText);
    selection.anchor.set(anchor.getKey(), trimmedStart, 'text');
    selection.focus.set(anchor.getKey(), trimmedStart + innerText.length, 'text');
  } else {
    // Add markers and preserve selection on the inner text
    const wrappedText = `${prefix}${selectedText}${suffix}`;
    const newText = fullText.substring(0, start) + wrappedText + fullText.substring(end);
    anchor.setTextContent(newText);
    const newStart = start + prefix.length;
    const newEnd = newStart + selectedText.length;
    selection.anchor.set(anchor.getKey(), newStart, 'text');
    selection.focus.set(anchor.getKey(), newEnd, 'text');
  }
}

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
      $toggleFormat(prefix, suffix);
    });
  };

  const addHeading = (level: 1 | 2 | 3 | 4 | 5) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const anchor = selection.anchor.getNode();
      if (!$isTextNode(anchor)) return;

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

      const anchor = selection.anchor.getNode();
      if (!$isTextNode(anchor)) return;

      const text = anchor.getTextContent();
      const offset = selection.anchor.offset;

      // Default 3x3 table template
      const tableTemplate = `
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

`;

      // Check if cursor is inside an existing table
      const lines = text.split('\n');
      let currentLineIndex = 0;
      let charCount = 0;

      // Find which line the cursor is on
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for newline
        if (charCount + lineLength > offset) {
          currentLineIndex = i;
          break;
        }
        charCount += lineLength;
      }

      // Check if current line is part of a table (starts with | or is a separator line)
      const currentLine = lines[currentLineIndex];
      const isInTable = currentLine && (
        currentLine.trimStart().startsWith('|') ||
        /^\s*\|[\s\-:|]+\|\s*$/.test(currentLine)
      );

      if (isInTable) {
        // Find the end of the current table
        let tableEndLine = currentLineIndex;
        for (let i = currentLineIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.trimStart().startsWith('|') || /^\s*\|[\s\-:|]+\|\s*$/.test(line)) {
            tableEndLine = i;
          } else {
            break;
          }
        }

        // Calculate the position after the table
        let insertPosition = 0;
        for (let i = 0; i <= tableEndLine; i++) {
          insertPosition += lines[i].length + 1; // +1 for newline
        }

        // Insert table after the existing table
        const beforeTable = text.substring(0, insertPosition);
        const afterTable = text.substring(insertPosition);
        const newText = beforeTable + tableTemplate + afterTable;

        anchor.setTextContent(newText);
      } else {
        // Not in a table, insert at cursor position
        selection.insertNodes([$createTextNode(tableTemplate)]);
      }
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
