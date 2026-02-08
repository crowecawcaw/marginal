import { describe, it, expect, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { $getRoot } from "lexical";
import { $isTableNode } from "@lexical/table";
import { EditorTestHarness } from "../../../test/EditorTestHarness";
import { getWebEventEmitter } from "../../../platform/eventAdapter";

describe("Table Tests", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("renders simple 2x2 table with correct data", async () => {
    h = await EditorTestHarness.create(`| A | B |
|---|---|
| 1 | 2 |`);

    expect(h.query.hasTable()).toBe(true);
    expect(h.query.tableData()).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });

  it("preserves multi-row table through roundtrip", async () => {
    h = await EditorTestHarness.create(`| Name | Age |
|------|-----|
| Alice | 30 |
| Bob | 25 |
| Carol | 28 |`);

    expect(h.query.tableData()).toEqual([
      ["Name", "Age"],
      ["Alice", "30"],
      ["Bob", "25"],
      ["Carol", "28"],
    ]);

    await h.toggleView(); // → code
    await h.toggleView(); // → rendered

    const data = h.query.tableData();
    expect(data.length).toBe(4);
    expect(data[0]).toEqual(["Name", "Age"]);
    expect(data[1]).toEqual(["Alice", "30"]);
    expect(data[2]).toEqual(["Bob", "25"]);
    expect(data[3]).toEqual(["Carol", "28"]);
  });

  it("preserves inline code in table cells through roundtrip", async () => {
    h = await EditorTestHarness.create(`| Code |
|------|
| \`foo()\` |`);

    expect(h.query.codeTexts()).toEqual(["foo()"]);

    await h.toggleView();
    expect(h.getCodeViewText()).toContain("`foo()`");

    await h.toggleView();
    expect(h.query.codeTexts()).toEqual(["foo()"]);
  });

  it("preserves bold/italic in table cells through roundtrip", async () => {
    h = await EditorTestHarness.create(`| Format |
|--------|
| **bold** |
| *italic* |`);

    expect(h.query.boldTexts()).toEqual(["bold"]);
    expect(h.query.italicTexts()).toEqual(["italic"]);

    await h.toggleView();
    await h.toggleView();

    expect(h.query.boldTexts()).toEqual(["bold"]);
    expect(h.query.italicTexts()).toEqual(["italic"]);
  });

  it("preserves escaped pipes in table cells through roundtrip", async () => {
    h = await EditorTestHarness.create(`| Expression |
|------------|
| a \\| b |`);

    expect(h.query.hasTable()).toBe(true);
    // The cell should contain the literal pipe character
    const data = h.query.tableData();
    const dataCell = data[1]?.[0] ?? "";
    expect(dataCell).toContain("a");
    expect(dataCell).toContain("b");
    expect(dataCell).toContain("|");

    await h.toggleView();
    await h.toggleView();

    expect(h.query.hasTable()).toBe(true);
  });

  it("preserves table with heading (mixed content) through roundtrip", async () => {
    h = await EditorTestHarness.create(`# Title

| Col A | Col B |
|-------|-------|
| X | Y |`);

    expect(h.query.heading(1)).toBe("Title");
    expect(h.query.hasTable()).toBe(true);
    expect(h.query.tableData()).toEqual([
      ["Col A", "Col B"],
      ["X", "Y"],
    ]);

    await h.toggleView();
    await h.toggleView();

    expect(h.query.heading(1)).toBe("Title");
    expect(h.query.hasTable()).toBe(true);
    const data = h.query.tableData();
    expect(data[0]).toEqual(["Col A", "Col B"]);
    expect(data[1]).toEqual(["X", "Y"]);
  });

  it("table survives multiple roundtrips", async () => {
    h = await EditorTestHarness.create(`| Product | Price |
|---------|-------|
| Apple | $1.00 |
| Banana | $0.50 |`);

    for (let i = 0; i < 3; i++) {
      await h.toggleView(); // → code
      await h.toggleView(); // → rendered

      expect(h.query.hasTable()).toBe(true);
      const data = h.query.tableData();
      expect(data[0]).toEqual(["Product", "Price"]);
      expect(data[1]).toEqual(["Apple", "$1.00"]);
      expect(data[2]).toEqual(["Banana", "$0.50"]);
    }
  });

  it("handles empty cells correctly", async () => {
    h = await EditorTestHarness.create(`| A | B |
|---|---|
|  | val |`);

    expect(h.query.hasTable()).toBe(true);
    const data = h.query.tableData();
    expect(data.length).toBe(2);
    // First data cell should be empty or whitespace
    expect(data[1][0].trim()).toBe("");
    expect(data[1][1]).toBe("val");
  });

  it("inserting a table with cursor in a table cell places new table after the existing table, not nested", async () => {
    h = await EditorTestHarness.create(`| A | B |
|---|---|
| 1 | 2 |`);

    expect(h.query.hasTable()).toBe(true);

    // Access the Lexical editor from the contentEditable DOM element
    const rootEl = document.querySelector(
      ".markdown-editor-input"
    ) as HTMLElement & { __lexicalEditor: any };
    const editor = rootEl.__lexicalEditor;
    expect(editor).toBeTruthy();

    // Set cursor inside a table cell using Lexical's API
    await act(async () => {
      editor.update(() => {
        const root = $getRoot();
        const tableNode = root
          .getChildren()
          .find((child: any) => $isTableNode(child));
        expect(tableNode).toBeTruthy();
        // Navigate to first data row, first cell, paragraph
        const dataRow = tableNode.getChildAtIndex(1);
        const cell = dataRow.getChildAtIndex(0);
        const paragraph = cell.getFirstChild();
        // Set selection at the start of the paragraph inside the cell
        paragraph.selectStart();
      });
    });

    // Trigger insert-table via the event system
    await act(async () => {
      getWebEventEmitter().emit("menu:insert-table");
    });

    // There should be two separate tables, not nested
    const tables = document.querySelectorAll(".editor-table");
    expect(tables.length).toBe(2);

    // Verify no table is nested inside another table
    for (const table of tables) {
      expect(table.querySelector(".editor-table")).toBeNull();
    }
  });
});
