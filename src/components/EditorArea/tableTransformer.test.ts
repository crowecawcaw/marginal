import { describe, it, expect } from "vitest";
import { createEditor, $createParagraphNode, $createTextNode } from "lexical";
import { TableNode, TableRowNode, TableCellNode, $createTableNode, $createTableRowNode, $createTableCellNode } from "@lexical/table";
import { $parseInlineMarkdown, $createTableFromMarkdown, TABLE } from "./tableTransformer";

// Helper to run Lexical operations in an editor context
function withEditor<T>(fn: () => T): T {
  const editor = createEditor({
    namespace: "test",
    nodes: [TableNode, TableRowNode, TableCellNode],
    onError: (error) => { throw error; },
  });

  let result: T;
  editor.update(() => {
    result = fn();
  }, { discrete: true });

  return result!;
}

// Helper to create a simple table node for testing export
function createTestTable(rows: string[][]): TableNode {
  const table = $createTableNode();

  rows.forEach((rowCells, rowIndex) => {
    const row = $createTableRowNode();
    rowCells.forEach((cellText) => {
      const isHeader = rowIndex === 0;
      const cell = $createTableCellNode(isHeader ? 1 : 0);
      const paragraph = $createParagraphNode();
      const nodes = $parseInlineMarkdown(cellText);
      nodes.forEach((node) => paragraph.append(node));
      cell.append(paragraph);
      row.append(cell);
    });
    table.append(row);
  });

  return table;
}

describe("tableTransformer", () => {
  describe("$parseInlineMarkdown", () => {
    it("returns plain text node when no formatting", () => {
      withEditor(() => {
        const nodes = $parseInlineMarkdown("hello world");
        expect(nodes.length).toBe(1);
        expect(nodes[0].getTextContent()).toBe("hello world");
      });
    });

    it("parses single inline code with backticks", () => {
      withEditor(() => {
        const nodes = $parseInlineMarkdown("`code`");
        expect(nodes.length).toBe(1);
        expect(nodes[0].getTextContent()).toBe("code");
        // Check format is code (16 is the code format flag)
        expect((nodes[0] as any).getFormat() & 16).toBeTruthy();
      });
    });

    it("parses inline code with surrounding text", () => {
      withEditor(() => {
        const nodes = $parseInlineMarkdown("Use `useState` hook");
        expect(nodes.length).toBe(3);
        expect(nodes[0].getTextContent()).toBe("Use ");
        expect(nodes[1].getTextContent()).toBe("useState");
        expect((nodes[1] as any).getFormat() & 16).toBeTruthy();
        expect(nodes[2].getTextContent()).toBe(" hook");
      });
    });

    it("parses multiple inline code spans", () => {
      withEditor(() => {
        const nodes = $parseInlineMarkdown("`foo` and `bar`");
        expect(nodes.length).toBe(3);
        expect(nodes[0].getTextContent()).toBe("foo");
        expect(nodes[1].getTextContent()).toBe(" and ");
        expect(nodes[2].getTextContent()).toBe("bar");
        expect((nodes[0] as any).getFormat() & 16).toBeTruthy();
        expect((nodes[2] as any).getFormat() & 16).toBeTruthy();
      });
    });

    it("handles empty string", () => {
      withEditor(() => {
        const nodes = $parseInlineMarkdown("");
        expect(nodes.length).toBe(1);
        expect(nodes[0].getTextContent()).toBe("");
      });
    });

    it("handles code at start of string", () => {
      withEditor(() => {
        const nodes = $parseInlineMarkdown("`start` text");
        expect(nodes.length).toBe(2);
        expect(nodes[0].getTextContent()).toBe("start");
        expect((nodes[0] as any).getFormat() & 16).toBeTruthy();
        expect(nodes[1].getTextContent()).toBe(" text");
      });
    });

    it("handles code at end of string", () => {
      withEditor(() => {
        const nodes = $parseInlineMarkdown("text `end`");
        expect(nodes.length).toBe(2);
        expect(nodes[0].getTextContent()).toBe("text ");
        expect(nodes[1].getTextContent()).toBe("end");
        expect((nodes[1] as any).getFormat() & 16).toBeTruthy();
      });
    });

    it("handles special characters in code", () => {
      withEditor(() => {
        const nodes = $parseInlineMarkdown("`x => x + 1`");
        expect(nodes.length).toBe(1);
        expect(nodes[0].getTextContent()).toBe("x => x + 1");
        expect((nodes[0] as any).getFormat() & 16).toBeTruthy();
      });
    });

    it("handles adjacent code spans", () => {
      withEditor(() => {
        const nodes = $parseInlineMarkdown("`a``b`");
        expect(nodes.length).toBe(2);
        expect(nodes[0].getTextContent()).toBe("a");
        expect(nodes[1].getTextContent()).toBe("b");
      });
    });
  });

  describe("$createTableFromMarkdown", () => {
    it("parses simple 2x2 table", () => {
      withEditor(() => {
        const markdown = `| A | B |
|---|---|
| 1 | 2 |`;
        const table = $createTableFromMarkdown(markdown);

        expect(table).not.toBeNull();
        const rows = table!.getChildren() as TableRowNode[];
        expect(rows.length).toBe(2);

        // Header row
        const headerCells = rows[0].getChildren() as TableCellNode[];
        expect(headerCells.length).toBe(2);
        expect(headerCells[0].getTextContent()).toBe("A");
        expect(headerCells[1].getTextContent()).toBe("B");

        // Data row
        const dataCells = rows[1].getChildren() as TableCellNode[];
        expect(dataCells.length).toBe(2);
        expect(dataCells[0].getTextContent()).toBe("1");
        expect(dataCells[1].getTextContent()).toBe("2");
      });
    });

    it("parses table with multiple data rows", () => {
      withEditor(() => {
        const markdown = `| H |
|---|
| A |
| B |
| C |`;
        const table = $createTableFromMarkdown(markdown);

        expect(table).not.toBeNull();
        const rows = table!.getChildren();
        expect(rows.length).toBe(4); // 1 header + 3 data
      });
    });

    it("handles escaped pipes in cells", () => {
      withEditor(() => {
        const markdown = `| Header |
|--------|
| a \\| b |`;
        const table = $createTableFromMarkdown(markdown);

        expect(table).not.toBeNull();
        const rows = table!.getChildren() as TableRowNode[];
        const dataRow = rows[1];
        const cell = (dataRow.getChildren() as TableCellNode[])[0];
        expect(cell.getTextContent()).toBe("a | b");
      });
    });

    it("preserves inline code in cells", () => {
      withEditor(() => {
        const markdown = `| Code |
|------|
| \`foo()\` |`;
        const table = $createTableFromMarkdown(markdown);

        expect(table).not.toBeNull();
        const rows = table!.getChildren() as TableRowNode[];
        const dataRow = rows[1];
        const cell = (dataRow.getChildren() as TableCellNode[])[0];
        expect(cell.getTextContent()).toBe("foo()");
      });
    });

    it("returns null for invalid table (single line)", () => {
      withEditor(() => {
        const markdown = `| A | B |`;
        const table = $createTableFromMarkdown(markdown);
        expect(table).toBeNull();
      });
    });

    it("returns null for empty rows", () => {
      withEditor(() => {
        const markdown = `not a table`;
        const table = $createTableFromMarkdown(markdown);
        expect(table).toBeNull();
      });
    });

    it("handles extra whitespace in cells", () => {
      withEditor(() => {
        const markdown = `|   A   |   B   |
|-------|-------|
|   1   |   2   |`;
        const table = $createTableFromMarkdown(markdown);

        expect(table).not.toBeNull();
        const rows = table!.getChildren() as TableRowNode[];
        const headerCells = rows[0].getChildren() as TableCellNode[];
        // Should be trimmed
        expect(headerCells[0].getTextContent()).toBe("A");
        expect(headerCells[1].getTextContent()).toBe("B");
      });
    });

    it("handles different separator styles", () => {
      withEditor(() => {
        const markdown = `| Left | Center | Right |
|:-----|:------:|------:|
| L    | C      | R     |`;
        const table = $createTableFromMarkdown(markdown);

        expect(table).not.toBeNull();
        const rows = table!.getChildren();
        expect(rows.length).toBe(2);
      });
    });

    it("preserves empty rows in table", () => {
      withEditor(() => {
        const markdown = `| Header1 | Header2 | Header3 |
|---------|---------|---------|
|         |         |         |
|         |         |         |`;
        const table = $createTableFromMarkdown(markdown);

        expect(table).not.toBeNull();
        const rows = table!.getChildren() as TableRowNode[];
        // Should have 3 rows: 1 header + 2 empty data rows
        expect(rows.length).toBe(3);

        // Verify empty rows exist with 3 cells each
        const dataRow1 = rows[1].getChildren() as TableCellNode[];
        const dataRow2 = rows[2].getChildren() as TableCellNode[];
        expect(dataRow1.length).toBe(3);
        expect(dataRow2.length).toBe(3);

        // Cells should be empty (or have empty text)
        expect(dataRow1[0].getTextContent()).toBe("");
        expect(dataRow1[1].getTextContent()).toBe("");
        expect(dataRow1[2].getTextContent()).toBe("");
      });
    });

    it("preserves rows with only whitespace cells", () => {
      withEditor(() => {
        const markdown = `| H |
|---|
|   |
|   |`;
        const table = $createTableFromMarkdown(markdown);

        expect(table).not.toBeNull();
        const rows = table!.getChildren();
        // Should have 3 rows: 1 header + 2 whitespace-only data rows
        expect(rows.length).toBe(3);
      });
    });
  });

  describe("TABLE.export", () => {
    it("exports simple table to markdown", () => {
      withEditor(() => {
        const table = createTestTable([
          ["A", "B"],
          ["1", "2"],
        ]);

        const markdown = TABLE.export(table, () => "")!;
        expect(markdown).toContain("| A |");
        expect(markdown).toContain("| B |");
        expect(markdown).toContain("|---|");
        expect(markdown).toContain("| 1 |");
        expect(markdown).toContain("| 2 |");
      });
    });

    it("exports table with multiple rows", () => {
      withEditor(() => {
        const table = createTestTable([
          ["Header"],
          ["Row 1"],
          ["Row 2"],
          ["Row 3"],
        ]);

        const markdown = TABLE.export(table, () => "")!;
        const lines = markdown.split("\n");
        expect(lines.length).toBe(5); // header + separator + 3 data rows
      });
    });

    it("returns null for non-table nodes", () => {
      withEditor(() => {
        const paragraph = $createParagraphNode();
        const result = TABLE.export(paragraph, () => "");
        expect(result).toBeNull();
      });
    });

    it("preserves inline code formatting in export", () => {
      withEditor(() => {
        const table = createTestTable([
          ["Code"],
          ["`foo()`"],
        ]);

        const markdown = TABLE.export(table, () => "")!;
        expect(markdown).toContain("`foo()`");
      });
    });

    it("escapes pipe characters in cell content", () => {
      withEditor(() => {
        // Create table with pipe character directly (not in code)
        const table = $createTableNode();
        const headerRow = $createTableRowNode();
        const headerCell = $createTableCellNode(1);
        const headerParagraph = $createParagraphNode();
        headerParagraph.append($createTextNode("Header"));
        headerCell.append(headerParagraph);
        headerRow.append(headerCell);
        table.append(headerRow);

        const dataRow = $createTableRowNode();
        const dataCell = $createTableCellNode(0);
        const dataParagraph = $createParagraphNode();
        dataParagraph.append($createTextNode("a | b"));
        dataCell.append(dataParagraph);
        dataRow.append(dataCell);
        table.append(dataRow);

        const markdown = TABLE.export(table, () => "")!;
        expect(markdown).toContain("\\|");
      });
    });
  });

  describe("roundtrip", () => {
    it("preserves simple table through parse and export", () => {
      withEditor(() => {
        const original = `| A | B |
|---|---|
| 1 | 2 |`;

        const table = $createTableFromMarkdown(original);
        expect(table).not.toBeNull();

        const exported = TABLE.export(table!, () => "")!;
        expect(exported).not.toBeNull();

        expect(exported).toContain("A");
        expect(exported).toContain("B");
        expect(exported).toContain("1");
        expect(exported).toContain("2");
      });
    });

    it("preserves inline code through parse and export", () => {
      withEditor(() => {
        const original = `| Code |
|------|
| \`test\` |`;

        const table = $createTableFromMarkdown(original);
        const exported = TABLE.export(table!, () => "")!;

        expect(exported).toContain("`test`");
      });
    });

    it("preserves escaped pipes through parse and export", () => {
      withEditor(() => {
        const original = `| Header |
|--------|
| a \\| b |`;

        const table = $createTableFromMarkdown(original);
        expect(table).not.toBeNull();

        // Check content was parsed correctly
        const rows = table!.getChildren() as TableRowNode[];
        const dataCell = (rows[1].getChildren() as TableCellNode[])[0];
        expect(dataCell.getTextContent()).toBe("a | b");

        // Export and verify pipe is escaped
        const exported = TABLE.export(table!, () => "")!;
        expect(exported).toContain("\\|");
      });
    });
  });
});
