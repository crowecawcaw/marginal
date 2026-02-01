import { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { Prism } from "../../../lib/prismSetup";
import "./MarkdownSyntaxHighlightPlugin.css";

/**
 * Plugin to add markdown syntax highlighting to code view
 * Creates an overlay with Prism-highlighted content behind the editor
 */
export function MarkdownSyntaxHighlightPlugin() {
  const [editor] = useLexicalComposerContext();
  const [highlightedHTML, setHighlightedHTML] = useState("");

  useEffect(() => {
    // Function to update syntax highlighting
    const updateHighlighting = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const text = root.getTextContent();

        if (text) {
          try {
            // Use Prism to highlight the markdown
            const highlighted = Prism.highlight(
              text,
              Prism.languages.markdown,
              "markdown",
            );
            setHighlightedHTML(highlighted);
          } catch (error) {
            console.error("Error highlighting markdown:", error);
            setHighlightedHTML("");
          }
        } else {
          setHighlightedHTML("");
        }
      });
    };

    // Update on mount
    updateHighlighting();

    // Listen for content changes
    const removeUpdateListener = editor.registerUpdateListener(() => {
      updateHighlighting();
    });

    return () => {
      removeUpdateListener();
    };
  }, [editor]);

  if (!highlightedHTML) {
    return null;
  }

  return (
    <div
      className="markdown-syntax-highlight-overlay"
      dangerouslySetInnerHTML={{ __html: highlightedHTML }}
      aria-hidden="true"
    />
  );
}
