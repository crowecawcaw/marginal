import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock CSS.supports for jsdom
if (typeof CSS === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).CSS = {
    supports: vi.fn(() => false),
  };
} else if (!CSS.supports) {
  CSS.supports = vi.fn(() => false);
}

// Stub Range.prototype.getBoundingClientRect for jsdom (Lexical selection needs it)
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) }) as DOMRect;
}
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList;
}

// Suppress known Lexical/jsdom unhandled errors during tests.
// Lexical's TableObserver MutationObserver fires asynchronously after React
// unmounts table DOM elements, causing "Expected to find TableElement in DOM".
// These are jsdom limitations, not application bugs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeProcess = (globalThis as any).process;
if (nodeProcess) {
  const originalEmit = nodeProcess.emit.bind(nodeProcess);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeProcess.emit = function (event: string, ...args: any[]) {
    if (event === "uncaughtException") {
      const error = args[0];
      if (error instanceof Error) {
        const msg = error.message;
        if (
          msg.includes("TableObserver: Expected to find TableElement") ||
          msg.includes("getBoundingClientRect is not a function")
        ) {
          return false;
        }
      }
    }
    return originalEmit(event, ...args);
  };
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});
