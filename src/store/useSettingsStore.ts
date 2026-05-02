// ─────────────────────────────────────────────────────────────────────────────
// useSettingsStore.ts — Global settings state management
// ─────────────────────────────────────────────────────────────────────────────
// Uses Zustand for state management and Tauri's plugin-store for persistence.
// Settings are synced between the main window and overlay via Tauri events.
//
// Key behaviors:
//   • On first launch, auto-detects the system's light/dark theme
//   • Theme changes are reflected in real-time across all windows
//   • Browser and AI model preferences sync instantly to the overlay
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { createStore } from '@tauri-apps/plugin-store';
import { emit, listen } from '@tauri-apps/api/event';

// ── Free Model Identifiers ───────────────────────────────────────────────────
// These models are available without an API key, powered by Pollinations AI.
export const FREE_MODELS = ['minimax-2.5', 'qwen-3.6', 'nemotron'];

// ── Store Interface ──────────────────────────────────────────────────────────

interface SettingsState {
  /** Whether settings have been loaded from disk */
  settingsLoaded: boolean;

  /** Global hotkey to toggle the search overlay (e.g., "alt+a") */
  hotkey: string;

  /** Currently selected AI model for the search bar queries */
  llmModel: string;

  /** Search engine for web searches (google, bing, etc.) */
  searchEngine: string;

  /** Preferred AI site for the "AI Search" button (claude, chatgpt, etc.) */
  llmSite: string;

  /** Preferred browser for opening links (default = system browser) */
  browser: string;

  /** Current theme mode */
  theme: 'light' | 'dark' | 'system';

  /** Load all settings from disk and apply them */
  loadSettings: () => Promise<void>;

  /** Update just the hotkey value */
  updateHotkey: (hk: string) => Promise<void>;

  /** Update any single setting by key and persist it */
  updateSetting: (key: string, val: string) => Promise<void>;

  /** Manually save all current settings to disk */
  saveAll: () => Promise<void>;
}

// ── Event Listener Guard ─────────────────────────────────────────────────────
// Ensures we only register the cross-window sync listener once.
let isListening = false;

// ── Helper: Apply Theme to DOM ───────────────────────────────────────────────
// Adds or removes the 'dark' class on <html> based on the theme setting.

function applyThemeToDom(theme: string) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

// ── Helper: Detect System Theme ──────────────────────────────────────────────
// Returns 'dark' or 'light' based on the OS preference.

function detectSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ── Zustand Store ────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Default values (used before settings are loaded from disk)
  settingsLoaded: false,
  hotkey: 'alt+a',
  llmModel: 'minimax-2.5',
  searchEngine: 'google',
  llmSite: 'claude',       // Default AI site is Claude
  browser: 'default',      // Uses the system's default browser
  theme: 'system',

  // ── Load Settings ──────────────────────────────────────────────────────
  // Reads all settings from the Tauri store (settings.json on disk).
  // On first launch, no settings exist so defaults are used.
  loadSettings: async () => {
    try {
      const store = await createStore('settings.json', { autoSave: false });
      await store.load();

      // Read each setting, falling back to defaults if not found
      const hotkey       = (await store.get<string>('hotkey'))       ?? 'alt+a';
      const llmModel     = (await store.get<string>('llmModel'))     ?? 'minimax-2.5';
      const searchEngine = (await store.get<string>('searchEngine')) ?? 'google';
      const llmSite      = (await store.get<string>('llmSite'))      ?? 'claude';
      const browser      = (await store.get<string>('browser'))      ?? 'default';

      // Theme auto-detection: if no theme is saved, detect from the OS
      let theme = (await store.get<string>('theme')) as 'light' | 'dark' | 'system' | null;
      if (!theme) {
        theme = detectSystemTheme();
        // Save the detected theme so it persists
        await store.set('theme', theme);
        await store.save();
      }

      // Apply the theme to the page immediately
      applyThemeToDom(theme);

      // ── Cross-Window Sync Listener ───────────────────────────────────
      // Listens for settings changes from other windows (e.g., main page
      // updating theme → overlay picks it up in real-time).
      if (!isListening) {
        isListening = true;

        listen('settings-updated', async () => {
          await get().loadSettings();
        }).catch(console.error);

        // Also listen for OS-level theme changes when in "system" mode
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (get().theme === 'system') {
            applyThemeToDom('system');
          }
        });
      }

      set({ hotkey, llmModel, searchEngine, llmSite, browser, theme, settingsLoaded: true });
    } catch (e) {
      console.error('Failed to load settings:', e);
      set({ settingsLoaded: true }); // Mark as loaded even on error to unblock UI
    }
  },

  // ── Update Hotkey ──────────────────────────────────────────────────────
  updateHotkey: async (hk: string) => {
    set({ hotkey: hk });
    try {
      const store = await createStore('settings.json', { autoSave: false });
      await store.set('hotkey', hk);
      await store.save();
    } catch (e) {
      console.error('Failed to save hotkey:', e);
    }
  },

  // ── Update Any Setting ─────────────────────────────────────────────────
  // Saves a single setting to disk and broadcasts the change to all windows.
  updateSetting: async (key: string, val: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set({ [key]: val } as any);

    try {
      const store = await createStore('settings.json', { autoSave: false });
      await store.set(key, val);
      await store.save();

      // If the theme changed, apply it immediately to this window
      if (key === 'theme') {
        applyThemeToDom(val);
      }

      // Notify all other windows that a setting changed
      await emit('settings-updated', { key, val });
    } catch (e) {
      console.error('Failed to save setting:', e);
    }
  },

  // ── Save All Settings ──────────────────────────────────────────────────
  // Writes all current state values to disk at once.
  saveAll: async () => {
    try {
      const store = await createStore('settings.json', { autoSave: false });
      const state = get();
      await store.set('hotkey', state.hotkey);
      await store.set('llmModel', state.llmModel);
      await store.set('searchEngine', state.searchEngine);
      await store.set('llmSite', state.llmSite);
      await store.set('browser', state.browser);
      await store.set('theme', state.theme);
      await store.save();

      // Broadcast to all windows
      await emit('settings-updated', { key: 'all' });
    } catch (e) {
      console.error('Failed to save all settings:', e);
    }
  },
}));
