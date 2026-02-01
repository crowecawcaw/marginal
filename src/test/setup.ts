import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock CSS.supports for jsdom (required by OverType)
if (typeof CSS === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).CSS = {
    supports: vi.fn(() => false),
  };
} else if (!CSS.supports) {
  CSS.supports = vi.fn(() => false);
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});
