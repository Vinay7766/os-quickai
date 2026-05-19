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
import { useSettingsStore } from './useSettingsStore';
import { FREE_MODELS } from '../constants';
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

  clearAnswer: () => set({ answer: '', query: '', error: null, internalUrl: null, isLoading: false, appSuggestions: [], activeAppIndex: 0, pendingCommand: null, pendingMode: null, isConfirmed: false }),

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
    const { query, answer, searchMode, isConfirmed } = get();
    const settings = useSettingsStore.getState();

    // Don't submit empty queries
    if (!query.trim()) return;

    // Detect potentially dangerous system commands
    const trimmedQuery = query.trim();
    const qLower = trimmedQuery.toLowerCase();
    let isDangerous = false;
    let dangerReason = '';

    if (searchMode === 'terminal') {
      const dangerousTerms = ['rm ', 'del ', 'rd ', 'format ', 'mkfs', 'dd ', 'shutdown', 'reboot', 'restart'];
      for (const term of dangerousTerms) {
        if (qLower.includes(term)) {
          isDangerous = true;
          dangerReason = `destructive terminal command: "${term.trim()}"`;
          break;
        }
      }
    } else {
      // File deletions
      if (qLower.startsWith('delete ') || qLower.startsWith('remove ')) {
        isDangerous = true;
        dangerReason = 'irreversible file or folder deletion';
      }
      
      // Power commands (Restart/Shutdown)
      const matchesTrigger = (triggersCsv: string, input: string) => {
        for (const trigger of triggersCsv.split(',')) {
          const t = trigger.trim().toLowerCase();
          if (t && (input === t || input.startsWith(t + ' ') || input.endsWith(' ' + t))) {
            return true;
          }
        }
        return false;
      };

      if (matchesTrigger(settings.customRestartCommand, qLower)) {
        isDangerous = true;
        dangerReason = 'system restart';
      } else if (matchesTrigger(settings.customShutdownCommand, qLower)) {
        isDangerous = true;
        dangerReason = 'system shutdown';
      }
    }

    if (isDangerous && !isConfirmed) {
      set({ 
        pendingCommand: trimmedQuery,
        pendingMode: searchMode,
        answer: `WARNING: The command you entered is potentially dangerous or destructive (${dangerReason}).\n\nDo you want to proceed with executing: \`${trimmedQuery}\`?`,
        isLoading: false,
        error: null 
      });
      return;
    }

    // Reset confirmation flag
    set({ isConfirmed: false });

    // Save history
    set({ prevQuery: query, prevAnswer: answer, isLoading: true, error: null, answer: '' });

    try {
      // ── Intercept Native Desktop Automation Commands ──
      try {
        const desktopResult = await invoke<string>('execute_desktop_command', { command: query.trim() });
        set({ answer: desktopResult, isLoading: false, error: null });
        return;
      } catch (err: any) {
        if (err !== 'Not a recognized desktop command') {
          throw new Error(err);
        }
      }

      // ── Intercept "open <app>" or "run <app>" in Regular Search mode ──
      if (searchMode === 'search') {
        const trimmed = query.trim();
        const qLower = trimmed.toLowerCase();
        let targetApp = '';
        if (qLower.startsWith('open ')) {
          targetApp = trimmed.substring(5).trim();
        } else if (qLower.startsWith('run ')) {
          targetApp = trimmed.substring(4).trim();
        } else if (qLower.startsWith('launch ')) {
          targetApp = trimmed.substring(7).trim();
        }

        if (targetApp) {
          const trimmedApp = targetApp.trim();
          const mainPart = trimmedApp.split(/\s+in\s+/i)[0].trim();
          
          const isURL = (str: string): boolean => {
            const t = str.trim();
            if (t.includes(' ')) return false;
            return /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\/?/.test(t);
          };

          if (isURL(mainPart)) {
            let targetBrowser = '';
            let urlToOpen = trimmedApp;
            const parts = trimmedApp.split(/\s+in\s+/i);
            if (parts.length > 1) {
              const potentialBrowser = parts[parts.length - 1].toLowerCase().trim();
              if (['chrome', 'firefox', 'brave', 'edge', 'bing', 'opera', 'safari', 'comet'].includes(potentialBrowser)) {
                targetBrowser = potentialBrowser === 'edge' ? 'bing' : potentialBrowser;
                urlToOpen = parts.slice(0, -1).join(' in ').trim();
              }
            }

            let finalUrl = urlToOpen;
            if (!/^https?:\/\//i.test(finalUrl)) {
              finalUrl = 'https://' + finalUrl;
            }

            const { useSettingsStore } = await import('./useSettingsStore');
            const { browser } = useSettingsStore.getState();

            try {
              if (targetBrowser) {
                const exists = await invoke<boolean>('check_browser_exists', { browser: targetBrowser });
                if (exists) {
                  await invoke('search_in_browser', { browser: targetBrowser, url: finalUrl });
                } else {
                  if (browser === 'default' || !browser) {
                    const { open } = await import('@tauri-apps/plugin-shell');
                    await open(finalUrl);
                  } else {
                    await invoke('search_in_browser', { browser, url: finalUrl });
                  }
                }
              } else {
                if (browser === 'default' || !browser) {
                  const { open } = await import('@tauri-apps/plugin-shell');
                  await open(finalUrl);
                } else {
                  await invoke('search_in_browser', { browser, url: finalUrl });
                }
              }
            } catch (e) {
              console.error('Failed to open link:', e);
            }

            set({ isLoading: false, query: '', appSuggestions: [], activeAppIndex: 0 });
            return;
          }

          const { appSuggestions, activeAppIndex } = get();
          if (appSuggestions.length > 0 && activeAppIndex >= 0 && activeAppIndex < appSuggestions.length) {
            const selected = appSuggestions[activeAppIndex];
            await invoke('launch_app', { name: selected.name, appId: selected.appId });
          } else {
            await invoke('launch_app', { name: targetApp, appId: null });
          }
          set({ isLoading: false, query: '', appSuggestions: [], activeAppIndex: 0 });
          return;
        }
      }

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

        const { appSuggestions, activeAppIndex } = get();
        if (appSuggestions.length > 0 && activeAppIndex >= 0 && activeAppIndex < appSuggestions.length) {
          const selected = appSuggestions[activeAppIndex];
          await invoke('launch_app', { name: selected.name, appId: selected.appId });
        } else {
          await invoke('launch_app', { name: query.trim(), appId: null });
        }

        set({ isLoading: false, query: '', appSuggestions: [], activeAppIndex: 0 });
        return;
      }

      // ── Mode: Terminal ───────────────────────────────────────────
      if (searchMode === 'terminal') {
        if (!settings.enableTerminalMode) {
          throw new Error('Terminal Mode is disabled. Please turn it on in the Settings.');
        }
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
          llmModel.includes('gpt') ? 'openai' :
            llmModel.includes('grok') ? 'grok' :
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
