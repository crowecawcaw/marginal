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
import { $createParagraphNode, $createTextNode, $isParagraphNode, $isTextNode, LexicalNode } from "lexical";
import type { ElementTransformer } from "@lexical/markdown";

// Format bitmask values from Lexical: bold=1, italic=2, strikethrough=4, code=16
function $wrapTextWithFormat(text: string, format: number): string {
  if (format & 16) return `\`${text}\``; // code — no other formatting inside code spans
  let result = text;
  if (format & 4) result = `~~${result}~~`;
  if ((format & 3) === 3) result = `***${result}***`;
  else if (format & 1) result = `**${result}**`;
  else if (format & 2) result = `*${result}*`;
  return result;
}

// Helper function to parse inline markdown in cell text
export function $parseInlineMarkdown(text: string): LexicalNode[] {
  const nodes: LexicalNode[] = [];
  let currentIndex = 0;

  // Matches inline formats in priority order via alternation:
  // Group 1: code (`text`)
  // Group 2: bold+italic (***text***)
  // Group 3: bold (**text**)
  // Group 4: italic (*text*) — lookaround prevents matching inside ** pairs
  // Group 5: strikethrough (~~text~~)
  const inlineRegex = /`([^`]+)`|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|(?<!\*)\*([^*]+)\*(?!\*)|~~(.+?)~~/g;

  let match;
  while ((match = inlineRegex.exec(text)) !== null) {
    // Add plain text before this match
    if (currentIndex < match.index) {
      const beforeText = text.slice(currentIndex, match.index);
      if (beforeText) {
        nodes.push($createTextNode(beforeText));
      }
    }

    let innerText: string;
    let format: number;

    if (match[1] !== undefined) {
      innerText = match[1];
      format = 16; // code
    } else if (match[2] !== undefined) {
      innerText = match[2];
      format = 3; // bold (1) + italic (2)
    } else if (match[3] !== undefined) {
      innerText = match[3];
      format = 1; // bold
    } else if (match[4] !== undefined) {
      innerText = match[4];
      format = 2; // italic
    } else {
      innerText = match[5];
      format = 4; // strikethrough
    }

    const node = $createTextNode(innerText);
    node.setFormat(format);
    nodes.push(node);

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      nodes.push($createTextNode(remainingText));
    }
  }

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
                cellText += $wrapTextWithFormat(text, format);
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
