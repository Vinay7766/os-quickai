// ─────────────────────────────────────────────────────────────────────────────
// useSettingsStore.ts — Global settings state management
// ─────────────────────────────────────────────────────────────────────────────
// Uses Zustand for state management and Tauri's plugin-store for persistence.
//
// CROSS-WINDOW SYNC ARCHITECTURE:
//   Both the Settings window and the Overlay window load the same JS bundle,
//   but run in SEPARATE WebView contexts with separate Zustand stores.
//
//   When the Settings window changes a setting:
//     1. It updates its own Zustand store (instant local update)
//     2. It saves to disk via plugin-store
//     3. It emits a Tauri event with the new value in the payload
//
//   The Overlay window picks up changes TWO ways:
//     A. Via the Tauri event listener (instant, real-time)
//     B. Via re-reading from disk on focus (backup, in case events are missed)
//
//   Theme detection uses a native Rust command that reads the Windows registry
//   because WebView2 does NOT reliably support prefers-color-scheme.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { getSystemTheme } from '../lib/tauriCommands';

// ── Free Model Identifiers ───────────────────────────────────────────────────
export const FREE_MODELS = ['minimax-2.5', 'qwen-3.6', 'nemotron'];

// ── Store Interface ──────────────────────────────────────────────────────────

interface SettingsState {
  settingsLoaded: boolean;
  hotkey: string;
  llmModel: string;
  searchEngine: string;
  llmSite: string;
  browser: string;
  theme: 'light' | 'dark' | 'system';

  loadSettings: () => Promise<void>;
  updateHotkey: (hk: string) => Promise<void>;
  updateSetting: (key: string, val: string) => Promise<void>;
  saveAll: () => Promise<void>;
}

// ── Theme Helpers ────────────────────────────────────────────────────────────

// Cache the OS theme so we can apply it synchronously after the first fetch
let cachedOsTheme: 'dark' | 'light' = 'light';

/** Reads the Windows registry via Rust to detect the actual OS theme. */
async function refreshOsThemeCache(): Promise<void> {
  try {
    const result = await getSystemTheme();
    cachedOsTheme = result === 'dark' ? 'dark' : 'light';
  } catch {
    cachedOsTheme = 'light';
  }
}

/** Toggles the 'dark' class on <html> to activate the correct CSS variables. */
function applyThemeToDom(theme: string) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && cachedOsTheme === 'dark');

  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

// ── Zustand Store ────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settingsLoaded: false,
  hotkey: 'alt+a',
  llmModel: 'minimax-2.5',
  searchEngine: 'google',
  llmSite: 'claude',
  browser: 'default',
  theme: 'system',

  // ── Load Settings from Disk ────────────────────────────────────────────
  loadSettings: async () => {
    try {
      const hotkey       = await invoke<string | null>('get_setting', { key: 'hotkey' })       ?? 'alt+a';
      const llmModel     = await invoke<string | null>('get_setting', { key: 'llmModel' })     ?? 'minimax-2.5';
      const searchEngine = await invoke<string | null>('get_setting', { key: 'searchEngine' }) ?? 'google';
      const llmSite      = await invoke<string | null>('get_setting', { key: 'llmSite' })      ?? 'claude';
      const browser      = await invoke<string | null>('get_setting', { key: 'browser' })      ?? 'default';

      let theme = await invoke<'light' | 'dark' | 'system' | null>('get_setting', { key: 'theme' });
      if (!theme) {
        theme = 'system';
        await invoke('save_setting', { key: 'theme', value: theme });
      }

      // Detect the actual OS theme from the Windows registry
      await refreshOsThemeCache();

      // Apply theme to this window's DOM
      applyThemeToDom(theme);

      set({ hotkey, llmModel, searchEngine, llmSite, browser, theme, settingsLoaded: true });
    } catch (e) {
      console.error('[Settings] Failed to load:', e);
      await refreshOsThemeCache();
      applyThemeToDom('system');
      set({ settingsLoaded: true });
    }
  },

  // ── Update Hotkey ──────────────────────────────────────────────────────
  updateHotkey: async (hk: string) => {
    set({ hotkey: hk });
    try {
      await invoke('save_setting', { key: 'hotkey', value: hk });
    } catch (e) {
      console.error('[Settings] Failed to save hotkey:', e);
    }
  },

  // ── Update Any Setting ─────────────────────────────────────────────────
  updateSetting: async (key: string, val: string) => {
    // 1. Update local Zustand state immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set({ [key]: val } as any);

    // 2. If theme changed, apply to THIS window's DOM
    if (key === 'theme') {
      if (val === 'system') await refreshOsThemeCache();
      applyThemeToDom(val);
    }

    try {
      // 3. Persist to disk
      await invoke('save_setting', { key, value: val });

      // 4. Broadcast to ALL windows so the overlay picks it up instantly
      await emit('settings-updated', { key, val });
    } catch (e) {
      console.error('[Settings] Failed to save:', e);
    }
  },

  // ── Save All Settings ──────────────────────────────────────────────────
  saveAll: async () => {
    try {
      const state = get();
      await invoke('save_setting', { key: 'hotkey', value: state.hotkey });
      await invoke('save_setting', { key: 'llmModel', value: state.llmModel });
      await invoke('save_setting', { key: 'searchEngine', value: state.searchEngine });
      await invoke('save_setting', { key: 'llmSite', value: state.llmSite });
      await invoke('save_setting', { key: 'browser', value: state.browser });
      await invoke('save_setting', { key: 'theme', value: state.theme });

      // Broadcast full reload to overlay
      await emit('settings-updated', { key: 'all', val: '' });
    } catch (e) {
      console.error('[Settings] Failed to save all:', e);
    }
  },
}));

// ── Cross-Window Event Listener (Module-Level) ──────────────────────────────
// This runs ONCE when the module is first imported, BEFORE any component mounts.
// It is INDEPENDENT of loadSettings — even if loadSettings fails, events will
// still be received. This is the primary mechanism for real-time sync.
//
// When the Settings window calls updateSetting('browser', 'chrome'), it emits:
//   { key: 'browser', val: 'chrome' }
// This listener picks it up and directly updates the Zustand state.

listen('settings-updated', (event: unknown) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (event as any)?.payload;
    if (!payload || !payload.key) return;

    const { key, val } = payload;

    if (key === 'all') {
      // Full reload requested (e.g., "Save All" button)
      useSettingsStore.getState().loadSettings();
    } else {
      // Single setting changed — apply directly to Zustand state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useSettingsStore.setState({ [key]: val } as any);

      // If theme changed, also update the DOM
      if (key === 'theme') {
        if (val === 'system') {
          refreshOsThemeCache().then(() => applyThemeToDom(val));
        } else {
          applyThemeToDom(val);
        }
      }
    }
  } catch (e) {
    console.error('[Settings] Event listener error:', e);
  }
}).catch((e) => console.error('[Settings] Failed to register listener:', e));
