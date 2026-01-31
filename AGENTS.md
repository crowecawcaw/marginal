# Agent Workflow & Task Tracking

This document tracks the development progress for the Marginal markdown editor and provides instructions for AI agents working on this project.

## Instructions for Agents

When working on this project:

1. **Pick off a chunk**: Review the "Tasks" section below and select an unchecked task to work on
2. **Create todos**: Use the TodoWrite tool to create specific subtasks for your work
3. **Track progress**: Mark each todo as `in_progress` when starting, `completed` when done
4. **Update this file**: Check off completed tasks in the "Tasks" section below
5. **Commit work**: Commit your changes with clear commit messages when complete

## Development Status

Current Phase: **Phase 1 - Project Setup**

## Tasks

### Phase 1: Project Setup
- [x] Initialize Tauri project with recommended template
- [ ] Set up Vite + React 19 + TypeScript configuration
- [ ] Configure Jest for testing
- [ ] Create basic app window layout structure
- [ ] Set up Zustand stores (editorStore, fileStore)
- [ ] Create initial component folder structure
- [ ] Add ESLint and Prettier configuration
- [ ] Set up initial TypeScript types/interfaces

### Phase 2: File System & Sidebar
- [ ] Create Sidebar layout component (collapsible, resizable)
- [ ] Implement icon bar navigation (files, search, TOC tabs)
- [ ] Create FileTree component
- [ ] Implement Tauri file system commands (read, write, dialog)
- [ ] Add recent files tracking
- [ ] Create file operations hooks (useFileSystem)
- [ ] Test file tree navigation and file operations

### Phase 3: Lexical Editor Integration
- [ ] Set up Lexical editor with React integration
- [ ] Configure markdown plugin for Lexical
- [ ] Create MarkdownEditor component
- [ ] Implement EditorTabs component
- [ ] Add tab management (open, close, switch)
- [ ] Implement frontmatter parsing with gray-matter
- [ ] Add save functionality with unsaved changes indicator
- [ ] Create keyboard shortcuts hook

### Phase 4: Markdown Features
- [ ] Add syntax highlighting for code blocks
- [ ] Implement table of contents generation from headers
- [ ] Create MermaidBlock component
- [ ] Integrate mermaid.js for diagram rendering
- [ ] Add search functionality across files
- [ ] Test all markdown rendering features

### Phase 5: Keyboard Shortcuts & Polish
- [ ] Implement global keyboard shortcuts via Tauri
- [ ] Add Cmd/Ctrl+N (new file)
- [ ] Add Cmd/Ctrl+O (open file)
- [ ] Add Cmd/Ctrl+S (save)
- [ ] Add Cmd/Ctrl+W (close tab)
- [ ] Add Cmd/Ctrl+B (toggle sidebar)
- [ ] Add Cmd/Ctrl+Shift+F (search in files)
- [ ] Add markdown editing shortcuts (bold, italic, etc.)
- [ ] Implement error handling and user feedback
- [ ] Add loading states for file operations
- [ ] Create settings persistence (recent files, window size, etc.)
- [ ] Write unit tests for utilities
- [ ] Write integration tests for key user flows

## Current Work Log

### 2026-01-31
- ✅ Created README.md with project architecture and plan
- ✅ Created AGENTS.md for task tracking
- ✅ Initialized Tauri project with TypeScript template (vanilla-ts)

---

## Notes for Future Agents

- Keep changes focused on the task at hand
- Write tests for new functionality
- Update this file when completing tasks
- Check README.md for architecture decisions and patterns
- Manual save only - no auto-save
- Desktop app only - no web compatibility needed
- Frontmatter support is required (YAML at top of files)
- Mermaid diagram rendering is a core feature

## Current Blockers

None

## Questions / Decisions Needed

None
