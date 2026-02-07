import { createAppStore } from "./appStore";

export type Theme = "system" | "light" | "dark";

interface AppSettings {
  sidebarVisible: boolean;
  sidebarWidth: number;
  outlineVisible: boolean;
  outlineWidth: number;
  viewMode: "code" | "rendered";
  codeZoom: number;
  renderedZoom: number;
  recentFiles: string[];
  lastOpenedFolder: string | null;
  openFiles: string[];
  activeFilePath: string | null;
  theme: Theme;
}

const defaultSettings: AppSettings = {
  sidebarVisible: false,
  sidebarWidth: 250,
  outlineVisible: true,
  outlineWidth: 250,
  viewMode: "code",
  codeZoom: 100,
  renderedZoom: 100,
  recentFiles: [],
  lastOpenedFolder: null,
  openFiles: [],
  activeFilePath: null,
  theme: "system",
};

const OLD_SETTINGS_KEY = "marginal-settings";

const store = createAppStore<AppSettings>("settings", defaultSettings);

export const loadSettings = (): AppSettings => {
  return store.load();
};

export const saveSettings = async (
  settings: Partial<AppSettings>,
): Promise<void> => {
  return store.save(settings);
};

export const clearSettings = async (): Promise<void> => {
  return store.clear();
};

export const initSettings = async (): Promise<void> => {
  // Backward-compat migration: if old key exists but new key doesn't, migrate
  const oldData = localStorage.getItem(OLD_SETTINGS_KEY);
  const newData = localStorage.getItem("marginal:settings");
  if (oldData && !newData) {
    localStorage.setItem("marginal:settings", oldData);
    localStorage.removeItem(OLD_SETTINGS_KEY);
  }

  return store.init();
};
