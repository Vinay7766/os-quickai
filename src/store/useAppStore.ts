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
  searchMode: 'search' | 'site' | 'app' | 'terminal';

  /** Previous query for 'back' functionality */
  prevQuery: string;

  /** Previous answer for 'back' functionality */
  prevAnswer: string;

  /** Whether the mode switcher menu is currently open */
  isModeMenuOpen: boolean;

  /** Whether the model switcher menu is currently open */
  isModelMenuOpen: boolean;

  /** Update the query text */
  setQuery: (q: string) => void;

  /** Change the search mode */
  setMode: (mode: 'search' | 'site' | 'app' | 'terminal') => void;

  /** Toggle mode menu */
  setModeMenuOpen: (open: boolean) => void;

  /** Toggle model menu */
  setModelMenuOpen: (open: boolean) => void;

  /** URL for internal browser view */
  internalUrl: string | null;

  /** Set internal URL */
  setInternalUrl: (url: string | null) => void;

  /** Submit the current query to the selected AI model */
  submitQuery: () => Promise<void>;

  /** Clear all query state (input, answer, error, internalUrl) */
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
  isModeMenuOpen: false,
  isModelMenuOpen: false,
  internalUrl: null,

  setQuery: (q: string) => set({ query: q }),
  setMode: (mode: 'search' | 'site' | 'app' | 'terminal') => set({ searchMode: mode }),
  setModeMenuOpen: (open: boolean) => set({ isModeMenuOpen: open }),
  setModelMenuOpen: (open: boolean) => set({ isModelMenuOpen: open }),
  setInternalUrl: (url: string | null) => set({ internalUrl: url }),

  clearAnswer: () => set({ answer: '', query: '', error: null, internalUrl: null, isLoading: false }),

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
        
        set({ internalUrl: url, isLoading: false, query: '' });
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

      // ── Mode: Terminal ───────────────────────────────────────────
      if (searchMode === 'terminal') {
        const result = await invoke<string>('execute_terminal_command', { command: query.trim() });
        const displayResult = result.trim() || 'Command executed successfully (no output).';
        set({ answer: `\`\`\`bash\n${displayResult}\n\`\`\``, isLoading: false, error: null });
        return;
      }

      // ── Mode: Regular AI Search ─────────────────────────────────────
      const llmModel = settings.llmModel;
      const isFree = FREE_MODELS.includes(llmModel) || llmModel.startsWith('ollama:');

      let apiKey = '';
      if (!isFree) {
        // Identify the provider for the selected model
        const provider = llmModel.includes('gemini') ? 'gemini' :
                         llmModel.includes('gpt')    ? 'openai' :
                         llmModel.includes('grok')   ? 'grok'   :
                         llmModel.includes('claude') ? 'claude' : 'openai';
        
        apiKey = (await getApiKey(provider)) || '';
        if (!apiKey) {
          throw new Error(`API Key for ${provider.toUpperCase()} not found. Please add it in Settings.`);
        }
      }

      // Send the query to the Rust backend
      const mapping = settings.modelProviderMap[llmModel];
      const answer = await queryLlm(
        query, 
        llmModel, 
        apiKey || '', 
        mapping?.provider, 
        mapping?.baseUrl
      );
      set({ answer, isLoading: false, error: null });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      set({ error: message, isLoading: false });
    }
  },
}));
