import { useState, useEffect, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import {
  $isTableCellNode,
  $isTableNode,
  TableCellNode,
  $insertTableColumn__EXPERIMENTAL,
  $insertTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
} from "@lexical/table";
import { TableContextMenu } from "./TableContextMenu";

export function TableContextMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    cellNode: TableCellNode;
  } | null>(null);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if we're in a table cell
      const tableCell = target.closest(".editor-table-cell, .editor-table-cell-header");
      if (!tableCell) {
        setContextMenu(null);
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // Find the cell node in Lexical
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const anchorNode = selection.anchor.getNode();
        let cellNode = anchorNode;

        // Traverse up to find the table cell node
        while (cellNode && !$isTableCellNode(cellNode)) {
          const parent = cellNode.getParent();
          if (!parent) break;
          cellNode = parent;
        }

        if ($isTableCellNode(cellNode)) {
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            cellNode: cellNode as TableCellNode,
          });
        }
      });
    };

    const editorElement = editor.getRootElement();
    if (editorElement) {
      editorElement.addEventListener("contextmenu", handleContextMenu);
      return () => {
        editorElement.removeEventListener("contextmenu", handleContextMenu);
      };
    }
  }, [editor]);

  const handleClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleAddRowAbove = useCallback(() => {
    if (!contextMenu) return;

    editor.update(() => {
      const cellNode = $getNodeByKey(contextMenu.cellNode.getKey());
      if (!$isTableCellNode(cellNode)) return;

      const tableNode = cellNode.getParent()?.getParent();
      if (!$isTableNode(tableNode)) return;

      $insertTableRow__EXPERIMENTAL();
    });
  }, [contextMenu, editor]);

  const handleAddRowBelow = useCallback(() => {
    if (!contextMenu) return;

    editor.update(() => {
      const cellNode = $getNodeByKey(contextMenu.cellNode.getKey());
      if (!$isTableCellNode(cellNode)) return;

      const tableNode = cellNode.getParent()?.getParent();
      if (!$isTableNode(tableNode)) return;

      $insertTableRow__EXPERIMENTAL();
    });
  }, [contextMenu, editor]);

  const handleAddColumnLeft = useCallback(() => {
    if (!contextMenu) return;

    editor.update(() => {
      const cellNode = $getNodeByKey(contextMenu.cellNode.getKey());
      if (!$isTableCellNode(cellNode)) return;

      const tableNode = cellNode.getParent()?.getParent();
      if (!$isTableNode(tableNode)) return;

      $insertTableColumn__EXPERIMENTAL();
    });
  }, [contextMenu, editor]);

  const handleAddColumnRight = useCallback(() => {
    if (!contextMenu) return;

    editor.update(() => {
      const cellNode = $getNodeByKey(contextMenu.cellNode.getKey());
      if (!$isTableCellNode(cellNode)) return;

      const tableNode = cellNode.getParent()?.getParent();
      if (!$isTableNode(tableNode)) return;

      $insertTableColumn__EXPERIMENTAL();
    });
  }, [contextMenu, editor]);

  const handleDeleteRow = useCallback(() => {
    if (!contextMenu) return;

    editor.update(() => {
      const cellNode = $getNodeByKey(contextMenu.cellNode.getKey());
      if (!$isTableCellNode(cellNode)) return;

      const tableNode = cellNode.getParent()?.getParent();
      if (!$isTableNode(tableNode)) return;

      $deleteTableRow__EXPERIMENTAL();
    });
  }, [contextMenu, editor]);

  const handleDeleteColumn = useCallback(() => {
    if (!contextMenu) return;

    editor.update(() => {
      const cellNode = $getNodeByKey(contextMenu.cellNode.getKey());
      if (!$isTableCellNode(cellNode)) return;

      const tableNode = cellNode.getParent()?.getParent();
      if (!$isTableNode(tableNode)) return;

      $deleteTableColumn__EXPERIMENTAL();
    });
  }, [contextMenu, editor]);

  const handleDeleteTable = useCallback(() => {
    if (!contextMenu) return;

    editor.update(() => {
      const cellNode = $getNodeByKey(contextMenu.cellNode.getKey());
      if (!$isTableCellNode(cellNode)) return;

      const tableNode = cellNode.getParent()?.getParent();
      if (!$isTableNode(tableNode)) return;

      tableNode.remove();
    });
  }, [contextMenu, editor]);

  if (!contextMenu) return null;

  return (
    <TableContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      onClose={handleClose}
      onAddRowAbove={handleAddRowAbove}
      onAddRowBelow={handleAddRowBelow}
      onAddColumnLeft={handleAddColumnLeft}
      onAddColumnRight={handleAddColumnRight}
      onDeleteRow={handleDeleteRow}
      onDeleteColumn={handleDeleteColumn}
      onDeleteTable={handleDeleteTable}
    />
  );
}
