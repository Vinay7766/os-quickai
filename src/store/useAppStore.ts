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

  /** Update the query text */
  setQuery: (q: string) => void;

  /** Submit the current query to the selected AI model */
  submitQuery: () => Promise<void>;

  /** Clear all query state (input, answer, error) */
  clearAnswer: () => void;
}

// ── Zustand Store ────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  query: '',
  answer: '',
  isLoading: false,
  error: null,

  setQuery: (q: string) => set({ query: q }),

  clearAnswer: () => set({ answer: '', query: '', error: null }),

  submitQuery: async () => {
    const { query } = get();

    // Don't submit empty queries
    if (!query.trim()) return;

    set({ isLoading: true, error: null, answer: '' });

    try {
      // Get the current model selection from settings
      const llmModel = useSettingsStore.getState().llmModel;
      const isFree = FREE_MODELS.includes(llmModel);

      // Free models don't need an API key; paid models do
      const apiKey = await getApiKey();
      if (!isFree && !apiKey) {
        throw new Error('API Key not found. Please add your API key in the Main Page.');
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
