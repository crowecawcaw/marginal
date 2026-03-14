import React, { useEffect, useCallback } from "react";
import "./ExternalChangeDialog.css";

interface ExternalChangeDialogProps {
  isOpen: boolean;
  fileName: string;
  canMerge: boolean;
  onMerge: () => void;
  onUpdate: () => void;
  onIgnore: () => void;
}

const ExternalChangeDialog: React.FC<ExternalChangeDialogProps> = ({
  isOpen,
  fileName,
  canMerge,
  onMerge,
  onUpdate,
  onIgnore,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onIgnore();
      }
    },
    [isOpen, onIgnore],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="ext-change-overlay" onClick={onIgnore}>
      <div
        className="ext-change-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ext-change-title"
      >
        <h2 id="ext-change-title" className="ext-change-title">
          File Changed on Disk
        </h2>
        <p className="ext-change-message">
          <strong>{fileName}</strong> has been modified by another application.
          How would you like to handle this?
        </p>
        <div className="ext-change-actions">
          <button
            className="ext-change-btn ext-change-btn-merge"
            onClick={onMerge}
            disabled={!canMerge}
            title={
              canMerge
                ? undefined
                : "Changes conflict and cannot be auto-merged"
            }
          >
            Merge
          </button>
          <button
            className="ext-change-btn ext-change-btn-update"
            onClick={onUpdate}
          >
            Update Editor
          </button>
          <button
            className="ext-change-btn ext-change-btn-ignore"
            onClick={onIgnore}
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExternalChangeDialog;
