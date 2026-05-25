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
import { useSettingsStore } from './useSettingsStore';
import { invoke } from '@tauri-apps/api/core';

import { AppInfo } from '../types';

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

  /** Safety command gating */
  pendingCommand: string | null;
  pendingMode: 'search' | 'site' | 'app' | 'terminal' | null;
  isConfirmed: boolean;
  confirmCommand: () => Promise<void>;
  cancelCommand: () => void;

  /** Whether the model switcher menu is currently open */
  isModelMenuOpen: boolean;

  /** Whether the custom brand settings menu is currently open */
  isBrandMenuOpen: boolean;

  /** Update the query text */
  setQuery: (q: string) => void;

  /** Change the search mode */
  setMode: (mode: 'search' | 'site' | 'app' | 'terminal') => void;

  /** Toggle mode menu */
  setModeMenuOpen: (open: boolean) => void;

  /** Toggle model menu */
  setModelMenuOpen: (open: boolean) => void;

  /** Toggle brand popover menu */
  setBrandMenuOpen: (open: boolean) => void;

  /** URL for internal browser view */
  internalUrl: string | null;

  /** Set internal URL */
  setInternalUrl: (url: string | null) => void;

  /** Stored screen capture for OCR context */
  imageBase64: string | null;

  /** Set screen capture */
  setImageBase64: (base64: string | null) => void;

  /** File operation progress */
  fileProgress: { progress: number; operation: string; file: string } | null;
  setFileProgress: (progress: { progress: number; operation: string; file: string } | null) => void;

  /** Submit the current query to the selected AI model */
  submitQuery: () => Promise<void>;

  /** Clear all query state (input, answer, error, internalUrl) */
  clearAnswer: () => void;

  // ── App Launcher suggestions state ──────────────────────────────────────────
  installedApps: AppInfo[];
  appSuggestions: AppInfo[];
  activeAppIndex: number;
  loadInstalledApps: () => Promise<void>;
  setActiveAppIndex: (index: number) => void;
}

// Helper to score app query matching (fuzzy, abbreviation/acronym, and substring)
function getAppMatchScore(appName: string, query: string): number {
  const name = appName.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  // 1. Exact match
  if (name === q) return 1000;

  // 2. Starts with / Prefix match
  if (name.startsWith(q)) return 800 - (name.length - q.length);

  // 3. Substring match
  const idx = name.indexOf(q);
  if (idx !== -1) return 600 - idx - (name.length - q.length);

  // 4. Space-insensitive substring match
  const nameNoSpace = name.replace(/\s+/g, '');
  const qNoSpace = q.replace(/\s+/g, '');
  if (nameNoSpace.includes(qNoSpace)) {
    return 400 - (nameNoSpace.length - qNoSpace.length);
  }

  // 5. Acronym / First letter abbreviation match (e.g. "vs code" -> "Visual Studio Code")
  const words = name.split(/[\s\-_]+/);
  const initials = words.map(w => w[0]).join('');
  if (initials.includes(qNoSpace)) {
    return 300;
  }

  let isAcronymWordMatch = true;
  let currentWordIdx = 0;
  const queryWords = q.split(/\s+/);
  for (const qw of queryWords) {
    let found = false;
    for (let i = currentWordIdx; i < words.length; i++) {
      if (words[i].startsWith(qw)) {
        currentWordIdx = i + 1;
        found = true;
        break;
      }
    }
    if (!found) {
      isAcronymWordMatch = false;
      break;
    }
  }
  if (isAcronymWordMatch) {
    return 500;
  }

  // 6. Subsequence match
  let qIdx = 0;
  for (let i = 0; i < name.length; i++) {
    if (name[i] === q[qIdx]) {
      qIdx++;
      if (qIdx === q.length) return 200;
    }
  }

  return 0;
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
  isBrandMenuOpen: false,
  internalUrl: null,
  imageBase64: null,
  fileProgress: null,
  installedApps: [],
  appSuggestions: [],
  activeAppIndex: 0,
  pendingCommand: null,
  pendingMode: null,
  isConfirmed: false,

  setQuery: (q: string) => {
    set({ query: q });
    const { searchMode, installedApps } = get();

    const trimmed = q.trim();
    const isAppMode = searchMode === 'app';
    const isSearchMode = searchMode === 'search';

    let appQuery = '';
    if (isAppMode) {
      appQuery = trimmed;
    } else if (isSearchMode) {
      const qLower = trimmed.toLowerCase();
      if (qLower.startsWith('open ')) {
        appQuery = trimmed.substring(5).trim();
      } else if (qLower.startsWith('run ')) {
        appQuery = trimmed.substring(4).trim();
      } else if (qLower.startsWith('launch ')) {
        appQuery = trimmed.substring(7).trim();
      }
    }

    if (appQuery) {
      const scored = installedApps
        .map(app => ({ app, score: getAppMatchScore(app.name, appQuery) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.app);
      set({ appSuggestions: scored.slice(0, 5), activeAppIndex: 0 });
    } else {
      set({ appSuggestions: [], activeAppIndex: 0 });
    }
  },

  setMode: (mode: 'search' | 'site' | 'app' | 'terminal') => {
    set({ searchMode: mode, appSuggestions: [], activeAppIndex: 0 });
  },

  setModeMenuOpen: (open: boolean) => set({ isModeMenuOpen: open }),
  setModelMenuOpen: (open: boolean) => set({ isModelMenuOpen: open }),
  setBrandMenuOpen: (open: boolean) => set({ isBrandMenuOpen: open }),
  setInternalUrl: (url: string | null) => set({ internalUrl: url }),
  setImageBase64: (base64: string | null) => set({ imageBase64: base64 }),
  setFileProgress: (p) => set({ fileProgress: p }),
  setActiveAppIndex: (index: number) => set({ activeAppIndex: index }),

  loadInstalledApps: async () => {
    try {
      const apps = await invoke<AppInfo[]>('list_installed_apps');
      const settings = useSettingsStore.getState();
      
      if (settings.enableLocalFileAccess) {
        try {
          const files = await invoke<{ name: string; path: string }[]>('list_local_files');
          const fileApps: AppInfo[] = files.map(f => ({
            name: f.name,
            appId: `file://${f.path}`
          }));
          set({ installedApps: [...(apps || []), ...fileApps] });
        } catch (e) {
          console.error('Failed to load local files:', e);
          set({ installedApps: apps || [] });
        }
      } else {
        set({ installedApps: apps || [] });
      }
    } catch (e) {
      console.error('Failed to load installed apps:', e);
    }
  },

  clearAnswer: () => set({ answer: '', query: '', error: null, internalUrl: null, imageBase64: null, isLoading: false, appSuggestions: [], activeAppIndex: 0, pendingCommand: null, pendingMode: null, isConfirmed: false }),

  confirmCommand: async () => {
    const { pendingCommand, pendingMode } = get();
    if (!pendingCommand) return;
    set({ isConfirmed: true, query: pendingCommand, searchMode: pendingMode || 'search', pendingCommand: null, pendingMode: null });
    await get().submitQuery();
  },

  cancelCommand: () => {
    set({ pendingCommand: null, pendingMode: null, isConfirmed: false, answer: '', isLoading: false, query: '' });
  },

  submitQuery: async () => {
    const { query, answer, searchMode, isConfirmed, appSuggestions, activeAppIndex, imageBase64 } = get();
    const settings = useSettingsStore.getState();

    // Don't submit empty queries unless we have an image
    if (!query.trim() && !imageBase64) return;

    // Provide a default query if none is given but an image is attached
    const finalQuery = (query.trim() === '' && imageBase64) ? "Please describe this image." : query;

    // Reset confirmation flag and save history
    set({ isConfirmed: false, prevQuery: finalQuery, prevAnswer: answer, isLoading: true, error: null, answer: '' });

    try {
      const { globalToolRegistry } = await import('../agent/index');
      
      const ctx = {
        query: finalQuery,
        mode: searchMode,
        settings,
        appSuggestions,
        activeAppIndex,
        imageBase64: imageBase64 || undefined,
        callbacks: {
          setAnswer: (a: string) => set({ answer: a, isLoading: false, error: null }),
          setInternalUrl: (url: string | null) => set({ internalUrl: url, isLoading: false, query: '' }),
          setPendingCommand: (cmd: string, mode: string, reason: string) => {
            set({ 
              pendingCommand: cmd,
              pendingMode: mode as any,
              answer: '',
              isLoading: false,
              error: reason 
            });
          },
          launchApp: async (name: string, appId: string | null) => {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('launch_app', { name, appId });
          },
          clearState: () => set({ isLoading: false, query: '', appSuggestions: [], activeAppIndex: 0, imageBase64: null })
        }
      };

      // If the command is already confirmed (danger check passed), we temporarily disable the security tool
      // But since our ToolRegistry is static, we handle confirmation by skipping the security check in the tool or just passing isConfirmed.
      // Wait, let's update ctx to include isConfirmed.
      // Actually, if isConfirmed is true, we already know it's dangerous but allowed.
      // Let's pass isConfirmed in the context.
      const fullCtx = { ...ctx, isConfirmed };
      
      const result = await globalToolRegistry.processQuery(fullCtx as any);
      
      if (result.type === 'intercepted') {
        // Handled by setPendingCommand callback
        return;
      }
      
      if (result.error) {
        throw new Error(result.error);
      }
      
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      set({ error: message, isLoading: false });
    }
  },
}));

// Subscribe to settings changes to refresh installed apps and files
import { listen } from '@tauri-apps/api/event';

listen('settings-updated', (event: any) => {
  try {
    const payload = event?.payload;
    if (payload && (payload.key === 'enableLocalFileAccess' || payload.key === 'all')) {
      useAppStore.getState().loadInstalledApps();
    }
  } catch (err) {
    console.error('Failed to update installed apps on settings event:', err);
  }
}).catch(err => console.error('Failed to listen to settings updates in app store:', err));
