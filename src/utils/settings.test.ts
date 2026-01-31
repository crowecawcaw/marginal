import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, clearSettings } from './settings';

describe('settings', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('loadSettings', () => {
    it('returns default settings when localStorage is empty', () => {
      const settings = loadSettings();

      expect(settings).toEqual({
        sidebarVisible: false,
        sidebarWidth: 250,
        recentFiles: [],
        lastOpenedFolder: null,
      });
    });

    it('loads settings from localStorage', () => {
      const storedSettings = {
        sidebarVisible: true,
        sidebarWidth: 300,
        recentFiles: ['/path/to/file.md'],
        lastOpenedFolder: '/path/to/folder',
      };

      localStorage.setItem('marginal-settings', JSON.stringify(storedSettings));

      const settings = loadSettings();
      expect(settings).toEqual(storedSettings);
    });

    it('merges stored settings with defaults', () => {
      // Only store partial settings
      const partialSettings = {
        sidebarVisible: true,
      };

      localStorage.setItem('marginal-settings', JSON.stringify(partialSettings));

      const settings = loadSettings();
      expect(settings).toEqual({
        sidebarVisible: true,
        sidebarWidth: 250,
        recentFiles: [],
        lastOpenedFolder: null,
      });
    });

    it('returns defaults when localStorage data is invalid', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      localStorage.setItem('marginal-settings', 'invalid json');

      const settings = loadSettings();
      expect(settings).toEqual({
        sidebarVisible: false,
        sidebarWidth: 250,
        recentFiles: [],
        lastOpenedFolder: null,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('saveSettings', () => {
    it('saves settings to localStorage', () => {
      saveSettings({ sidebarVisible: true });

      const stored = JSON.parse(localStorage.getItem('marginal-settings')!);
      expect(stored.sidebarVisible).toBe(true);
    });

    it('merges new settings with existing settings', () => {
      saveSettings({ sidebarVisible: true });
      saveSettings({ sidebarWidth: 300 });

      const settings = loadSettings();
      expect(settings.sidebarVisible).toBe(true);
      expect(settings.sidebarWidth).toBe(300);
    });

    it('preserves unmodified settings', () => {
      saveSettings({
        sidebarVisible: true,
        recentFiles: ['/file1.md', '/file2.md'],
      });

      saveSettings({ sidebarWidth: 300 });

      const settings = loadSettings();
      expect(settings.sidebarVisible).toBe(true);
      expect(settings.recentFiles).toEqual(['/file1.md', '/file2.md']);
      expect(settings.sidebarWidth).toBe(300);
    });
  });

  describe('clearSettings', () => {
    it('removes settings from localStorage', () => {
      saveSettings({ sidebarVisible: true });

      clearSettings();

      const stored = localStorage.getItem('marginal-settings');
      expect(stored).toBeNull();
    });

    it('causes loadSettings to return defaults after clearing', () => {
      saveSettings({ sidebarVisible: true, sidebarWidth: 300 });
      clearSettings();

      const settings = loadSettings();
      expect(settings).toEqual({
        sidebarVisible: false,
        sidebarWidth: 250,
        recentFiles: [],
        lastOpenedFolder: null,
      });
    });
  });

  describe('default sidebar visibility', () => {
    it('defaults to sidebar closed for new users', () => {
      const settings = loadSettings();
      expect(settings.sidebarVisible).toBe(false);
    });
  });
});
