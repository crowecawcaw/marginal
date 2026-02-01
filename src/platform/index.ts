/**
 * Platform detection and adapter exports
 *
 * This module provides a unified interface for platform-specific functionality,
 * allowing the app to run both as a Tauri desktop app and as a web app.
 */

// Check if we're running in Tauri
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// Export the platform type
export type Platform = "tauri" | "web";

export const getPlatform = (): Platform => {
  return isTauri() ? "tauri" : "web";
};

// Re-export adapters
export * from "./fileSystemAdapter";
export * from "./eventAdapter";
