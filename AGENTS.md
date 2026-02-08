# Agent Rules

## Build Verification

Run these commands to verify changes before committing:

```bash
npm run build        # TypeScript check + Vite production build
npx vitest run       # Run all tests (316 tests across 26 files)
```

The `build` script runs `tsc && vite build`, so it catches both type errors and bundling issues.

CI workflows (in `.github/workflows/`):
- **deploy-pages.yml** (runs on push to main): `npm ci` → `npm run build:web` (web build with `WEB_BUILD=true`)
- **build.yml** (manual dispatch): `npm ci` → `npm run tauri build` (desktop app build, requires Rust)

Note: `npm run build:web` sets `WEB_BUILD=true` for both `tsc` and `vite build`. Neither CI workflow runs tests, so always run `npx vitest run` locally.

## App Naming

The app name is **marginal** (lowercase). Always use lowercase when referring to the app in code, documentation, UI, and file names.

## Testing Philosophy

Write effective tests that are simple and give high confidence:

- **Unit tests** for data transformation functions (e.g., presentation ↔ code view conversions)
- **E2E tests** for high-level functionality (e.g., click table cell → type → convert to code view → convert back → verify text matches)
- **Avoid excessive mocking** - prefer real implementations when practical
- **Refactor for testability** when it simplifies testing

## Behavior Tracking

The README.md contains a comprehensive Specs section that lists all implemented behaviors with test coverage indicators. When implementing features, check off items in this list and ensure they have solid test coverage.

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
