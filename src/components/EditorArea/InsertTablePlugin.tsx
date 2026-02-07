import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTableNode,
  $createTableRowNode,
  $createTableCellNode,
  TableCellHeaderStates,
} from "@lexical/table";
import { $getSelection, $isRangeSelection, $createParagraphNode } from "lexical";
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

      // Insert table at current selection
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getTopLevelElement();
      if (element) {
        element.insertAfter(table);
      } else {
        selection.insertNodes([table]);
      }
    });
  }, [editor]);

  return null;
}
