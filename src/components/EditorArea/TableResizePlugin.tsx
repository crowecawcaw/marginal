import { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNodeByKey,
  $isElementNode,
} from "lexical";
import {
  $isTableNode,
  $insertTableRow__EXPERIMENTAL,
  $insertTableColumn__EXPERIMENTAL,
  TableNode,
} from "@lexical/table";
import "./TableResizePlugin.css";

interface ResizeState {
  tableKey: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  originalRows: number;
  originalCols: number;
  cellWidth: number;
  cellHeight: number;
  mode: "rows" | "columns";
}

export function TableResizePlugin() {
  const [editor] = useLexicalComposerContext();
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    // Handle mouse events on table hover
    const handleTableMouseEnter = (_e: MouseEvent) => {
      // Reserved for future hover effects
    };

    const handleTableMouseLeave = (_e: MouseEvent) => {
      // Reserved for future hover effects
    };

    const setupHandles = () => {
      // Find all table elements and add resize handles
      const tables = editorElement.querySelectorAll(".editor-table");

      tables.forEach((tableElement) => {
        // Check if handles already exist
        if (tableElement.querySelector(".table-resize-handle-bottom")) return;

        // Create bottom handle for adding rows
        const bottomHandle = document.createElement("div");
        bottomHandle.className = "table-resize-handle-bottom";
        bottomHandle.setAttribute("data-resize-direction", "rows");
        tableElement.appendChild(bottomHandle);

        // Create right handle for adding columns
        const rightHandle = document.createElement("div");
        rightHandle.className = "table-resize-handle-right";
        rightHandle.setAttribute("data-resize-direction", "columns");
        tableElement.appendChild(rightHandle);

        // Handler for both handles
        const handleMouseDown = (e: MouseEvent, mode: "rows" | "columns") => {
          e.preventDefault();
          e.stopPropagation();

          // Find the table node in Lexical
          editor.getEditorState().read(() => {
            const findTableNode = (): TableNode | null => {
              // Get all table nodes and find the one that matches
              const allNodes = editor.getEditorState()._nodeMap;
              for (const [key, node] of allNodes) {
                if ($isTableNode(node)) {
                  const domNode = editor.getElementByKey(key);
                  if (domNode === tableElement) {
                    return node as TableNode;
                  }
                }
              }
              return null;
            };

            const tableNode = findTableNode();
            if (!tableNode) return;

            const rows = tableNode.getChildren();
            const firstRow = rows[0];
            const cols = $isElementNode(firstRow) ? firstRow.getChildren() : [];

            // Get cell dimensions from first cell
            const firstCell = tableElement.querySelector(".editor-table-cell, .editor-table-cell-header") as HTMLElement;
            const cellWidth = firstCell?.offsetWidth || 100;
            const cellHeight = firstCell?.offsetHeight || 40;

            setResizeState({
              tableKey: tableNode.getKey(),
              startX: e.clientX,
              startY: e.clientY,
              currentX: e.clientX,
              currentY: e.clientY,
              originalRows: rows.length,
              originalCols: cols.length,
              cellWidth,
              cellHeight,
              mode,
            });
          });
        };

        // Attach event listeners
        bottomHandle.addEventListener("mousedown", (e) => handleMouseDown(e, "rows"));
        rightHandle.addEventListener("mousedown", (e) => handleMouseDown(e, "columns"));
      });
    };

    // Setup handles initially
    setupHandles();

    // Add event listeners for hover effects
    editorElement.addEventListener("mouseenter", handleTableMouseEnter, true);
    editorElement.addEventListener("mouseleave", handleTableMouseLeave, true);

    // Watch for DOM changes to add handles to new tables
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      // Debounce to prevent infinite loops
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setupHandles();
      }, 50);
    });

    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      attributes: false, // Don't watch attribute changes
      characterData: false, // Don't watch text changes
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
      editorElement.removeEventListener("mouseenter", handleTableMouseEnter, true);
      editorElement.removeEventListener("mouseleave", handleTableMouseLeave, true);
    };
  }, [editor]);

  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      setResizeState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY,
        };
      });
    };

    const handleMouseUp = () => {
      if (!resizeState) return;

      const deltaX = resizeState.currentX - resizeState.startX;
      const deltaY = resizeState.currentY - resizeState.startY;

      // Calculate number of rows/columns to add based on mode
      let newCols = 0;
      let newRows = 0;

      if (resizeState.mode === "columns") {
        newCols = Math.max(0, Math.floor(deltaX / resizeState.cellWidth));
      } else {
        newRows = Math.max(0, Math.floor(deltaY / resizeState.cellHeight));
      }

      // Add rows or columns
      if (newRows > 0 || newCols > 0) {
        editor.update(() => {
          const tableNode = $getNodeByKey(resizeState.tableKey);
          if (!$isTableNode(tableNode)) return;

          // Add columns
          for (let i = 0; i < newCols; i++) {
            $insertTableColumn__EXPERIMENTAL();
          }

          // Add rows
          for (let i = 0; i < newRows; i++) {
            $insertTableRow__EXPERIMENTAL();
          }
        });
      }

      setResizeState(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeState, editor]);

  // Render preview overlay
  if (!resizeState) return null;

  const deltaX = resizeState.currentX - resizeState.startX;
  const deltaY = resizeState.currentY - resizeState.startY;

  // Calculate based on mode
  let newCols = 0;
  let newRows = 0;

  if (resizeState.mode === "columns") {
    newCols = Math.max(0, Math.floor(deltaX / resizeState.cellWidth));
  } else {
    newRows = Math.max(0, Math.floor(deltaY / resizeState.cellHeight));
  }

  if (newRows === 0 && newCols === 0) return null;

  return (
    <div className="table-resize-preview">
      {newRows > 0 && (
        <div className="table-resize-preview-text">
          +{newRows} row{newRows > 1 ? "s" : ""}
        </div>
      )}
      {newCols > 0 && (
        <div className="table-resize-preview-text">
          +{newCols} column{newCols > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
