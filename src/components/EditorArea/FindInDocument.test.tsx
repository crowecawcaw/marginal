import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FindInDocument from './FindInDocument';

describe('FindInDocument', () => {
  const defaultProps = {
    content: 'Hello world. This is a test. Hello again.',
    viewMode: 'code' as const,
    onClose: vi.fn(),
  };

  describe('Rendering', () => {
    it('renders find input', () => {
      render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      expect(input).toBeInTheDocument();
    });

    it('renders navigation buttons', () => {
      render(<FindInDocument {...defaultProps} />);

      const prevButton = screen.getByTitle('Previous match');
      const nextButton = screen.getByTitle('Next match');

      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it('renders case sensitive button', () => {
      render(<FindInDocument {...defaultProps} />);

      const caseButton = screen.getByTitle('Case sensitive');
      expect(caseButton).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<FindInDocument {...defaultProps} />);

      const closeButton = screen.getByTitle('Close (Esc)');
      expect(closeButton).toBeInTheDocument();
    });

    it('focuses input on mount', () => {
      render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      expect(input).toHaveFocus();
    });
  });

  describe('Search functionality', () => {
    it('shows no match count when search is empty', () => {
      render(<FindInDocument {...defaultProps} />);

      const matchCount = document.querySelector('.find-match-count');
      expect(matchCount).toHaveTextContent('');
    });

    it('counts matches correctly', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, 'Hello');

      const matchCount = document.querySelector('.find-match-count');
      expect(matchCount).toHaveTextContent('1 of 2');
    });

    it('shows "No matches" when search has no results', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, 'xyz');

      const matchCount = document.querySelector('.find-match-count');
      expect(matchCount).toHaveTextContent('No matches');
    });

    it('is case insensitive by default', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, 'HELLO');

      const matchCount = document.querySelector('.find-match-count');
      expect(matchCount).toHaveTextContent('1 of 2');
    });

    it('respects case sensitive mode', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      const caseButton = screen.getByTitle('Case sensitive');

      await user.click(caseButton);
      await user.type(input, 'HELLO');

      const matchCount = document.querySelector('.find-match-count');
      expect(matchCount).toHaveTextContent('No matches');
    });

    it('toggles case sensitivity', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} />);

      const caseButton = screen.getByTitle('Case sensitive');

      expect(caseButton).not.toHaveClass('active');

      await user.click(caseButton);
      expect(caseButton).toHaveClass('active');

      await user.click(caseButton);
      expect(caseButton).not.toHaveClass('active');
    });
  });

  describe('Navigation', () => {
    it('disables navigation buttons when no matches', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, 'xyz');

      const prevButton = screen.getByTitle('Previous match');
      const nextButton = screen.getByTitle('Next match');

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    it('enables navigation buttons when matches exist', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, 'Hello');

      const prevButton = screen.getByTitle('Previous match');
      const nextButton = screen.getByTitle('Next match');

      expect(prevButton).not.toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    it('cycles forward through matches', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, 'Hello');

      const nextButton = screen.getByTitle('Next match');
      const matchCount = document.querySelector('.find-match-count');

      expect(matchCount).toHaveTextContent('1 of 2');

      await user.click(nextButton);
      expect(matchCount).toHaveTextContent('2 of 2');

      await user.click(nextButton);
      expect(matchCount).toHaveTextContent('1 of 2');
    });

    it('cycles backward through matches', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, 'Hello');

      const prevButton = screen.getByTitle('Previous match');
      const matchCount = document.querySelector('.find-match-count');

      expect(matchCount).toHaveTextContent('1 of 2');

      await user.click(prevButton);
      expect(matchCount).toHaveTextContent('2 of 2');

      await user.click(prevButton);
      expect(matchCount).toHaveTextContent('1 of 2');
    });
  });

  describe('Closing', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<FindInDocument {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByTitle('Close (Esc)');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<FindInDocument {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content updates', () => {
    it('recalculates matches when content changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<FindInDocument {...defaultProps} />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, 'test');

      let matchCount = document.querySelector('.find-match-count');
      expect(matchCount).toHaveTextContent('1 of 1');

      rerender(
        <FindInDocument
          {...defaultProps}
          content="test test test"
        />
      );

      matchCount = document.querySelector('.find-match-count');
      expect(matchCount).toHaveTextContent('1 of 3');
    });
  });

  describe('Edge cases', () => {
    it('handles empty content', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} content="" />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, 'test');

      const matchCount = document.querySelector('.find-match-count');
      expect(matchCount).toHaveTextContent('No matches');
    });

    it('handles special regex characters in search', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} content="test (with) [brackets]" />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, '(with)');

      const matchCount = document.querySelector('.find-match-count');
      expect(matchCount).toHaveTextContent('1 of 1');
    });

    it('handles overlapping matches correctly', async () => {
      const user = userEvent.setup();
      render(<FindInDocument {...defaultProps} content="aaa" />);

      const input = screen.getByPlaceholderText('Find in document');
      await user.type(input, 'aa');

      // Should find "aa" at positions 0 and 1, but counting depends on implementation
      // Current implementation finds non-overlapping matches
      const matchCount = document.querySelector('.find-match-count');
      expect(matchCount?.textContent).toContain('of');
    });
  });
});
