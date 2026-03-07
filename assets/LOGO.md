# Logo & App Icon

## Files

- `logo.svg` — The logo mark (no text). Teal color `#44C9AF` on white background.
- `icon-source.svg` — The app icon source: squircle with teal background and white logo mark, 1024×1024.

## Updating the app icon

1. Edit `icon-source.svg` (or `logo.svg` and copy changes across).
2. From the repo root, run:

```bash
# Convert SVG to 1024×1024 PNG
sips -s format png assets/icon-source.svg --out /tmp/icon_1024.png

# Generate all iconset sizes
mkdir -p /tmp/marginal.iconset
sips -z 16  16  /tmp/icon_1024.png --out /tmp/marginal.iconset/icon_16x16.png
sips -z 32  32  /tmp/icon_1024.png --out /tmp/marginal.iconset/icon_16x16@2x.png
sips -z 32  32  /tmp/icon_1024.png --out /tmp/marginal.iconset/icon_32x32.png
sips -z 64  64  /tmp/icon_1024.png --out /tmp/marginal.iconset/icon_32x32@2x.png
sips -z 128 128 /tmp/icon_1024.png --out /tmp/marginal.iconset/icon_128x128.png
sips -z 256 256 /tmp/icon_1024.png --out /tmp/marginal.iconset/icon_128x128@2x.png
sips -z 256 256 /tmp/icon_1024.png --out /tmp/marginal.iconset/icon_256x256.png
sips -z 512 512 /tmp/icon_1024.png --out /tmp/marginal.iconset/icon_256x256@2x.png
sips -z 512 512 /tmp/icon_1024.png --out /tmp/marginal.iconset/icon_512x512.png
cp /tmp/icon_1024.png /tmp/marginal.iconset/icon_512x512@2x.png

# Build .icns and copy all sizes into Tauri icons directory
iconutil -c icns /tmp/marginal.iconset --output src-tauri/icons/icon.icns
sips -z 512 512 /tmp/icon_1024.png --out src-tauri/icons/icon.png
sips -z 32  32  /tmp/icon_1024.png --out src-tauri/icons/32x32.png
sips -z 128 128 /tmp/icon_1024.png --out src-tauri/icons/128x128.png
sips -z 256 256 /tmp/icon_1024.png --out src-tauri/icons/128x128@2x.png
```

3. Rebuild the app (`npm run tauri build` or `npm run tauri dev`) to pick up the new icons.

## Logo mark design notes

- The squircle corner radius is `rx=229` (~22% of 1024px), matching the macOS system icon shape.
- The logo mark is scaled to ~85% of the squircle width using `transform="translate(-696,-388) scale(6.04)"` applied to the original 400×400 coordinate space paths.
- The center cutout in the logo uses `fill="#44C9AF"` to match the background, creating the visual hole in the M shape.
