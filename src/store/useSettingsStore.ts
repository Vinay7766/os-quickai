// ─────────────────────────────────────────────────────────────────────────────
// useSettingsStore.ts — Global settings state management
// ─────────────────────────────────────────────────────────────────────────────
// Uses Zustand for state management and Tauri's plugin-store for persistence.
// Settings are synced between the main window and overlay via Tauri events.
//
// Key behaviors:
//   • On first launch, defaults to 'system' theme (auto-detects OS preference)
//   • Theme changes are reflected in real-time across all windows via events
//   • Browser and AI model preferences sync instantly to the overlay
//
// Cross-window sync strategy:
//   The Settings (main) window is the ONLY writer. When it changes a setting,
//   it saves to disk AND emits a 'settings-updated' event with the new value
//   in the payload. The Overlay window listens for this event and applies the
//   new value directly from the payload — no disk reads needed. This ensures
//   instant, reliable real-time sync even when the store cache is stale.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { createStore } from '@tauri-apps/plugin-store';
import { emit, listen } from '@tauri-apps/api/event';
import { getSystemTheme } from '../lib/tauriCommands';

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
// Ensures we only register the cross-window sync listener once per window.
let isListening = false;

// ── Helper: Apply Theme to DOM ───────────────────────────────────────────────
// Adds or removes the 'dark' class on <html> based on the theme setting.
// For 'system' mode, we query the Rust backend which reads the Windows
// registry (because WebView2 doesn't reliably support prefers-color-scheme).

// Cache the last-known OS theme so we can apply it synchronously
let cachedOsTheme: 'dark' | 'light' = 'light';

function applyThemeToDom(theme: string) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && cachedOsTheme === 'dark');

  // Toggle the 'dark' class on <html> — this activates the .dark CSS variables
  document.documentElement.classList.toggle('dark', isDark);

  // Also set a data attribute for components that need to know the resolved theme
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

/** Fetches the actual OS theme from the Rust backend and updates the cache. */
async function refreshOsThemeCache(): Promise<void> {
  try {
    const osTheme = await getSystemTheme();
    cachedOsTheme = osTheme === 'dark' ? 'dark' : 'light';
  } catch (e) {
    console.error('Failed to detect system theme:', e);
    cachedOsTheme = 'light';
  }
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

      // Force a fresh read from disk (bypasses any in-memory cache)
      await store.load();

      // Read each setting, falling back to defaults if not found
      const hotkey       = (await store.get<string>('hotkey'))       ?? 'alt+a';
      const llmModel     = (await store.get<string>('llmModel'))     ?? 'minimax-2.5';
      const searchEngine = (await store.get<string>('searchEngine')) ?? 'google';
      const llmSite      = (await store.get<string>('llmSite'))      ?? 'claude';
      const browser      = (await store.get<string>('browser'))      ?? 'default';

      // Theme: default to 'system' if no theme has been saved yet
      let theme = (await store.get<string>('theme')) as 'light' | 'dark' | 'system' | null;
      if (!theme) {
        theme = 'system';
        await store.set('theme', theme);
        await store.save();
      }

      // Detect the actual OS theme from the Windows registry (native)
      // This must happen BEFORE applyThemeToDom so 'system' mode works correctly
      await refreshOsThemeCache();

      // Apply the resolved theme to this window's DOM immediately
      applyThemeToDom(theme);

      // ── Cross-Window Sync Listener ───────────────────────────────────
      // Only register once per window lifetime to avoid duplicate handlers.
      //
      // HOW IT WORKS:
      //   When the Settings window calls updateSetting('browser', 'chrome'),
      //   it emits: { key: 'browser', val: 'chrome' }
      //   The Overlay receives this event and immediately updates its
      //   Zustand state + DOM without touching the disk.
      if (!isListening) {
        isListening = true;

        listen<{ key: string; val: string }>('settings-updated', (event) => {
          const { key, val } = event.payload ?? {};

          if (!key) return;

          if (key === 'all') {
            // Full reload requested (e.g., from "Save All" button)
            get().loadSettings();
          } else {
            // Single setting changed — apply it directly to Zustand state
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            set({ [key]: val } as any);

            // If the theme changed, also update the DOM classes
            if (key === 'theme') {
              applyThemeToDom(val);
            }
          }
        }).catch(console.error);

        // Listen for OS-level theme changes (only matters in "system" mode)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (get().theme === 'system') {
            applyThemeToDom('system');
          }
        });
      }

      set({ hotkey, llmModel, searchEngine, llmSite, browser, theme, settingsLoaded: true });
    } catch (e) {
      console.error('Failed to load settings:', e);

      // Even on error, apply the default theme and unblock the UI
      applyThemeToDom('system');
      set({ settingsLoaded: true });
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
  // The broadcast payload contains the exact key+value so receiving windows
  // don't need to re-read from disk (instant sync).
  updateSetting: async (key: string, val: string) => {
    // 1. Update local Zustand state immediately (optimistic update)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set({ [key]: val } as any);

    // 2. If the theme changed, apply it to THIS window's DOM right away
    if (key === 'theme') {
      // If user switched to 'system', refresh the OS theme from registry first
      if (val === 'system') {
        await refreshOsThemeCache();
      }
      applyThemeToDom(val);
    }

    try {
      // 3. Persist to disk
      const store = await createStore('settings.json', { autoSave: false });
      await store.set(key, val);
      await store.save();

      // 4. Broadcast to ALL other windows (overlay picks this up instantly)
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

      // Broadcast to all windows — 'all' triggers a full reload
      await emit('settings-updated', { key: 'all', val: '' });
    } catch (e) {
      console.error('Failed to save all settings:', e);
    }
  },
}));
