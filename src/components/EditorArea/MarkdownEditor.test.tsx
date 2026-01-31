import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarkdownEditor from './MarkdownEditor';

describe('MarkdownEditor', () => {
  describe('Code View', () => {
    it('renders markdown content in textarea', () => {
      const content = '# Hello World\n\nThis is **bold** text.';
      render(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(content);
    });

    it('calls onChange when typing in code view', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <MarkdownEditor
          initialContent=""
          viewMode="code"
          onChange={onChange}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '# Test');

      expect(onChange).toHaveBeenCalled();
      expect(onChange).toHaveBeenLastCalledWith('# Test');
    });
  });

  describe('Rendered View', () => {
    it('renders the editor with lexical', () => {
      render(
        <MarkdownEditor
          initialContent="# Hello World"
          viewMode="rendered"
          onChange={vi.fn()}
        />
      );

      // Check that the editor container is rendered
      const editor = document.querySelector('.markdown-editor-input');
      expect(editor).toBeInTheDocument();
    });

    it('converts markdown to rendered format', async () => {
      render(
        <MarkdownEditor
          initialContent="# Hello World"
          viewMode="rendered"
          onChange={vi.fn()}
        />
      );

      // Wait for the editor to initialize and render the heading
      await vi.waitFor(() => {
        const heading = document.querySelector('.editor-heading-h1');
        expect(heading).toBeInTheDocument();
        expect(heading?.textContent).toBe('Hello World');
      });
    });

    it('converts bold markdown to rendered format', async () => {
      render(
        <MarkdownEditor
          initialContent="This is **bold** text"
          viewMode="rendered"
          onChange={vi.fn()}
        />
      );

      await vi.waitFor(() => {
        const bold = document.querySelector('.editor-text-bold');
        expect(bold).toBeInTheDocument();
        expect(bold?.textContent).toBe('bold');
      });
    });

    it('converts italic markdown to rendered format', async () => {
      render(
        <MarkdownEditor
          initialContent="This is *italic* text"
          viewMode="rendered"
          onChange={vi.fn()}
        />
      );

      await vi.waitFor(() => {
        const italic = document.querySelector('.editor-text-italic');
        expect(italic).toBeInTheDocument();
        expect(italic?.textContent).toBe('italic');
      });
    });

    it('converts list markdown to rendered format', async () => {
      render(
        <MarkdownEditor
          initialContent="- Item 1\n- Item 2\n- Item 3"
          viewMode="rendered"
          onChange={vi.fn()}
        />
      );

      await vi.waitFor(() => {
        const list = document.querySelector('.editor-list-ul');
        expect(list).toBeInTheDocument();
        const items = document.querySelectorAll('.editor-list-item');
        expect(items.length).toBeGreaterThan(0);
      });
    });
  });

  describe('View Mode Switching', () => {
    it('preserves content when switching from code to rendered', async () => {
      const content = '# Test Heading';
      const { rerender } = render(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />
      );

      // Switch to rendered view
      rerender(
        <MarkdownEditor
          initialContent={content}
          viewMode="rendered"
          onChange={vi.fn()}
        />
      );

      await vi.waitFor(() => {
        const heading = document.querySelector('.editor-heading-h1');
        expect(heading).toBeInTheDocument();
        expect(heading?.textContent).toBe('Test Heading');
      });
    });

    it('preserves content when switching from rendered to code', async () => {
      const content = '# Test Heading';
      const { rerender } = render(
        <MarkdownEditor
          initialContent={content}
          viewMode="rendered"
          onChange={vi.fn()}
        />
      );

      // Wait for initial render
      await vi.waitFor(() => {
        const heading = document.querySelector('.editor-heading-h1');
        expect(heading).toBeInTheDocument();
      });

      // Switch to code view
      rerender(
        <MarkdownEditor
          initialContent={content}
          viewMode="code"
          onChange={vi.fn()}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(content);
    });
  });
});
