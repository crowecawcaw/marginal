# Evaluate Milkdown as Lexical Replacement

## Context

The project currently uses **Lexical v0.22.0** (Meta's rich text editor framework) as the foundation for a dual-mode markdown editor (WYSIWYG "rendered" view + plain-text "code" view). The editor has 12 custom plugins, a custom test harness, and 16 test files. The ask is to evaluate whether **Milkdown** (a ProseMirror + Remark-based markdown editor framework) would be a viable replacement.

## Current Architecture Summary

- **Core**: Lexical v0.22.0 with 7 `@lexical/*` packages
- **Editor component**: `src/components/EditorArea/MarkdownEditor.tsx` — dual-mode (rendered + code view)
- **12 custom plugins** in `src/components/EditorArea/plugins/`
- **Custom table transformer** for GFM tables with inline markdown
- **Prism.js** syntax highlighting for code blocks + code view overlay
- **State flow**: Zustand store ↔ markdown string ↔ Lexical editor
- **Test harness**: `src/test/EditorTestHarness.ts` — queries DOM by Lexical CSS classes

---

## Feature-by-Feature Comparison

| Feature | Current (Lexical) | Milkdown | Notes |
|---|---|---|---|
| **Markdown parsing** | `@lexical/markdown` transformers | Built on Remark (native) | Milkdown's Remark foundation is more robust for markdown |
| **GFM tables** | Custom `tableTransformer.ts` + placeholder hack | `@milkdown/preset-gfm` built-in | Milkdown handles tables natively; no placeholder workaround needed |
| **Code blocks + syntax highlighting** | `@lexical/code` + Prism.js | Crepe uses CodeMirror 6 integration | CodeMirror 6 is more capable but adds bundle weight |
| **Bold/italic/strikethrough** | Lexical FORMAT_TEXT_COMMAND | Built into commonmark + GFM presets | Equivalent |
| **Headings** | HeadingNode from `@lexical/rich-text` | Built into commonmark preset | Equivalent |
| **Lists (ordered/unordered)** | `@lexical/list` + ListPlugin | Built into commonmark preset | Equivalent |
| **Links** | `@lexical/link` + custom LinkEditPlugin | Built into commonmark preset | May need custom tooltip plugin |
| **Block quotes** | QuoteNode from `@lexical/rich-text` | Built into commonmark preset | Equivalent |
| **Undo/redo** | HistoryPlugin | ProseMirror history plugin | Equivalent |
| **Keyboard shortcuts** | Custom per-plugin (Cmd+B, Cmd+I, etc.) | Crepe includes toolbar + shortcuts | Mostly equivalent; custom ones need reimplementation |
| **Markdown shortcuts** | MarkdownShortcutPlugin (e.g., `# ` for heading) | ProseMirror input rules | Equivalent (Milkdown uses ProseMirror input rules) |
| **Table context menu** | Custom TableContextMenuPlugin | Crepe includes table editing UI | Milkdown's Crepe has built-in table manipulation |
| **Table resize handles** | Custom TableResizePlugin | Crepe includes drag-to-resize | Built-in with Crepe |
| **Find in document** | Custom FindInDocument component | Not built-in | **Would need custom implementation** |
| **Dual view (WYSIWYG + code)** | Two separate Lexical instances | Not built-in | **Would need custom implementation** — Milkdown is WYSIWYG-only |
| **Code view syntax overlay** | Custom MarkdownSyntaxHighlightPlugin | N/A | **Lost** — tied to dual-view architecture |
| **Bracket auto-pairing (code view)** | Custom BracketPairingPlugin | N/A | **Lost** — tied to code view |
| **Smart indentation (code view)** | Custom CodeIndentPlugin | N/A | **Lost** — tied to code view |
| **Code view formatting (Cmd+B wraps `**`)** | Custom CodeViewFormattingPlugin | N/A | **Lost** — tied to code view |
| **Document formatting (Prettier)** | Cmd+Shift+F formats via Prettier | Would need reimplementation | Milkdown stores markdown natively, so Prettier could still format |
| **Mermaid diagrams** | Custom MermaidBlock rendering | Plugin available (`@milkdown/plugin-diagram`) | Equivalent or better |
| **LaTeX/math** | Not implemented | Crepe includes KaTeX support | **Gain** |
| **Collaborative editing** | Not implemented | Y.js plugin available | **Gain** (if needed later) |

---

## What You'd Lose

1. **Dual view (code + rendered)** — This is the biggest loss. Milkdown is WYSIWYG-only. The entire "code view" with its syntax overlay, bracket pairing, smart indentation, and markdown-syntax formatting shortcuts would need to be rebuilt from scratch or dropped. This is 4 custom plugins and a core UX pattern.

2. **Find in document** — The custom `FindInDocument` component would need reimplementation against ProseMirror's API instead of Lexical's.

3. **Fine-grained Lexical DOM control** — The test harness queries Lexical's CSS classes (`.editor-heading-h1`, `.editor-text-bold`, etc.). With Milkdown/ProseMirror, the DOM structure and class naming is entirely different — the harness would need a full rewrite.

4. **Code view specific features** — Bracket pairing, smart indentation, Prism syntax overlay on raw markdown — all of these are code-view-only features with no Milkdown equivalent.

## What You'd Gain

1. **Native markdown round-tripping** — Remark handles markdown ↔ AST ↔ DOM natively. No more custom table placeholder hacks or lossy transformers.
2. **Better table support** — Crepe includes interactive table editing, drag-to-resize, and proper GFM export out of the box.
3. **CodeMirror 6 for code blocks** — More capable than Prism for in-editor code blocks.
4. **LaTeX/math rendering** — Available via Crepe's KaTeX module.
5. **Mermaid diagram plugin** — Available as `@milkdown/plugin-diagram`.
6. **Collaborative editing readiness** — Y.js integration available if needed.
7. **Simpler plugin model** — Less custom code to maintain; many current plugins become built-in.

---

## Testing Impact

### Current test setup
- 16 test files, Vitest + jsdom + @testing-library/react
- Custom `EditorTestHarness` that queries Lexical-specific CSS classes
- Roundtrip tests (rendered → code → rendered) that rely on dual-view architecture

### Impact of switching to Milkdown
- **EditorTestHarness**: Full rewrite required. CSS class selectors, editor instance access (`__lexicalEditor`), and Lexical-specific APIs (`$getRoot`, `$isTextNode`, etc.) all change.
- **Roundtrip tests**: The concept changes entirely — there's no code view to roundtrip through. Roundtrip testing would instead test markdown → ProseMirror doc → markdown serialization fidelity.
- **DOM mocking**: Similar challenges — ProseMirror also needs `getBoundingClientRect` stubs in jsdom. The Milkdown team confirms Vitest + jsdom works but with mocks.
- **Plugin tests**: All 12 plugin test files become irrelevant (plugins are replaced by Milkdown built-ins or dropped). New tests would be needed for any custom Milkdown plugins.
- **Integration tests** (EditorArea.e2e.test.tsx): Would need rewrite but the patterns (tab management, dirty state) are editor-agnostic and should transfer.

**Bottom line**: ~80% of editor tests would need rewriting. The store/file-system/layout tests are unaffected.

---

## Migration Effort Estimate

| Area | Effort | Notes |
|---|---|---|
| Core editor swap (MarkdownEditor.tsx) | Medium | Replace Lexical composers with Milkdown/Crepe setup |
| Remove 12 Lexical plugins | Low | Delete files, most features become built-in |
| Rebuild Find in Document | Medium | Reimplement against ProseMirror API |
| Code view (standalone CodeMirror 6) | **Medium-High** | Replace Lexical code view with CodeMirror 6; reimplement bracket pairing, smart indent, syntax overlay |
| Theme/CSS migration | Medium | Map ProseMirror output classes to existing styles |
| EditorTestHarness rewrite | High | New DOM queries, new editor access patterns |
| Rewrite ~16 test files | High | New assertions against ProseMirror DOM structure |
| Store integration | Low | `onChange` → `getMarkdown()` pattern is straightforward |

**Overall: This is a large migration** — primarily because of the dual-view architecture and extensive test suite. If the code view is dropped, it's more manageable.

---

## Recommendation

Milkdown is a strong choice. Its markdown-native architecture eliminates several current pain points (table placeholder hacks, lossy roundtrips) and provides better built-in features.

**Approach: Hybrid** — Use Milkdown/Crepe for the rendered view and a standalone CodeMirror 6 instance for the code view. Milkdown already bundles CodeMirror for its code blocks, so the dependency is shared. This preserves both editing modes while gaining Milkdown's superior markdown handling.

---

## Verification Plan

If proceeding with migration:
1. Create a proof-of-concept branch with Milkdown/Crepe replacing the rendered editor
2. Verify markdown roundtrip fidelity (markdown → editor → getMarkdown) for all current test fixtures
3. Confirm GFM table support works without custom transformers
4. Test keyboard shortcuts (Cmd+B, Cmd+I, headings)
5. Verify Mermaid diagram rendering
6. Run existing store/layout tests to confirm they're unaffected
7. Verify code view (standalone CodeMirror 6) integrates with Milkdown's markdown output
