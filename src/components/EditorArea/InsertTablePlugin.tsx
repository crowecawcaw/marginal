import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTableNode,
  $createTableRowNode,
  $createTableCellNode,
  $isTableNode,
  TableCellHeaderStates,
} from "@lexical/table";
import { $getSelection, $isRangeSelection, $createParagraphNode, type LexicalNode } from "lexical";
import { useEventListener } from "../../platform/useEventListener";

export function InsertTablePlugin() {
  const [editor] = useLexicalComposerContext();

  useEventListener("menu:insert-table", () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      // Create a 3x3 table (default size)
      const table = $createTableNode();

      // Create header row
      const headerRow = $createTableRowNode();
      for (let col = 0; col < 3; col++) {
        const cell = $createTableCellNode(TableCellHeaderStates.ROW);
        const paragraph = $createParagraphNode();
        cell.append(paragraph);
        headerRow.append(cell);
      }
      table.append(headerRow);

      // Create data rows
      for (let row = 0; row < 2; row++) {
        const tableRow = $createTableRowNode();
        for (let col = 0; col < 3; col++) {
          const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
          const paragraph = $createParagraphNode();
          cell.append(paragraph);
          tableRow.append(cell);
        }
        table.append(tableRow);
      }

      // Insert table at current selection.
      // If the cursor is inside a table cell, getTopLevelElement() returns
      // the element within the cell (shadow root), not the TableNode itself.
      // Walk up to find any enclosing TableNode so the new table is placed
      // after it rather than nested inside.
      const anchorNode = selection.anchor.getNode();
      let insertionPoint: LexicalNode | null = anchorNode.getTopLevelElement();

      let node: LexicalNode | null = anchorNode;
      while (node !== null) {
        if ($isTableNode(node)) {
          insertionPoint = node;
          break;
        }
        node = node.getParent();
      }

      if (insertionPoint) {
        insertionPoint.insertAfter(table);
      } else {
        selection.insertNodes([table]);
      }
    });
  }, [editor]);

  return null;
}
