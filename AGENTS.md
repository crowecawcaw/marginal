# Agent Rules

## App Naming

The app name is **marginal** (lowercase). Always use lowercase when referring to the app in code, documentation, UI, and file names.

## Testing Philosophy

Write effective tests that are simple and give high confidence:

- **Unit tests** for data transformation functions (e.g., presentation ↔ code view conversions)
- **Integration tests** for high-level functionality (e.g., click table cell → type → convert to code view → convert back → verify text matches)
- **Avoid excessive mocking** - prefer real implementations when practical
- **Refactor for testability** when it simplifies testing

## Editor Testing with EditorTestHarness

**Always use `EditorTestHarness` for testing editor behaviors.** Do not create custom test patterns or import Lexical directly in tests.

The harness provides:

- **End-to-end testing** - Tests render the full MarkdownEditor component
- **Implementation independence** - Query helpers use CSS classes, not Lexical internals
- **View switching** - Built-in methods for testing roundtrip conversions
- **User interactions** - Type, keyboard shortcuts, and click helpers

### Example Usage

```tsx
import { EditorTestHarness } from "../../../test/EditorTestHarness";

describe("Feature Tests", () => {
  let h: EditorTestHarness;

  afterEach(() => {
    h?.destroy();
  });

  it("preserves formatting through view switches", async () => {
    h = await EditorTestHarness.create("This is **bold** text");

    expect(h.query.boldTexts()).toEqual(["bold"]);

    await h.toggleView(); // Switch to code view
    expect(h.getCodeViewText()).toContain("**bold**");

    await h.toggleView(); // Back to rendered view
    expect(h.query.boldTexts()).toEqual(["bold"]);
  });
});
```

### Query Methods

Use `h.query.*` to assert on rendered content:

- `heading(level)` - Get heading text
- `boldTexts()`, `italicTexts()`, `codeTexts()`, `strikethroughTexts()` - Get formatted inline text
- `links()` - Get links with text and href
- `tableData()` - Get table as 2D array
- `tableCell(row, col)` - Get specific table cell element
- `paragraphs()`, `listItems()`, `blockquoteTexts()`, `codeBlockTexts()` - Get block content
- `hasList(type)`, `hasTable()`, `hasBlockquote()`, `hasCodeBlock()` - Check for element presence

### Interaction Methods

- `toggleView()` - Switch between rendered and code views
- `setViewMode(mode)` - Set specific view mode
- `roundtrip()` - Test rendered → code → rendered
- `type(text)` - Type text into editor
- `pressKey(key, modifiers)` - Press keyboard shortcut
- `bold()`, `italic()`, `heading(level)` - Format shortcuts
- `clickCell(row, col)` - Click table cell

### Anti-patterns

❌ **Don't** import Lexical in test files:
```tsx
import { $getRoot } from "lexical"; // NO
```

❌ **Don't** create custom LexicalComposer setups:
```tsx
render(<LexicalComposer config={...}>); // NO
```

❌ **Don't** query Lexical nodes directly:
```tsx
editor.getEditorState().read(() => { ... }); // NO
```

✅ **Do** use the harness and query helpers:
```tsx
const h = await EditorTestHarness.create("# Title");
expect(h.query.heading(1)).toBe("Title");
```

See existing tests in `src/components/EditorArea/__tests__/` for reference patterns.

## Behavior Tracking

The README.md contains a comprehensive Specs section that lists all implemented behaviors with test coverage indicators. When implementing features, check off items in this list and ensure they have solid test coverage.

## React useEffect Guidelines

### Prefer derived values over useEffect

If a value can be computed from existing props or state, use `useMemo` instead of `useEffect` + `setState`. The useEffect pattern causes an extra render cycle on every change.

```tsx
// BAD: extra render per keystroke
const [total, setTotal] = useState(0);
useEffect(() => {
  setTotal(items.filter(predicate).length);
}, [items, predicate]);

// GOOD: computed in the same render
const total = useMemo(() => items.filter(predicate).length, [items, predicate]);
```

### Prefer editorState initializer over useEffect for Lexical

Set initial editor content via the `editorState` callback in `initialConfig`, not via a useEffect that runs after mount. The initializer runs synchronously during construction, before any plugin useEffect fires, which eliminates race conditions with transform registration.

```tsx
// BAD: race condition with plugins that register transforms
useEffect(() => { editor.update(() => { ... }); setInitialized(true); }, []);

// GOOD: runs before any useEffect
const initialConfig = { editorState: () => { /* populate root */ }, ... };
```

### Legitimate useEffect uses

- Subscribing to external events (keyboard, resize, media queries)
- Focusing a DOM element on mount
- Syncing with browser APIs (IntersectionObserver, etc.)

## CSS Patterns

### No CSS in JavaScript

All styling in CSS files. Only exception: dynamic runtime values via CSS custom properties.

```tsx
// GOOD: Dynamic value as CSS variable
<div style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}>

// BAD: Inline styling
<div style={{ width: `${width}px` }}>
```

### Variable Naming

Pattern: `--{category}-{element}-{state}`

Categories: `color`, `size`, `shadow`, `font-family`, `radius`, `transition`

Examples: `--color-bg-primary`, `--color-text-secondary`, `--color-accent-primary-hover`, `--size-indent-base`

### Color Variables

All defined in `src/styles.css` with light/dark mode variants:
- Base: `--color-bg-*`, `--color-text-*`, `--color-border-*`, `--color-accent-*`
- Status: `--color-status-{success|error|info|warning}[-bg]`
- Syntax: `--color-syntax-{comment|keyword|string|...}`
- Toggle: `--color-toggle-{bg|text}[-hover|-active]`

Use explicit variants (`--color-accent-primary-hover`) not CSS functions (limited browser support).

### Dynamic Styles

Pass runtime values as CSS variables, calculate in CSS:

```tsx
<div style={{ '--depth': depth } as React.CSSProperties}>
```
```css
.item { padding-left: calc(var(--depth, 0) * var(--size-indent-base)); }
```

### Adding Styles

1. Check `src/styles.css` for existing variables
2. Follow naming convention
3. Define light + dark mode for colors
4. Never hardcode colors
5. Test both themes
