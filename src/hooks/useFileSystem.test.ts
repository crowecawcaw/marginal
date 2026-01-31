import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileSystem } from './useFileSystem';
import { useEditorStore } from '../stores/editorStore';
import { useFileStore } from '../stores/fileStore';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

describe('useFileSystem', () => {
  beforeEach(() => {
    // Reset all stores before each test
    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
    });

    useFileStore.setState({
      rootPath: null,
      fileTree: [],
      recentFiles: [],
    });

    vi.clearAllMocks();
  });

  describe('newFile - untitled file name incrementing', () => {
    it('creates "Untitled.md" when no tabs exist', () => {
      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const tabs = useEditorStore.getState().tabs;
      expect(tabs).toHaveLength(1);
      expect(tabs[0].fileName).toBe('Untitled.md');
    });

    it('creates "Untitled2.md" when "Untitled.md" exists', () => {
      // Set up initial state with Untitled.md
      useEditorStore.setState({
        tabs: [
          {
            id: 'untitled-1',
            filePath: '',
            fileName: 'Untitled.md',
            content: '',
            isDirty: false,
          },
        ],
        activeTabId: 'untitled-1',
      });

      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const tabs = useEditorStore.getState().tabs;
      expect(tabs).toHaveLength(2);
      expect(tabs[1].fileName).toBe('Untitled2.md');
    });

    it('creates "Untitled3.md" when "Untitled.md" and "Untitled2.md" exist', () => {
      useEditorStore.setState({
        tabs: [
          {
            id: 'untitled-1',
            filePath: '',
            fileName: 'Untitled.md',
            content: '',
            isDirty: false,
          },
          {
            id: 'untitled-2',
            filePath: '',
            fileName: 'Untitled2.md',
            content: '',
            isDirty: false,
          },
        ],
        activeTabId: 'untitled-1',
      });

      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const tabs = useEditorStore.getState().tabs;
      expect(tabs).toHaveLength(3);
      expect(tabs[2].fileName).toBe('Untitled3.md');
    });

    it('creates "Untitled.md" when no untitled files exist', () => {
      useEditorStore.setState({
        tabs: [
          {
            id: 'file-1',
            filePath: '/path/to/file.md',
            fileName: 'file.md',
            content: '',
            isDirty: false,
          },
        ],
        activeTabId: 'file-1',
      });

      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const tabs = useEditorStore.getState().tabs;
      expect(tabs).toHaveLength(2);
      expect(tabs[1].fileName).toBe('Untitled.md');
    });

    it('increments from highest number when gaps exist', () => {
      useEditorStore.setState({
        tabs: [
          {
            id: 'untitled-1',
            filePath: '',
            fileName: 'Untitled.md',
            content: '',
            isDirty: false,
          },
          {
            id: 'untitled-3',
            filePath: '',
            fileName: 'Untitled3.md',
            content: '',
            isDirty: false,
          },
        ],
        activeTabId: 'untitled-1',
      });

      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const tabs = useEditorStore.getState().tabs;
      expect(tabs).toHaveLength(3);
      expect(tabs[2].fileName).toBe('Untitled4.md');
    });

    it('handles non-sequential numbers correctly', () => {
      useEditorStore.setState({
        tabs: [
          {
            id: 'untitled-5',
            filePath: '',
            fileName: 'Untitled5.md',
            content: '',
            isDirty: false,
          },
          {
            id: 'untitled-10',
            filePath: '',
            fileName: 'Untitled10.md',
            content: '',
            isDirty: false,
          },
          {
            id: 'untitled-1',
            filePath: '',
            fileName: 'Untitled.md',
            content: '',
            isDirty: false,
          },
        ],
        activeTabId: 'untitled-5',
      });

      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const tabs = useEditorStore.getState().tabs;
      expect(tabs).toHaveLength(4);
      expect(tabs[3].fileName).toBe('Untitled11.md');
    });

    it('creates new tab with empty content and no frontmatter', () => {
      const { result } = renderHook(() => useFileSystem());

      act(() => {
        result.current.newFile();
      });

      const tabs = useEditorStore.getState().tabs;
      expect(tabs[0].content).toBe('');
      expect(tabs[0].isDirty).toBe(false);
      expect(tabs[0].frontmatter).toBeUndefined();
      expect(tabs[0].filePath).toBe('');
    });

    it('generates unique tab IDs with timestamp format', () => {
      const { result } = renderHook(() => useFileSystem());

      // Create first file
      const beforeTime = Date.now();
      act(() => {
        result.current.newFile();
      });
      const afterTime = Date.now();

      const tabs = useEditorStore.getState().tabs;
      expect(tabs).toHaveLength(1);

      const id = tabs[0].id;
      expect(id).toMatch(/^untitled-\d+$/);

      // Extract timestamp from ID
      const timestamp = parseInt(id.replace('untitled-', ''));
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
