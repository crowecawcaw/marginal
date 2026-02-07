import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  FORMAT_TEXT_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, HeadingTagType } from "@lexical/rich-text";
import { setupEventListeners } from "../../../platform/eventAdapter";

/**
 * Plugin to handle rich text formatting keyboard shortcuts in rendered view
 * - Cmd+B: Bold
 * - Cmd+I: Italic
 * - Cmd+1-5: Headings 1-5
 */
export function RichTextFormattingPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { metaKey, ctrlKey, key } = event;
      const modKey = metaKey || ctrlKey;

      if (!modKey) return;

      // Cmd+B - Toggle bold
      if (key === "b") {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        return;
      }

      // Cmd+I - Toggle italic
      if (key === "i") {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        return;
      }

      // Cmd+1 through Cmd+5 - Headings
      if (["1", "2", "3", "4", "5"].includes(key)) {
        event.preventDefault();
        const headingLevel = parseInt(key, 10) as 1 | 2 | 3 | 4 | 5;

        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () =>
              $createHeadingNode(`h${headingLevel}` as HeadingTagType),
            );
          }
        });
        return;
      }

      // Cmd+0 - Reset to paragraph (remove heading)
      if (key === "0") {
        event.preventDefault();
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        });
        return;
      }
    };

    // Attach to the editor's root element to ensure it captures events
    const rootElement = editor.getRootElement();
    if (rootElement) {
      rootElement.addEventListener("keydown", handleKeyDown);
      return () => {
        rootElement.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [editor]);

  // Listen for menu events to dispatch formatting commands
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setHeading = (level: 1 | 2 | 3 | 4 | 5) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () =>
            $createHeadingNode(`h${level}` as HeadingTagType),
          );
        }
      });
    };

    setupEventListeners([
      { event: "menu:bold", callback: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold") },
      { event: "menu:italic", callback: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic") },
      { event: "menu:heading-1", callback: () => setHeading(1) },
      { event: "menu:heading-2", callback: () => setHeading(2) },
      { event: "menu:heading-3", callback: () => setHeading(3) },
      { event: "menu:heading-4", callback: () => setHeading(4) },
      { event: "menu:heading-5", callback: () => setHeading(5) },
    ]).then((unlisten) => {
      cleanup = unlisten;
    });

    return () => {
      cleanup?.();
    };
  }, [editor]);

  return null;
}
