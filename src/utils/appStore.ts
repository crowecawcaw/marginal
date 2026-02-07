import { Store } from "@tauri-apps/plugin-store";

const isTauri = () => {
  return (
    typeof window !== "undefined" &&
    window.__TAURI_INTERNALS__ !== undefined
  );
};

const storeCache = new Map<string, Store>();

const getTauriStore = async (name: string): Promise<Store> => {
  let store = storeCache.get(name);
  if (!store && isTauri()) {
    store = await Store.load(`${name}.json`);
    storeCache.set(name, store);
  }
  return store!;
};

export interface AppStore<T extends Record<string, any>> {
  load: () => T;
  save: (partial: Partial<T>) => Promise<void>;
  clear: () => Promise<void>;
  init: () => Promise<void>;
}

export function createAppStore<T extends Record<string, any>>(
  name: string,
  defaults: T,
): AppStore<T> {
  const lsKey = `marginal:${name}`;

  const load = (): T => {
    try {
      const stored = localStorage.getItem(lsKey);
      if (stored) {
        return { ...defaults, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error(`Failed to load ${name}:`, error);
    }
    return { ...defaults };
  };

  const save = async (partial: Partial<T>): Promise<void> => {
    try {
      const current = load();
      const updated = { ...current, ...partial };

      localStorage.setItem(lsKey, JSON.stringify(updated));

      if (isTauri()) {
        const store = await getTauriStore(name);
        for (const [key, value] of Object.entries(updated)) {
          await store.set(key, value);
        }
        await store.save();
      }
    } catch (error) {
      console.error(`Failed to save ${name}:`, error);
    }
  };

  const clear = async (): Promise<void> => {
    try {
      localStorage.removeItem(lsKey);

      if (isTauri()) {
        const store = await getTauriStore(name);
        for (const key of Object.keys(defaults)) {
          await store.delete(key);
        }
        await store.save();
      }
    } catch (error) {
      console.error(`Failed to clear ${name}:`, error);
    }
  };

  const init = async (): Promise<void> => {
    if (!isTauri()) return;

    try {
      const store = await getTauriStore(name);
      const settings: Partial<T> = {};

      for (const key of Object.keys(defaults)) {
        const value = await store.get(key);
        if (value !== null && value !== undefined) {
          (settings as any)[key] = value;
        }
      }

      if (Object.keys(settings).length > 0) {
        const current = load();
        const merged = { ...current, ...settings };
        localStorage.setItem(lsKey, JSON.stringify(merged));
      }
    } catch (error) {
      console.error(`Failed to initialize ${name} from store:`, error);
    }
  };

  return { load, save, clear, init };
}
