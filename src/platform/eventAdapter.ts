/**
 * Event Adapter
 *
 * Provides a unified interface for app events that works
 * in both Tauri (desktop) and web browser environments.
 */

import { isTauri } from "./index";

// Event callback type - payload is optional
export type EventCallback<T = void> = (payload?: T) => void;
type UnlistenFn = () => void;

// Web event emitter singleton
class WebEventEmitter {
  private listeners: Map<string, Set<EventCallback<unknown>>> = new Map();

  on<T = void>(event: string, callback: EventCallback<T>): UnlistenFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
    };
  }

  emit<T = void>(event: string, payload?: T) {
    this.listeners.get(event)?.forEach((callback) => {
      if (payload !== undefined) {
        callback(payload);
      } else {
        (callback as () => void)();
      }
    });
  }
}

let webEventEmitter: WebEventEmitter | null = null;

export const getWebEventEmitter = (): WebEventEmitter => {
  if (!webEventEmitter) {
    webEventEmitter = new WebEventEmitter();
  }
  return webEventEmitter;
};

/**
 * Reset the web event emitter (for testing purposes)
 */
export const resetWebEventEmitter = (): void => {
  webEventEmitter = null;
};

/**
 * Listen for an app event
 * Works in both Tauri and web environments
 *
 * In Tauri mode, listens to both:
 * - Tauri events (from Rust backend, e.g., menu events)
 * - WebEventEmitter events (from frontend, e.g., close-tab)
 */
export async function listen<T = void>(
  event: string,
  callback: EventCallback<T>,
): Promise<UnlistenFn> {
  const emitter = getWebEventEmitter();
  const webUnlisten = emitter.on(event, callback);

  if (isTauri()) {
    const { getCurrentWebviewWindow } =
      await import("@tauri-apps/api/webviewWindow");
    const appWindow = getCurrentWebviewWindow();
    // Also listen for Tauri events (from Rust backend)
    const tauriUnlisten = await appWindow.listen<T>(event, (e) =>
      callback(e.payload),
    );
    return () => {
      webUnlisten();
      tauriUnlisten();
    };
  }

  return webUnlisten;
}

/**
 * Emit an app event from the frontend
 * Always uses WebEventEmitter for frontend-to-frontend communication
 * (Tauri's event system is for backend-to-frontend communication)
 */
export function emit<T = void>(event: string, payload?: T): void {
  const emitter = getWebEventEmitter();
  emitter.emit(event, payload);
}

/**
 * Setup multiple event listeners at once
 * Returns a cleanup function that removes all listeners
 */
export async function setupEventListeners(
  events: Array<{ event: string; callback: EventCallback }>,
): Promise<UnlistenFn> {
  const unlisteners = await Promise.all(
    events.map(({ event, callback }) => listen(event, callback)),
  );

  return () => {
    unlisteners.forEach((unlisten) => unlisten());
  };
}
