# marginal - Guide

## Keyboard Shortcuts

| Shortcut | Action |
| -------- | ------ |
| `{mod} N` | New File |
| `{mod} O` | Open File |
| `{mod} S` | Save File |
| `{mod} W` | Close Tab |
| `{mod} B` | Toggle Sidebar (files) |
| `{mod} \` | Toggle Outline |
| `{mod} /` | Toggle Presentation/Code View |
| `{mod} +` | Increase Text Size |
| `{mod} -` | Decrease Text Size |
| `{mod} F` | Find in Document |
| `{mod} ⇧ F` | Format Document (code view only) |
{macos}| `{mod} H` | Hide marginal |
{macos}| `{mod} Q` | Quit marginal |

## Features

### View Modes

- **Rendered View**: See your markdown rendered in real-time
- **Code View**: Edit raw markdown with syntax support
- Toggle between views with `{mod} /`

### Sidebars

- **Files**: Browse and open files from a folder
- **Outline**: Navigate document headings

### Auto-pairing

When typing in code view, brackets and parentheses are automatically paired:

- Type `[` to get `[]`
- Type `(` to get `()`

### Tables

In rendered view, tables support:

- Edit cell content directly
- Right-click context menu to add/delete rows and columns
- Drag table borders to add new rows (bottom) or columns (right)

Use **Format Document** to clean up table alignment in code view.

### Links

In rendered view, click a link to edit it. A tooltip appears with:

- **URL input**: Edit the link destination and press Enter to apply
- **Apply button** (checkmark): Save the new URL
- **Remove button** (X icon): Remove the link, keeping the text
- **Open button** (external arrow): Open the link in your default browser

You can also `{mod} Click` a link to open it directly.

### Document Formatting

Use **Edit > Format Document** (or `{mod} ⇧ F`) to format your markdown, especially useful for tables.

### Unsaved Changes

When closing a file with unsaved changes, you'll be prompted to save:

- **Save**: Save changes before closing
- **Don't Save**: Discard changes and close

## Tips

- Single document? Tabs are hidden automatically
- Untitled files show the first heading as their name
- Blue dot indicates unsaved changes

## More Info

Visit the [marginal GitHub repository](https://github.com/crowecawcaw/marginal) for updates, issues, and more.
