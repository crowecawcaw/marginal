import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createTableFromMarkdown } from "./tableTransformer";
import { $getRoot, $createParagraphNode } from "lexical";

/**
 * Plugin to handle markdown table import
 * This preprocesses markdown content to extract and convert tables
 */
export function TableMarkdownPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Check if content contains tables
    const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;

    if (!tableRegex.test(content)) {
      return; // No tables to process
    }

    // Parse and insert tables
    editor.update(() => {
      const root = $getRoot();
      const existingTables = root.getChildren().filter(child => {
        return child.getType() === 'table';
      });

      // Only process if we don't already have tables
      if (existingTables.length > 0) {
        return;
      }

      // Find all table blocks in the markdown
      const lines = content.split('\n');
      let i = 0;
      const newNodes: any[] = [];

      while (i < lines.length) {
        const line = lines[i];

        // Check if this line starts a table
        if (line.trim().startsWith('|')) {
          // Collect all consecutive table lines
          const tableLines: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith('|')) {
            tableLines.push(lines[i]);
            i++;
          }

          // Parse the table
          const tableText = tableLines.join('\n');
          const tableNode = $createTableFromMarkdown(tableText);

          if (tableNode) {
            newNodes.push(tableNode);
          } else {
            // If parsing failed, treat as regular text
            const paragraph = $createParagraphNode();
            newNodes.push(paragraph);
          }
        } else {
          i++;
        }
      }

      // If we found and parsed tables, we don't need to do anything more
      // because the main RenderedContentSyncPlugin will handle the full conversion
    });
  }, [editor, content]);

  return null;
}
