# marginal

A lightweight desktop markdown editor with multiple viewing modes, built with Tauri and React.

## Features

- **Multiple View Modes**: Edit, code, and presentation views for different workflows
- **Document Outline**: Automatic outline generation from markdown headings
- **Tab Management**: Work with multiple documents simultaneously
- **File Operations**: Open, save, and manage markdown files
- **Syntax Highlighting**: Code blocks with Prism.js support
- **Mermaid Diagrams**: Render diagrams directly in your documents
- **Frontmatter Support**: YAML metadata at the top of documents
- **Keyboard Shortcuts**: Full keyboard navigation and commands

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run tauri dev        # Desktop app with hot-reload
npm run dev              # Web-only mode

# Production
npm run tauri build      # Desktop app (outputs to src-tauri/target/release/bundle/)
npm run build            # Web build

# Testing
npm test                 # Run tests
npm run test:ui          # Vitest UI
```

## Tech Stack

Tauri 2 • React 19 • TypeScript • Lexical • Vite • Zustand

## Specs

Comprehensive list of implemented behaviors for agent reference. Check of each item as it's implemented and has solid tests.

- [ ] File Operations
  - [ ] Open files via dialog (markdown files only)
  - [ ] Open folders and display file tree
  - [ ] Save existing files
  - [ ] Save As for untitled files with dialog
  - [x] Create new files with automatic Untitled numbering (Untitled.md, Untitled2.md, etc.)
  - [ ] Track recent files (up to 10)
  - [x] Persist last opened folder across sessions
  - [ ] Hidden files and folders (starting with `.`) are excluded from file tree
  - [x] Frontmatter in markdown files is parsed on open and preserved on save
  - [ ] File tree displays folders first, then files, both sorted alphabetically
  - [ ] Print document via File menu
- [x] Editor Views
  - [x] Two view modes: rendered (presentation/WYSIWYG) and code (plain text)
  - [x] Toggle between views with Cmd/Ctrl+Shift+P or view toggle buttons
  - [x] Rendered view uses Lexical rich text editor with live markdown rendering
  - [x] Code view shows raw markdown in plain text editor
  - [x] Content persists when switching between views
- [x] Tab Management
  - [x] Multiple tabs for working with multiple documents
  - [x] Switch between tabs by clicking tab headers
  - [x] Close tabs with close button or Cmd/Ctrl+W
  - [x] Dirty indicator (•) appears when tab has unsaved changes
  - [ ] Unsaved tabs show "Unsaved" in document title
  - [x] When closing a tab, the previous tab becomes active
  - [ ] When no tabs exist, a blank Untitled file is created automatically
  - [ ] For untitled files, tab name updates to first heading when user types one
- [x] Markdown Features
  - [x] Headings (H1-H6) render with proper styling
  - [x] Lists (ordered and unordered) with proper indentation
  - [x] Pressing Enter at end of empty list item exits the list
  - [ ] Links render as clickable in rendered view
  - [x] Inline code with backticks renders with monospace styling
  - [ ] Code blocks with language syntax highlighting (Prism.js)
  - [ ] Block quotes render with left border styling
  - [x] Tables render with proper grid layout
  - [ ] Mermaid code blocks render as diagrams in rendered view
- [x] Table Editing
  - [x] Tables are editable in rendered view
  - [x] Users can edit content inline in table cells
  - [x] Inline formatting (code, bold, italic, etc.) works inside cells
  - [ ] Right-click on table cells opens context menu
  - [ ] Context menu actions
    - [ ] Insert row above
    - [ ] Insert row below
    - [ ] Insert column left
    - [ ] Insert column right
    - [ ] Delete row
    - [ ] Delete column
  - [ ] Tables can be resized by dragging column edges
  - [ ] Insert table via Cmd/Ctrl+Shift+T shortcut
  - [x] Tables convert to/from markdown format when switching views
  - [x] Inline formatting persists when switching between views
- [ ] Outline
  - [ ] Outline auto-generates from markdown headings (H1-H6)
  - [ ] Outline displays hierarchically with indentation based on heading level
  - [ ] Clicking outline item scrolls to that heading in rendered view
  - [ ] Outline shows "No headings found" when document has no headings
  - [ ] Toggle outline visibility with Cmd/Ctrl+\
  - [ ] Outline width is resizable and persists across sessions
  - [ ] Outline view is open by default on app launch
- [x] Find in Document
  - [x] Open find dialog with Cmd/Ctrl+F
  - [x] Search is case-insensitive by default
  - [x] Toggle case-sensitive search with button
  - [x] Navigate through matches with previous/next buttons
  - [x] Match counter shows current match and total (e.g., "1 of 5")
  - [x] Shows "No matches" when search has no results
  - [x] Navigation buttons disabled when no matches
  - [x] Close find dialog with Escape or close button
  - [x] Match count updates as content changes
- [x] Document Formatting
  - [x] Format document with Cmd/Ctrl+Shift+F (Prettier)
  - [x] Formatting only available in code view (error shown if in rendered view)
  - [x] Formatting marks document as dirty
  - [x] Formatting settings: preserve prose wrap, 120 character print width
- [x] Settings Persistence
  - [x] Sidebar visibility persists across sessions
  - [x] Sidebar width persists across sessions
  - [x] Outline visibility persists across sessions
  - [x] Outline width persists across sessions
  - [x] Last opened folder path persists across sessions
  - [x] Recent files list persists across sessions (up to 10 files)
- [ ] UI/UX
  - [ ] Loading overlay with message during long operations
  - [ ] Toast notifications for success/error messages
  - [ ] File tree with expandable/collapsible folders
  - [ ] File tree shows emoji icons (📁 folder, 📂 open folder, 📝 markdown, 📄 other)
  - [ ] Icon bar for switching between file tree and outline views
  - [ ] Sidebar is resizable by dragging edge
  - [ ] Document title in browser/window updates based on active tab name
  - [ ] Empty state messages when no files/folders opened
- [ ] Platform Support
  - [ ] Desktop app via Tauri (macOS, Windows, Linux)
  - [ ] Web compatibility mode (with download instead of save)
  - [ ] Native file dialogs on desktop
  - [ ] File download functionality in web mode
