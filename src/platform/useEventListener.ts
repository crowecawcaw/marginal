import { useEffect, type DependencyList } from "react";
import { listen, setupEventListeners, type EventCallback } from "./eventAdapter";

/**
 * Hook for listening to a single app event with proper async cleanup.
 * Handles React StrictMode's double-effect correctly.
 */
export function useEventListener<T = void>(
  event: string,
  callback: EventCallback<T>,
  deps: DependencyList,
): void {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    listen(event, callback).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        cleanup = unlisten;
      }
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook for listening to multiple app events with proper async cleanup.
 * Handles React StrictMode's double-effect correctly.
 */
export function useEventListeners(
  events: Array<{ event: string; callback: EventCallback }>,
  deps: DependencyList,
): void {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    setupEventListeners(events).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        cleanup = unlisten;
      }
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
