import { useState, useEffect, useRef, useCallback } from "react";
import "./LinkEditTooltip.css";

interface LinkEditTooltipProps {
  url: string;
  rect: DOMRect;
  onUrlChange: (url: string) => void;
  onRemoveLink: () => void;
  onOpenLink: () => void;
  onClose: () => void;
}

export function LinkEditTooltip({
  url,
  rect,
  onUrlChange,
  onRemoveLink,
  onOpenLink,
  onClose,
}: LinkEditTooltipProps) {
  const [editUrl, setEditUrl] = useState(url);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    flipped: boolean;
  }>({ top: 0, left: 0, flipped: false });

  // Calculate position relative to the link
  useEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;

    const tooltipHeight = tooltip.offsetHeight;
    const tooltipWidth = tooltip.offsetWidth;
    const gap = 6;

    let top = rect.top - tooltipHeight - gap;
    let flipped = false;

    // Flip below if not enough room above
    if (top < 4) {
      top = rect.bottom + gap;
      flipped = true;
    }

    // Center horizontally on the link, clamped to viewport
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));

    setPosition({ top, left, flipped });
  }, [rect]);

  // Focus and select input on mount
  useEffect(() => {
    // Delay slightly so position is computed before focus pulls scroll
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Click-outside to dismiss
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    // Use setTimeout so the same click that opened the tooltip doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onClose]);

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = editUrl.trim();
        if (trimmed && trimmed !== url) {
          onUrlChange(trimmed);
        } else {
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [editUrl, url, onUrlChange, onClose]
  );

  const handleApply = useCallback(() => {
    const trimmed = editUrl.trim();
    if (trimmed) {
      onUrlChange(trimmed);
    }
  }, [editUrl, onUrlChange]);

  return (
    <div
      ref={tooltipRef}
      className={`link-edit-tooltip ${position.flipped ? "link-edit-tooltip--flipped" : ""}`}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="link-edit-tooltip-arrow" />
      <div className="link-edit-tooltip-content">
        <input
          ref={inputRef}
          type="text"
          className="link-edit-tooltip-input"
          value={editUrl}
          onChange={(e) => setEditUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
        <button
          className="link-edit-tooltip-btn link-edit-tooltip-btn--apply"
          onClick={handleApply}
          title="Apply (Enter)"
          disabled={!editUrl.trim()}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
        <button
          className="link-edit-tooltip-btn link-edit-tooltip-btn--remove"
          onClick={onRemoveLink}
          title="Remove link"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <line x1="15" y1="3" x2="21" y2="9" />
            <line x1="21" y1="3" x2="15" y2="9" />
          </svg>
        </button>
        <button
          className="link-edit-tooltip-btn link-edit-tooltip-btn--open"
          onClick={onOpenLink}
          title="Open link (⌘+Click)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
