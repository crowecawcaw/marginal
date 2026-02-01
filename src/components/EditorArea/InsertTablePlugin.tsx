import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTableNode,
  $createTableRowNode,
  $createTableCellNode,
  TableCellHeaderStates,
} from "@lexical/table";
import { $getSelection, $isRangeSelection, $createParagraphNode } from "lexical";
import { listen } from "@tauri-apps/api/event";

export function InsertTablePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Check if we're in Tauri environment
    if (typeof window !== "undefined" && "__TAURI__" in window) {
      const unlisten = listen("menu:insert-table", () => {
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
      });

      return () => {
        unlisten.then((fn) => fn());
      };
    }
  }, [editor]);

  return null;
}
