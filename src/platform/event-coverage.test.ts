/**
 * Event Coverage Test
 *
 * Scans source files to ensure every emitted event has at least one listener.
 * This test catches missing handlers when new events are added to the app.
 *
 * To add a new event:
 *   1. Add an emit() call in a source file
 *   2. Add a listener in the appropriate component
 *   If the event is intentionally unhandled (e.g. not yet implemented),
 *   add it to KNOWN_UNHANDLED below with a comment explaining why.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");
const RUST_LIB = path.join(ROOT, "src-tauri/src/lib.rs");

// Platform files that define the event system itself — skip for emit/listen extraction
const PLATFORM_FILES = new Set(["eventAdapter.ts", "useEventListener.ts"]);

// Events emitted from the Tauri/Rust backend or frontend that are not yet
// wired to a frontend handler. Adding to this list is intentional — document why.
const KNOWN_UNHANDLED = new Set([
  "menu:bold",       // Tauri menu item — formatting via menu not yet implemented
  "menu:italic",     // Tauri menu item — formatting via menu not yet implemented
  "menu:heading-1",  // Tauri menu item — heading via menu not yet implemented
  "menu:heading-2",  // Tauri menu item — heading via menu not yet implemented
  "menu:heading-3",  // Tauri menu item — heading via menu not yet implemented
  "menu:heading-4",  // Tauri menu item — heading via menu not yet implemented
  "menu:heading-5",  // Tauri menu item — heading via menu not yet implemented
]);

// ── File walking ────────────────────────────────────────────────────────────

function walkTs(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTs(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
      results.push(full);
    }
  }
  return results;
}

// ── Extraction ──────────────────────────────────────────────────────────────

/** Extract event names from emit("event-name") calls in TypeScript source.
 *  Excludes property-access forms like appWindow.emit() which use Tauri's
 *  native event system rather than the app's WebEventEmitter bus. */
function extractEmits(content: string): string[] {
  const names: string[] = [];
  // Match emit( not preceded by a dot (excludes appWindow.emit, etc.)
  for (const m of content.matchAll(/(?<!\.)emit\(\s*["']([^"']+)["']/g)) {
    names.push(m[1]);
  }
  return names;
}

/** Extract event names from Rust window.emit("event-name", ...) calls */
function extractRustEmits(content: string): string[] {
  const names: string[] = [];
  for (const m of content.matchAll(/window\.emit\(\s*"([^"]+)"/g)) {
    names.push(m[1]);
  }
  return names;
}

/** Extract event names from listener registrations in TypeScript source */
function extractListeners(content: string): string[] {
  const names: string[] = [];
  // useEventListener("event-name", ...) or useEventListener<T>("event-name", ...)
  // or listen("event-name", ...)
  for (const m of content.matchAll(/\b(?:useEventListener|listen)\s*(?:<[^>]*>)?\(\s*["']([^"']+)["']/g)) {
    names.push(m[1]);
  }
  // { event: "event-name", ... } inside useEventListeners([...])
  for (const m of content.matchAll(/\bevent:\s*["']([^"']+)["']/g)) {
    names.push(m[1]);
  }
  return names;
}

// ── Test ────────────────────────────────────────────────────────────────────

describe("event coverage", () => {
  it("every emitted event has a matching listener in source code", () => {
    const emitted = new Set<string>();
    const listened = new Set<string>();

    // Scan TypeScript source files
    for (const file of walkTs(SRC)) {
      const name = path.basename(file);
      if (PLATFORM_FILES.has(name)) continue;

      const content = fs.readFileSync(file, "utf-8");
      extractEmits(content).forEach((e) => emitted.add(e));
      extractListeners(content).forEach((e) => listened.add(e));
    }

    // Scan Rust backend for emitted events
    if (fs.existsSync(RUST_LIB)) {
      const rustContent = fs.readFileSync(RUST_LIB, "utf-8");
      extractRustEmits(rustContent).forEach((e) => emitted.add(e));
    }

    const unhandled = [...emitted]
      .filter((e) => !listened.has(e) && !KNOWN_UNHANDLED.has(e))
      .sort();

    expect(
      unhandled,
      `Events emitted with no listener:\n${unhandled.map((e) => `  "${e}"`).join("\n")}\n\nEither add a listener or add to KNOWN_UNHANDLED in event-coverage.test.ts`,
    ).toEqual([]);
  });

  it("KNOWN_UNHANDLED contains no stale entries (all listed events are actually emitted)", () => {
    const emitted = new Set<string>();

    for (const file of walkTs(SRC)) {
      const name = path.basename(file);
      if (PLATFORM_FILES.has(name)) continue;
      extractEmits(fs.readFileSync(file, "utf-8")).forEach((e) => emitted.add(e));
    }

    if (fs.existsSync(RUST_LIB)) {
      extractRustEmits(fs.readFileSync(RUST_LIB, "utf-8")).forEach((e) => emitted.add(e));
    }

    const stale = [...KNOWN_UNHANDLED].filter((e) => !emitted.has(e)).sort();

    expect(
      stale,
      `KNOWN_UNHANDLED has entries that are never emitted:\n${stale.map((e) => `  "${e}"`).join("\n")}\n\nRemove them from KNOWN_UNHANDLED in event-coverage.test.ts`,
    ).toEqual([]);
  });
});
