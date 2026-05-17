/**
 * OverlayHeader Component
 * 
 * The primary search bar interface. Contains the application logo,
 * the mode-aware search input, and quick action buttons for Web/AI search.
 * 
 * Depends on: core/store, shared/components/QueryInput, @tauri-apps/api
 * Used by: features/overlay/Overlay
 */
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../../core/store/useAppStore';
import { useSettingsStore } from '../../../core/store/useSettingsStore';
import { QueryInput } from '../../../shared/components/QueryInput';
import { open } from '@tauri-apps/plugin-shell';
import appLogo from '../../../assets/app-logo.png';
import { searchInBrowser } from '../../../core/lib/tauriCommands';

const SEARCH_BAR_HEIGHT = 52;

const SEARCH_URLS: Record<string, string> = {
  google:     'https://www.google.com/search?q=',
  bing:       'https://www.bing.com/search?q=',
  perplexity: 'https://www.perplexity.ai/?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
};

const AI_URLS: Record<string, string> = {
  chatgpt:    'https://chatgpt.com/',
  claude:     'https://claude.ai/',
  gemini:     'https://gemini.google.com/',
  grok:       'https://x.ai/grok',
  perplexity: 'https://www.perplexity.ai/',
};

interface OverlayHeaderProps {
  hasContent: boolean;
  isLoading: boolean;
  platform: string;
  handleDrag: () => void;
}

/**
 * Header component for the search overlay.
 * Handles the logo, search input, and quick action buttons.
 */
export function OverlayHeader({ hasContent, isLoading, platform, handleDrag }: OverlayHeaderProps) {
  const { query, setQuery } = useAppStore();
  const { browser, llmSite, searchEngine, customSearchUrl } = useSettingsStore();

  const handleBrowserSearch = async () => {
    if (!query.trim()) return;
    
    let searchUrl = '';
    const encodedQuery = encodeURIComponent(query);
    if (searchEngine === 'custom') {
      if (customSearchUrl.trim()) {
        if (customSearchUrl.includes('{query}')) {
          searchUrl = customSearchUrl.replace('{query}', encodedQuery);
        } else {
          searchUrl = customSearchUrl + (customSearchUrl.includes('?') ? '&' : '?') + 'q=' + encodedQuery;
        }
      } else {
        searchUrl = SEARCH_URLS.google + encodedQuery;
      }
    } else {
      searchUrl = (SEARCH_URLS[searchEngine] ?? SEARCH_URLS.google) + encodedQuery;
    }

    try {
      if (browser === 'default' || !browser) { await open(searchUrl); }
      else { await searchInBrowser(browser, searchUrl); }
      setQuery('');
    } catch (e) { alert(String(e)); }
  };

  const handleAIOpen = async () => {
    if (!query.trim()) return;
    const site = llmSite === 'default' ? 'claude' : llmSite;
    const url = AI_URLS[site] ?? AI_URLS.claude;
    
    try {
      if (browser === 'default' || !browser) { await open(url); }
      else { await searchInBrowser(browser, url); }
      setQuery('');
    } catch (e) { alert(String(e)); }
  };

  return (
    <div
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button, input, textarea')) return;
        handleDrag();
      }}
      className={`flex items-center gap-3 px-4 shrink-0 cursor-move select-none transition-all duration-300 ${
        hasContent ? 'mt-2 rounded-2xl border border-white/5' : ''
      }`}
      style={{ height: `${SEARCH_BAR_HEIGHT}px`, marginBottom: hasContent ? '6px' : '0' }}
    >
      <div className="flex-1 flex items-center gap-3">
        <img src={appLogo} alt="Logo" className="w-8 h-8 rounded-lg shadow-lg" />
        <div className="h-4 w-[1px] bg-white/10" />
        <div className="flex-1 min-w-0">
          <QueryInput />
        </div>
      </div>

      {isLoading && (
        <div className="flex gap-1 shrink-0 px-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-green-500/20 active:scale-95"
          style={{ color: 'var(--clr-success)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
          onClick={handleBrowserSearch}
          title="Search on Web (Alt+Enter)"
        >
          <span className="text-[10px] font-black uppercase">Web</span>
        </button>

        <button
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-blue-500/20 active:scale-95"
          style={{ color: 'var(--clr-accent)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
          onClick={handleAIOpen}
          title="Open in AI Site (Ctrl+Enter)"
        >
          <span className="text-[10px] font-black uppercase">AI</span>
        </button>

        {platform === 'macos' && (
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
            style={{ color: 'var(--clr-text-secondary)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            onClick={() => invoke('show_settings')}
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
