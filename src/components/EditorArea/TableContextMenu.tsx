import { useEffect, useRef } from "react";
import "./TableContextMenu.css";

export interface TableContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddRowAbove: () => void;
  onAddRowBelow: () => void;
  onAddColumnLeft: () => void;
  onAddColumnRight: () => void;
  onDeleteRow: () => void;
  onDeleteColumn: () => void;
  onDeleteTable: () => void;
}

export function TableContextMenu({
  x,
  y,
  onClose,
  onAddRowAbove,
  onAddRowBelow,
  onAddColumnLeft,
  onAddColumnRight,
  onDeleteRow,
  onDeleteColumn,
  onDeleteTable,
}: TableContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="table-context-menu"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="table-context-menu-section">
        <button
          className="table-context-menu-item"
          onClick={() => handleAction(onAddRowAbove)}
        >
          Add Row Above
        </button>
        <button
          className="table-context-menu-item"
          onClick={() => handleAction(onAddRowBelow)}
        >
          Add Row Below
        </button>
      </div>
      <div className="table-context-menu-divider" />
      <div className="table-context-menu-section">
        <button
          className="table-context-menu-item"
          onClick={() => handleAction(onAddColumnLeft)}
        >
          Add Column Left
        </button>
        <button
          className="table-context-menu-item"
          onClick={() => handleAction(onAddColumnRight)}
        >
          Add Column Right
        </button>
      </div>
      <div className="table-context-menu-divider" />
      <div className="table-context-menu-section">
        <button
          className="table-context-menu-item table-context-menu-item-danger"
          onClick={() => handleAction(onDeleteRow)}
        >
          Delete Row
        </button>
        <button
          className="table-context-menu-item table-context-menu-item-danger"
          onClick={() => handleAction(onDeleteColumn)}
        >
          Delete Column
        </button>
      </div>
      <div className="table-context-menu-divider" />
      <div className="table-context-menu-section">
        <button
          className="table-context-menu-item table-context-menu-item-danger"
          onClick={() => handleAction(onDeleteTable)}
        >
          Delete Table
        </button>
      </div>
    </div>
  );
}
