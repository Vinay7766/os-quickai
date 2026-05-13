/*
 * Copyright 2026 Vinay7766
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
export const FREE_MODELS = ['free-model'];

// ── Store Interface ──────────────────────────────────────────────────────────

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}

interface SettingsState {
  settingsLoaded: boolean;
  hotkey: string;
  llmModel: string;
  searchEngine: string;
  llmSite: string;
  browser: string;
  theme: 'light' | 'dark' | 'system';
  
  // New toggles
  enableSiteLauncher: boolean;
  enableAppLauncher: boolean;
  openLinksInternal: boolean;

  // BYOK & Ollama
  customProviders: CustomProvider[];
  ollamaEnabled: boolean;
  ollamaUrl: string;

  availableModels: string[];
  modelProviderMap: Record<string, { provider: string; baseUrl?: string }>;
  
  loadSettings: () => Promise<void>;
  updateHotkey: (hk: string) => Promise<void>;
  updateSetting: (key: string, val: string | boolean | string[] | CustomProvider[]) => Promise<void>;
  saveAll: () => Promise<void>;
  refreshModels: () => Promise<void>;
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
  llmModel: 'free-model',
  searchEngine: 'google',
  llmSite: 'claude',
  browser: 'default',
  theme: 'system',
  enableSiteLauncher: true,
  enableAppLauncher: true,
  openLinksInternal: true,
  customProviders: [],
  ollamaEnabled: false,
  ollamaUrl: 'http://localhost:11434',
  availableModels: [],
  modelProviderMap: {},

  // ── Load Settings from Disk ────────────────────────────────────────────
  loadSettings: async () => {
    try {
      const hotkey       = await invoke<string | null>('get_setting', { key: 'hotkey' })       ?? 'alt+a';
      const llmModel     = await invoke<string | null>('get_setting', { key: 'llmModel' })     ?? 'minimax-2.5';
      const searchEngine = await invoke<string | null>('get_setting', { key: 'searchEngine' }) ?? 'google';
      const llmSite      = await invoke<string | null>('get_setting', { key: 'llmSite' })      ?? 'claude';
      const browser      = await invoke<string | null>('get_setting', { key: 'browser' })      ?? 'default';

      const enableSiteLauncher = (await invoke<string | null>('get_setting', { key: 'enableSiteLauncher' })) !== 'false';
      const enableAppLauncher  = (await invoke<string | null>('get_setting', { key: 'enableAppLauncher' }))  !== 'false';
      const openLinksInternal  = (await invoke<string | null>('get_setting', { key: 'openLinksInternal' }))  !== 'false';

      let theme = await invoke<'light' | 'dark' | 'system' | null>('get_setting', { key: 'theme' });
      if (!theme) {
        theme = 'system';
        await invoke('save_setting', { key: 'theme', value: theme });
      }

      await refreshOsThemeCache();
      applyThemeToDom(theme);

      const customProvidersRaw = await invoke<string | null>('get_setting', { key: 'customProviders' }) ?? '[]';
      const customProviders: CustomProvider[] = JSON.parse(customProvidersRaw);
      
      const ollamaEnabled = (await invoke<string | null>('get_setting', { key: 'ollamaEnabled' })) === 'true';
      const ollamaUrl = await invoke<string | null>('get_setting', { key: 'ollamaUrl' }) ?? 'http://localhost:11434';

      set({ 
        hotkey, llmModel, searchEngine, llmSite, browser, theme, 
        enableSiteLauncher, enableAppLauncher, openLinksInternal,
        customProviders, ollamaEnabled, ollamaUrl,
        settingsLoaded: true 
      });

      // Fetch all available models based on existing keys
      get().refreshModels();
    } catch (e) {
      console.error('[Settings] Failed to load:', e);
      await refreshOsThemeCache();
      applyThemeToDom('system');
      set({ settingsLoaded: true });
    }
  },

  // ── Refresh All Available Models ──────────────────────────────────────
  refreshModels: async () => {
    try {
      const state = get();
      const providers = ['gemini', 'grok', 'openai', 'claude', 'perplexity'];
      let allModels: string[] = [];
      let providerMap: Record<string, { provider: string; baseUrl?: string }> = {};

      // 1. Standard Providers
      for (const provider of providers) {
        const key = await invoke<string | null>('get_api_key', { provider });
        if (key && key !== '••••••••••••') {
          try {
            const models = await invoke<string[]>('list_provider_models', { apiKey: key, provider });
            allModels = [...allModels, ...models];
            models.forEach(m => {
              providerMap[m] = { provider };
            });
          } catch (e) {
            console.error(`[Settings] Failed to fetch models for ${provider}:`, e);
          }
        }
      }

      // 2. Custom Providers (BYOK)
      for (const custom of state.customProviders) {
        if (custom.baseUrl && custom.apiKey) {
          try {
            const models = await invoke<string[]>('list_openai_compatible', { 
              apiKey: custom.apiKey, 
              url: custom.baseUrl.endsWith('/models') ? custom.baseUrl : `${custom.baseUrl.replace(/\/$/, '')}/models`
            });
            allModels = [...allModels, ...models];
            models.forEach(m => {
              providerMap[m] = { provider: 'custom', baseUrl: custom.baseUrl };
            });
          } catch (e) {
            console.error(`[Settings] Failed to fetch models for custom provider ${custom.name}:`, e);
          }
        }
      }

      // 3. Ollama
      if (state.ollamaEnabled) {
        try {
          const models = await invoke<string[]>('list_ollama_models', { url: state.ollamaUrl });
          const prefixed = models.map(m => `ollama:${m}`);
          allModels = [...allModels, ...prefixed];
          prefixed.forEach(m => {
            providerMap[m] = { provider: 'ollama', baseUrl: state.ollamaUrl };
          });
        } catch (e) {
          console.error('[Settings] Failed to fetch Ollama models:', e);
        }
      }

      const uniqueModels = Array.from(new Set(allModels));
      set({ availableModels: uniqueModels, modelProviderMap: providerMap });
      await emit('settings-updated', { key: 'availableModels', val: uniqueModels });
      await emit('settings-updated', { key: 'modelProviderMap', val: providerMap });
    } catch (e) {
      console.error('[Settings] Global refresh failed:', e);
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
  updateSetting: async (key: string, val: string | boolean | string[] | CustomProvider[]) => {
    // 1. Update local Zustand state immediately
    set({ [key]: val } as any);

    // 2. If theme changed, apply to THIS window's DOM
    if (key === 'theme' && typeof val === 'string') {
      if (val === 'system') await refreshOsThemeCache();
      applyThemeToDom(val);
    }

    try {
      // 3. Persist to disk (always as string)
      await invoke('save_setting', { key, value: String(val) });

      // 4. Broadcast to ALL windows
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
listen('settings-updated', (event: unknown) => {
  try {
    const payload = (event as any)?.payload;
    if (!payload || !payload.key) return;

    const { key, val } = payload;

    if (key === 'all') {
      useSettingsStore.getState().loadSettings();
    } else {
      useSettingsStore.setState({ [key]: val } as any);
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
