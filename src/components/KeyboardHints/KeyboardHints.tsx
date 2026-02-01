import React, { useEffect, useState } from "react";
import "./KeyboardHints.css";

/**
 * Component that displays keyboard shortcut hints when Cmd/Ctrl is pressed
 * Shows at the bottom of the screen with platform-appropriate labels
 */
const KeyboardHints: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Detect platform
    const platform = navigator.platform.toLowerCase();
    setIsMac(platform.includes("mac"));

    let showTimer: number | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Show hints after 1 second when Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      if (e.metaKey || e.ctrlKey) {
        if (!showTimer) {
          showTimer = setTimeout(() => {
            setIsVisible(true);
          }, 1000);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Hide hints when Cmd/Ctrl is released
      if (e.key === "Meta" || e.key === "Control") {
        if (showTimer) {
          clearTimeout(showTimer);
          showTimer = null;
        }
        setIsVisible(false);
      }
    };

    // Also hide when window loses focus
    const handleBlur = () => {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      setIsVisible(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      if (showTimer) {
        clearTimeout(showTimer);
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const modKey = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    { keys: `${modKey} N`, description: "New File" },
    { keys: `${modKey} O`, description: "Open File" },
    { keys: `${modKey} S`, description: "Save" },
    { keys: `${modKey} W`, description: "Close Tab" },
    { keys: `${modKey} F`, description: "Find" },
    { keys: `${modKey} ⇧ F`, description: "Format" },
    { keys: `${modKey} ⇧ P`, description: "Toggle View" },
    { keys: `${modKey} \\`, description: "Toggle Outline" },
    { keys: `${modKey} B`, description: "Bold" },
    { keys: `${modKey} I`, description: "Italic" },
    { keys: `${modKey} 1-5`, description: "Heading" },
  ];

  return (
    <div className="keyboard-hints">
      <div className="keyboard-hints-content">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="keyboard-hint-item">
            <span className="keyboard-hint-keys">{shortcut.keys}</span>
            <span className="keyboard-hint-description">
              {shortcut.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyboardHints;
