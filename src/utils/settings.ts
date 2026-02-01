interface AppSettings {
  sidebarVisible: boolean;
  sidebarWidth: number;
  outlineVisible: boolean;
  outlineWidth: number;
  recentFiles: string[];
  lastOpenedFolder: string | null;
}

const SETTINGS_KEY = "marginal-settings";

const defaultSettings: AppSettings = {
  sidebarVisible: false,
  sidebarWidth: 250,
  outlineVisible: true,
  outlineWidth: 250,
  recentFiles: [],
  lastOpenedFolder: null,
};

export const loadSettings = (): AppSettings => {
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

export const saveSettings = (settings: Partial<AppSettings>): void => {
  try {
    const current = loadSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
};

export const clearSettings = (): void => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error("Failed to clear settings:", error);
  }
};
