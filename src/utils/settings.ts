import { Store } from "@tauri-apps/plugin-store";

interface AppSettings {
  sidebarVisible: boolean;
  sidebarWidth: number;
  outlineVisible: boolean;
  outlineWidth: number;
  codeZoom: number;
  renderedZoom: number;
  recentFiles: string[];
  lastOpenedFolder: string | null;
}

const SETTINGS_KEY = "marginal-settings";

const defaultSettings: AppSettings = {
  sidebarVisible: false,
  sidebarWidth: 250,
  outlineVisible: true,
  outlineWidth: 250,
  codeZoom: 100,
  renderedZoom: 100,
  recentFiles: [],
  lastOpenedFolder: null,
};

// Check if we're running in Tauri
const isTauri = () => {
  return (
    typeof window !== "undefined" &&
    window.__TAURI_INTERNALS__ !== undefined
  );
};

// Initialize store for Tauri environment
let store: Store | null = null;
const getStore = async (): Promise<Store> => {
  if (!store && isTauri()) {
    store = await Store.load("settings.json");
  }
  return store!;
};

// Load settings from tauri-plugin-store or localStorage
export const loadSettings = (): AppSettings => {
  // For synchronous access during initialization, use localStorage
  // The async version will be used for updates
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return defaultSettings;
};

// Save settings to both tauri-plugin-store and localStorage
export const saveSettings = async (settings: Partial<AppSettings>): Promise<void> => {
  try {
    const current = loadSettings();
    const updated = { ...current, ...settings };

    // Always save to localStorage for synchronous access
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));

    // If in Tauri, also save to persistent store
    if (isTauri()) {
      const storeInstance = await getStore();
      for (const [key, value] of Object.entries(updated)) {
        await storeInstance.set(key, value);
      }
      await storeInstance.save();
    }
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
};

// Initialize settings from store on app startup (Tauri only)
export const initSettings = async (): Promise<void> => {
  if (!isTauri()) return;

  try {
    const storeInstance = await getStore();
    const settings: Partial<AppSettings> = {};

    for (const key of Object.keys(defaultSettings)) {
      const value = await storeInstance.get(key);
      if (value !== null && value !== undefined) {
        settings[key as keyof AppSettings] = value as any;
      }
    }

    // Update localStorage with values from store
    if (Object.keys(settings).length > 0) {
      const current = loadSettings();
      const merged = { ...current, ...settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    }
  } catch (error) {
    console.error("Failed to initialize settings from store:", error);
  }
};

export const clearSettings = async (): Promise<void> => {
  try {
    localStorage.removeItem(SETTINGS_KEY);

    if (isTauri()) {
      const storeInstance = await getStore();
      for (const key of Object.keys(defaultSettings)) {
        await storeInstance.delete(key);
      }
      await storeInstance.save();
    }
  } catch (error) {
    console.error("Failed to clear settings:", error);
  }
};
