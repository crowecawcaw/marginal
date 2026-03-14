import React, { useEffect, useCallback } from "react";
import "./OverwriteConfirmDialog.css";

interface OverwriteConfirmDialogProps {
  isOpen: boolean;
  fileName: string;
  onOverwrite: () => void;
  onCancel: () => void;
}

const OverwriteConfirmDialog: React.FC<OverwriteConfirmDialogProps> = ({
  isOpen,
  fileName,
  onOverwrite,
  onCancel,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [isOpen, onCancel],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="overwrite-overlay" onClick={onCancel}>
      <div
        className="overwrite-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="overwrite-title"
      >
        <h2 id="overwrite-title" className="overwrite-title">
          Overwrite External Changes?
        </h2>
        <p className="overwrite-message">
          <strong>{fileName}</strong> was modified on disk after you chose to
          ignore the external change. Saving will overwrite those disk changes.
        </p>
        <div className="overwrite-actions">
          <button
            className="overwrite-btn overwrite-btn-overwrite"
            onClick={onOverwrite}
          >
            Overwrite
          </button>
          <button className="overwrite-btn overwrite-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverwriteConfirmDialog;
