import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveAutosaveEntry,
  removeAutosaveEntry,
  loadAutosaveEntries,
  clearAllAutosaveEntries,
  AutosaveEntry,
} from "./autosave";

// Mock Tauri store
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: { load: vi.fn() },
}));

const makeEntry = (overrides: Partial<AutosaveEntry> = {}): AutosaveEntry => ({
  content: "# Hello",
  fileName: "test.md",
  filePath: "/path/test.md",
  savedAt: Date.now(),
  ...overrides,
});

describe("autosave", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("load returns empty when nothing saved", () => {
    const entries = loadAutosaveEntries();
    expect(entries).toEqual({});
  });

  it("save and load entries", async () => {
    const entry = makeEntry();
    await saveAutosaveEntry("file-1", entry);

    const entries = loadAutosaveEntries();
    expect(entries["file-1"]).toEqual(entry);
  });

  it("remove entry", async () => {
    await saveAutosaveEntry("file-1", makeEntry());
    await saveAutosaveEntry("file-2", makeEntry({ fileName: "other.md" }));

    await removeAutosaveEntry("file-1");

    const entries = loadAutosaveEntries();
    expect(entries["file-1"]).toBeUndefined();
    expect(entries["file-2"]).toBeDefined();
  });

  it("clear all entries", async () => {
    await saveAutosaveEntry("file-1", makeEntry());
    await saveAutosaveEntry("file-2", makeEntry());

    await clearAllAutosaveEntries();

    const entries = loadAutosaveEntries();
    expect(entries).toEqual({});
  });

  it("overwrite existing entry (update)", async () => {
    await saveAutosaveEntry("file-1", makeEntry({ content: "old content" }));
    await saveAutosaveEntry("file-1", makeEntry({ content: "new content" }));

    const entries = loadAutosaveEntries();
    expect(entries["file-1"].content).toBe("new content");
  });

  it("removing a non-existent entry does not error", async () => {
    await saveAutosaveEntry("file-1", makeEntry());
    await removeAutosaveEntry("does-not-exist");

    const entries = loadAutosaveEntries();
    expect(entries["file-1"]).toBeDefined();
  });
});
