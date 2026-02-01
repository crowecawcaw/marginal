import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// Check if we're building for web (GitHub Pages) or Tauri
// @ts-expect-error process is a nodejs global
const isWebBuild = process.env.WEB_BUILD === 'true';

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Base path for GitHub Pages deployment
  // When building for web, use the repo name as base path
  base: isWebBuild ? '/marginal/' : '/',

  // Define global constants
  define: {
    // This helps code know at build time if it's a web build
    '__WEB_BUILD__': JSON.stringify(isWebBuild),
  },

  // Build options
  build: {
    // Ensure assets are properly referenced
    assetsDir: 'assets',
    // Generate sourcemaps for debugging
    sourcemap: !isWebBuild,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
