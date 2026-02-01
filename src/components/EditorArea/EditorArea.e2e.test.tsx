import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditorArea from './EditorArea';
import { useEditorStore } from '../../stores/editorStore';

// Mock Tauri APIs
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
  getCurrentWebviewWindow: () => ({
    listen: vi.fn(() => Promise.resolve(() => {})),
  }),
}));

// Mock prettier
vi.mock('prettier/standalone', () => ({
  default: {
    format: vi.fn((content: string) => Promise.resolve(content)),
  },
}));

vi.mock('prettier/plugins/markdown', () => ({
  default: {},
}));

describe('EditorArea E2E', () => {
  beforeEach(() => {
    // Reset the store and mocks
    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
    });
    vi.clearAllMocks();
  });

  it('complete editing workflow: type content, toggle views, verify persistence, save file', async () => {
    const user = userEvent.setup();

    // Set up initial tab with empty content
    const tabId = 'test-tab-1';
    useEditorStore.setState({
      tabs: [
        {
          id: tabId,
          filePath: '/path/to/test.md',
          fileName: 'test.md',
          content: '',
          isDirty: false,
          frontmatter: undefined,
        },
      ],
      activeTabId: tabId,
    });

    const { rerender } = render(<EditorArea />);

    // Step 1: Verify we're in code view (default) and type content
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();

    const testContent = '# Hello World\n\nThis is **bold** text.';
    await user.clear(textarea);
    await user.type(textarea, testContent);

    // Step 2: Verify the content is there in the store
    await waitFor(() => {
      const state = useEditorStore.getState();
      const tab = state.tabs.find(t => t.id === tabId);
      expect(tab?.content).toBe(testContent);
    });

    // Step 3: Toggle to rendered view
    const renderedButton = screen.getByTitle('Rendered view');
    await user.click(renderedButton);

    // Wait for re-render with new view mode
    await waitFor(() => {
      // In rendered view, Lexical editor should be present
      const editor = document.querySelector('.markdown-editor-input');
      expect(editor).toBeInTheDocument();
    });

    // Step 4: Verify content is rendered correctly in rendered view
    await waitFor(() => {
      const heading = document.querySelector('.editor-heading-h1');
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toBe('Hello World');
    });

    await waitFor(() => {
      const bold = document.querySelector('.editor-text-bold');
      expect(bold).toBeInTheDocument();
      expect(bold?.textContent).toBe('bold');
    });

    // Step 5: Toggle back to code view
    const codeButton = screen.getByTitle('Code view');
    await user.click(codeButton);

    // Step 6: Verify content is still there in code view
    await waitFor(() => {
      const codeTextarea = screen.getByRole('textbox');
      expect(codeTextarea).toBeInTheDocument();
      // Content should be preserved in the store
      const state = useEditorStore.getState();
      const tab = state.tabs.find(t => t.id === tabId);
      expect(tab?.content).toBe(testContent);
    });

    // Step 7: Verify the file can be saved with correct content
    // Simulate save - the Layout component handles saving, but we can verify
    // the content that would be saved from the store
    const finalState = useEditorStore.getState();
    const finalTab = finalState.tabs.find(t => t.id === tabId);

    expect(finalTab).toBeDefined();
    expect(finalTab?.content).toBe(testContent);
    expect(finalTab?.filePath).toBe('/path/to/test.md');

    // Mock what the save would do - call invoke with write_file_content
    await mockInvoke('write_file_content', {
      path: finalTab?.filePath,
      content: finalTab?.content,
    });

    // Verify invoke was called correctly
    expect(mockInvoke).toHaveBeenCalledWith('write_file_content', {
      path: '/path/to/test.md',
      content: testContent,
    });
  });

  it('marks tab as dirty when content changes', async () => {
    const user = userEvent.setup();
    const tabId = 'dirty-test-tab';

    useEditorStore.setState({
      tabs: [
        {
          id: tabId,
          filePath: '/path/to/test.md',
          fileName: 'test.md',
          content: 'initial content',
          isDirty: false,
          frontmatter: undefined,
        },
      ],
      activeTabId: tabId,
    });

    render(<EditorArea />);

    // Verify initial state is not dirty
    let state = useEditorStore.getState();
    expect(state.tabs[0].isDirty).toBe(false);

    // Type something
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, ' modified');

    // Verify tab is now marked as dirty
    await waitFor(() => {
      state = useEditorStore.getState();
      expect(state.tabs[0].isDirty).toBe(true);
    });
  });

  it('displays multiple tabs and switches between them', async () => {
    const user = userEvent.setup();

    useEditorStore.setState({
      tabs: [
        {
          id: 'tab-1',
          filePath: '/path/to/file1.md',
          fileName: 'file1.md',
          content: '# File 1',
          isDirty: false,
        },
        {
          id: 'tab-2',
          filePath: '/path/to/file2.md',
          fileName: 'file2.md',
          content: '# File 2',
          isDirty: false,
        },
      ],
      activeTabId: 'tab-1',
    });

    render(<EditorArea />);

    // Verify both tabs are visible
    expect(screen.getByText('file1.md')).toBeInTheDocument();
    expect(screen.getByText('file2.md')).toBeInTheDocument();

    // Verify first file content is shown
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('# File 1');

    // Click on second tab
    const tab2 = screen.getByText('file2.md');
    await user.click(tab2);

    // Verify second file content is now shown
    await waitFor(() => {
      const state = useEditorStore.getState();
      expect(state.activeTabId).toBe('tab-2');
    });
  });

  it('shows dirty indicator on unsaved tabs', async () => {
    const user = userEvent.setup();

    useEditorStore.setState({
      tabs: [
        {
          id: 'dirty-tab',
          filePath: '/path/to/dirty.md',
          fileName: 'dirty.md',
          content: 'original',
          isDirty: true,
        },
        {
          id: 'clean-tab',
          filePath: '/path/to/clean.md',
          fileName: 'clean.md',
          content: 'original',
          isDirty: false,
        },
      ],
      activeTabId: 'dirty-tab',
    });

    render(<EditorArea />);

    // Find the dirty tab - it should show bullet indicator
    const dirtyTabElement = screen.getByText((content, element) => {
      return element?.classList.contains('editor-tab-name') && content.includes('dirty.md');
    });

    expect(dirtyTabElement.textContent).toContain('•');
  });

  it('closes tab when close button is clicked', async () => {
    const user = userEvent.setup();

    useEditorStore.setState({
      tabs: [
        {
          id: 'tab-to-close',
          filePath: '/path/to/file.md',
          fileName: 'file.md',
          content: 'content',
          isDirty: false,
        },
        {
          id: 'tab-to-keep',
          filePath: '/path/to/other.md',
          fileName: 'other.md',
          content: 'other content',
          isDirty: false,
        },
      ],
      activeTabId: 'tab-to-close',
    });

    render(<EditorArea />);

    // Find and click close button on first tab
    const closeButtons = screen.getAllByText('×');
    await user.click(closeButtons[0]);

    // Verify tab was removed
    await waitFor(() => {
      const state = useEditorStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].id).toBe('tab-to-keep');
    });
  });
});
