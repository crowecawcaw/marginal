import {
  $isTableNode,
  $isTableRowNode,
  $isTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $createTableCellNode,
  TableNode,
  TableRowNode,
  TableCellNode,
} from "@lexical/table";
import { $createParagraphNode, $createTextNode, $isParagraphNode, $isTextNode, TextFormatType, LexicalNode } from "lexical";
import type { ElementTransformer } from "@lexical/markdown";

// Helper function to parse inline markdown in cell text
export function $parseInlineMarkdown(text: string): LexicalNode[] {
  const nodes: LexicalNode[] = [];
  let currentIndex = 0;

  // Regular expressions for inline markdown
  const inlineCodeRegex = /`([^`]+)`/g;

  // Find all inline code matches
  const codeMatches: Array<{ start: number; end: number; text: string }> = [];
  let match;

  inlineCodeRegex.lastIndex = 0;
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    codeMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
    });
  }

  // Sort matches by start position
  codeMatches.sort((a, b) => a.start - b.start);

  // Process text with inline code
  codeMatches.forEach((codeMatch) => {
    // Add text before code
    if (currentIndex < codeMatch.start) {
      const beforeText = text.slice(currentIndex, codeMatch.start);
      if (beforeText) {
        // Process bold/italic in the before text
        const textNode = $createTextNode(beforeText);
        nodes.push(textNode);
      }
    }

    // Add inline code
    const codeNode = $createTextNode(codeMatch.text);
    codeNode.setFormat('code' as TextFormatType);
    nodes.push(codeNode);

    currentIndex = codeMatch.end;
  });

  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      const textNode = $createTextNode(remainingText);
      nodes.push(textNode);
    }
  }

  // If no matches, return plain text
  if (nodes.length === 0) {
    nodes.push($createTextNode(text));
  }

  return nodes;
}

// Table transformer for GFM (GitHub Flavored Markdown) table syntax
export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const rows: string[] = [];
    const children = node.getChildren();
    let isFirstRow = true;

    children.forEach((row) => {
      if (!$isTableRowNode(row)) return;

      const cells: string[] = [];
      const rowChildren = row.getChildren();

      rowChildren.forEach((cell) => {
        if (!$isTableCellNode(cell)) return;

        // Get cell content with formatting preserved
        let cellText = "";
        const cellChildren = cell.getChildren();
        cellChildren.forEach((child) => {
          if ($isParagraphNode(child)) {
            // Process paragraph children to preserve formatting
            const paragraphChildren = child.getChildren();
            paragraphChildren.forEach((textNode) => {
              if ($isTextNode(textNode)) {
                const text = textNode.getTextContent();
                const format = textNode.getFormat();

                // Check if it has code format
                if (format & 16) { // 16 is the code format flag
                  cellText += `\`${text}\``;
                } else {
                  cellText += text;
                }
              } else {
                cellText += textNode.getTextContent();
              }
            });
          } else {
            cellText += child.getTextContent();
          }
        });

        // Escape pipe characters in cell content (but not in code)
        cellText = cellText.replace(/(?<!`)\|(?!`)/g, "\\|");
        cells.push(` ${cellText} `);
      });

      if (cells.length > 0) {
        rows.push(`|${cells.join("|")}|`);

        // Add separator row after first row (header row)
        if (isFirstRow) {
          const separator = cells.map(() => "---").join("|");
          rows.push(`|${separator}|`);
          isFirstRow = false;
        }
      }
    });

    return rows.length > 0 ? rows.join("\n") : null;
  },
  regExp: /^\|(.+)\|$/,
  replace: () => {
    // Note: This transformer handles export but not import reliably
    // Import is handled by the RenderedContentSyncPlugin preprocessing
    return;
  },
  type: "element",
};

// Helper function to parse markdown table into Lexical table node
export function $createTableFromMarkdown(tableText: string): TableNode | null {
  const lines = tableText.trim().split("\n");
  if (lines.length < 2) return null;

  // Parse rows (skip separator row)
  const rows: string[][] = [];
  let separatorIndex = -1;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return;

    // Remove leading and trailing pipes
    const content = trimmed.slice(1, -1);

    // Check if this is a separator row (must contain at least one dash)
    // This prevents empty rows (only whitespace and pipes) from being treated as separators
    if (/^[\s\-:|]+$/.test(content) && content.includes("-")) {
      separatorIndex = index;
      return;
    }

    // Split by pipe (but not escaped pipes)
    const cells = content.split(/(?<!\\)\|/).map((cell) => {
      // Unescape pipes and trim
      return cell.replace(/\\\|/g, "|").trim();
    });

    rows.push(cells);
  });

  if (rows.length === 0) return null;

  // Create table node
  const table = $createTableNode();

  // Add rows
  rows.forEach((rowCells, rowIndex) => {
    const row = $createTableRowNode();

    rowCells.forEach((cellText) => {
      // First row is header row (if there was a separator)
      const isHeader = separatorIndex > 0 && rowIndex === 0;
      const cell = $createTableCellNode(isHeader ? 1 : 0); // 1 = header, 0 = normal

      // Parse inline markdown in cell text (e.g., `code`, **bold**, *italic*)
      const paragraph = $createParagraphNode();
      const inlineNodes = $parseInlineMarkdown(cellText);
      inlineNodes.forEach((node) => paragraph.append(node));
      cell.append(paragraph);

      row.append(cell);
    });

    table.append(row);
  });

  return table;
}
