import React, { useEffect, useCallback } from "react";
import { useUIStore } from "../../stores/uiStore";
import { Theme } from "../../utils/settings";
import "./SettingsDialog.css";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const themeOptions: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useUIStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="settings-dialog-overlay" onClick={onClose}>
      <div
        className="settings-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
      >
        <h2 id="settings-dialog-title" className="settings-dialog-title">
          Settings
        </h2>
        <div className="settings-dialog-section">
          <label className="settings-dialog-label">Theme</label>
          <div className="settings-theme-picker">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                className={`settings-theme-option ${theme === opt.value ? "active" : ""}`}
                onClick={() => setTheme(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
