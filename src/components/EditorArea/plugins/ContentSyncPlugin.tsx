import React, { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $createParagraphNode, $createTextNode } from "lexical";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { $createHeadingNode } from "@lexical/rich-text";
import { TABLE, $createTableFromMarkdown } from "../tableTransformer";

const CUSTOM_TRANSFORMERS = [...TRANSFORMERS, TABLE];

interface ContentSyncPluginProps {
  content: string;
}

// Plugin to set initial content for rendered view (parse markdown)
export function RenderedContentSyncPlugin({ content }: ContentSyncPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = React.useState(false);

  useEffect(() => {
    if (!initialized) {
      editor.update(() => {
        // If content is empty, initialize with a heading
        if (!content || content.trim() === "") {
          const root = $getRoot();
          root.clear();
          const heading = $createHeadingNode("h1");
          root.append(heading);
          return;
        }

        // Extract table blocks and process them separately
        const tableRegex = /(\|.+\|\n\|[-:\s|]+\|\n(?:\|.+\|\n?)*)/g;
        const tables: { text: string; index: number }[] = [];
        let match;

        while ((match = tableRegex.exec(content)) !== null) {
          tables.push({ text: match[1], index: match.index });
        }

        // If there are tables, replace them with placeholders
        let processedContent = content;
        const placeholder = "<!--TABLE_PLACEHOLDER-->";

        if (tables.length > 0) {
          // Replace tables with placeholders (in reverse to preserve indices)
          for (let i = tables.length - 1; i >= 0; i--) {
            const table = tables[i];
            processedContent =
              processedContent.slice(0, table.index) +
              placeholder +
              processedContent.slice(table.index + table.text.length);
          }
        }

        // Convert the processed markdown
        $convertFromMarkdownString(processedContent, CUSTOM_TRANSFORMERS);

        // Now insert tables where placeholders are
        if (tables.length > 0) {
          const root = $getRoot();
          const children = root.getChildren();
          let tableIndex = 0;

          children.forEach((child) => {
            const text = child.getTextContent();
            if (text.includes(placeholder) && tableIndex < tables.length) {
              const tableNode = $createTableFromMarkdown(tables[tableIndex].text);
              if (tableNode) {
                child.insertAfter(tableNode);
                child.remove();
                tableIndex++;
              }
            }
          });
        }
      });
      setInitialized(true);
    }
  }, [editor, initialized, content]);

  return null;
}

// Plugin to set initial content for code view (plain text)
export function CodeContentSyncPlugin({ content }: ContentSyncPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = React.useState(false);

  useEffect(() => {
    if (!initialized) {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(content));
        root.append(paragraph);
      });
      setInitialized(true);
    }
  }, [editor, initialized, content]);

  return null;
}
