import React, { useEffect, useCallback } from "react";
import "./ConfirmDialog.css";

export type ConfirmResult = "save" | "discard" | "cancel";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onResult: (result: ConfirmResult) => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onResult,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onResult("cancel");
      }
    },
    [isOpen, onResult],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={() => onResult("cancel")}>
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h2>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-buttons">
          <button
            className="confirm-dialog-btn confirm-dialog-btn-secondary"
            onClick={() => onResult("discard")}
          >
            Don't Save
          </button>
          <button
            className="confirm-dialog-btn confirm-dialog-btn-secondary"
            onClick={() => onResult("cancel")}
          >
            Cancel
          </button>
          <button
            className="confirm-dialog-btn confirm-dialog-btn-primary"
            onClick={() => onResult("save")}
            autoFocus
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
