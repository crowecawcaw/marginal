/**
 * Event Adapter
 *
 * Provides a unified interface for app events that works
 * in both Tauri (desktop) and web browser environments.
 */

import { isTauri } from './index';

// Event callback type
type EventCallback = () => void;
type UnlistenFn = () => void;

// Web event emitter singleton
class WebEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): UnlistenFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string) {
    this.listeners.get(event)?.forEach((callback) => callback());
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
 * Listen for an app event
 * Works in both Tauri and web environments
 */
export async function listen(event: string, callback: EventCallback): Promise<UnlistenFn> {
  if (isTauri()) {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const appWindow = getCurrentWebviewWindow();
    return appWindow.listen(event, callback);
  } else {
    const emitter = getWebEventEmitter();
    return emitter.on(event, callback);
  }
}

/**
 * Emit an app event (primarily for web mode)
 */
export function emit(event: string): void {
  if (!isTauri()) {
    const emitter = getWebEventEmitter();
    emitter.emit(event);
  }
}

/**
 * Setup multiple event listeners at once
 * Returns a cleanup function that removes all listeners
 */
export async function setupEventListeners(
  events: Array<{ event: string; callback: EventCallback }>
): Promise<UnlistenFn> {
  const unlisteners = await Promise.all(
    events.map(({ event, callback }) => listen(event, callback))
  );

  return () => {
    unlisteners.forEach((unlisten) => unlisten());
  };
}
