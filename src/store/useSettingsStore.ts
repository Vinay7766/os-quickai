import { create } from 'zustand';
import { createStore } from '@tauri-apps/plugin-store';

const storePromise = createStore('settings.json', { autoSave: false });

// FREE models — work without any API key
export const FREE_MODELS = ['minimax-2.5', 'qwen-3.6', 'nemotron'];

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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settingsLoaded: false,
  hotkey: 'alt+a',
  llmModel: 'minimax-2.5',
  searchEngine: 'google',
  llmSite: 'chatgpt',
  browser: 'chrome',
  theme: 'system',

  loadSettings: async () => {
    try {
      const store = await storePromise;
      // CRITICAL: reload from disk so we pick up changes made by other windows
      await store.load();

      const hotkey       = await store.get<string>('hotkey')       ?? 'alt+a';
      const llmModel     = await store.get<string>('llmModel')     ?? 'minimax-2.5';
      const searchEngine = await store.get<string>('searchEngine') ?? 'google';
      const llmSite      = await store.get<string>('llmSite')      ?? 'chatgpt';
      const browser      = await store.get<string>('browser')      ?? 'chrome';
      const theme        = (await store.get<string>('theme') ?? 'system') as 'light' | 'dark' | 'system';

      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);

      set({ hotkey, llmModel, searchEngine, llmSite, browser, theme, settingsLoaded: true });
    } catch (e) {
      console.error('loadSettings failed:', e);
      set({ settingsLoaded: true });
    }
  },

  updateHotkey: async (hk: string) => {
    set({ hotkey: hk });
    try {
      const store = await storePromise;
      await store.set('hotkey', hk);
      await store.save();
    } catch { /* ignore */ }
  },

  updateSetting: async (key: string, val: string) => {
    // 1. Update React state immediately
    set({ [key]: val } as any);

    // 2. Write to disk
    try {
      const store = await storePromise;
      await store.set(key, val);
      await store.save();
    } catch (e) {
      console.error('Failed to save setting:', e);
    }

    // 3. Apply theme to DOM
    if (key === 'theme') {
      const isDark = val === 'dark' || (val === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    }
  },
  
  saveAll: async () => {
    try {
      const store = await storePromise;
      const state = get();
      await store.set('hotkey', state.hotkey);
      await store.set('llmModel', state.llmModel);
      await store.set('searchEngine', state.searchEngine);
      await store.set('llmSite', state.llmSite);
      await store.set('browser', state.browser);
      await store.set('theme', state.theme);
      await store.save();
    } catch (e) {
      console.error('Manual save failed:', e);
    }
  }
}));
