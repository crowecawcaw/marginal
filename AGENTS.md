# Agent Rules

## Unit Testing Requirement

**Add unit tests for every change.**

When implementing features or making changes to the codebase, you must create corresponding unit tests to verify the functionality works as expected.

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
