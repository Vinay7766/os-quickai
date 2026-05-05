// ─────────────────────────────────────────────────────────────────────────────
// useAppStore.ts — Search query state management
// ─────────────────────────────────────────────────────────────────────────────
// Manages the search query lifecycle:
//   • User types a query → stored in `query`
//   • User submits → `submitQuery()` calls the Rust backend
//   • Response arrives → stored in `answer` (or `error`)
//
// The store reads the currently selected AI model from useSettingsStore
// to determine whether to use a free model or require an API key.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { queryLlm, getApiKey } from '../lib/tauriCommands';
import { useSettingsStore, FREE_MODELS } from './useSettingsStore';
import { invoke } from '@tauri-apps/api/core';

// ── Store Interface ──────────────────────────────────────────────────────────

interface AppState {
  /** The current query text in the search input */
  query: string;

  /** The AI model's response text (markdown) */
  answer: string;

  /** Whether a query is currently being processed */
  isLoading: boolean;

  /** Error message if the last query failed */
  error: string | null;

  /** Current search mode: regular AI search, site launcher, or app launcher */
  searchMode: 'search' | 'site' | 'app';

  /** List of dynamically discovered models (e.g. from Gemini) */
  availableModels: string[];

  /** Previous query for 'back' functionality */
  prevQuery: string;

  /** Previous answer for 'back' functionality */
  prevAnswer: string;

  /** Update the query text */
  setQuery: (q: string) => void;

  /** Change the search mode */
  setMode: (mode: 'search' | 'site' | 'app') => void;

  /** Update the list of available models */
  setAvailableModels: (models: string[]) => void;

  /** Submit the current query to the selected AI model */
  submitQuery: () => Promise<void>;

  /** Clear all query state (input, answer, error) */
  clearAnswer: () => void;
}

// ── Zustand Store ────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  query: '',
  answer: '',
  prevQuery: '',
  prevAnswer: '',
  isLoading: false,
  error: null,
  searchMode: 'search',
  availableModels: [],

  setQuery: (q: string) => set({ query: q }),
  setMode: (mode: 'search' | 'site' | 'app') => set({ searchMode: mode }),
  setAvailableModels: (models: string[]) => set({ availableModels: models }),

  clearAnswer: () => set({ answer: '', query: '', error: null }),

  submitQuery: async () => {
    const { query, answer, searchMode } = get();
    const settings = useSettingsStore.getState();

    // Don't submit empty queries
    if (!query.trim()) return;

    // Save history
    set({ prevQuery: query, prevAnswer: answer, isLoading: true, error: null, answer: '' });

    try {
      // ── Mode: Site Launcher ──────────────────────────────────────────
      if (searchMode === 'site') {
        if (!settings.enableSiteLauncher) {
          throw new Error('Site Launcher is disabled. Please turn it on in the Settings.');
        }
        let url = query.trim();
        if (!url.startsWith('http')) {
          url = `https://${url}`;
        }
        await invoke('search_in_browser', { browser: settings.browser, url });
        set({ isLoading: false, query: '' });
        return;
      }

      // ── Mode: App Launcher ──────────────────────────────────────────
      if (searchMode === 'app') {
        if (!settings.enableAppLauncher) {
          throw new Error('App Launcher is disabled. Please turn it on in the Settings.');
        }
        await invoke('launch_app', { name: query.trim() });
        set({ isLoading: false, query: '' });
        return;
      }

      // ── Mode: Regular AI Search ─────────────────────────────────────
      const llmModel = settings.llmModel;
      const isFree = FREE_MODELS.includes(llmModel);

      // Free models don't need an API key; paid models do
      const apiKey = await getApiKey();
      if (!isFree && !apiKey) {
        throw new Error('API Key not found. Please add your API key in the Settings.');
      }

      // Send the query to the Rust backend
      const answer = await queryLlm(query, llmModel, apiKey || '');
      set({ answer, isLoading: false, error: null });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      set({ error: message, isLoading: false });
    }
  },
}));
