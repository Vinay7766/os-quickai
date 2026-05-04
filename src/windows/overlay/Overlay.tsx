// ─────────────────────────────────────────────────────────────────────────────
// Overlay.tsx — The search bar assistant panel
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { QueryInput } from '../../components/QueryInput';
import { ResultPanel } from '../../components/ResultPanel';
import { UpdateBanner } from '../../components/UpdateBanner';
import { useUpdateCheck } from '../../hooks/useUpdateCheck';
import { searchInBrowser } from '../../lib/tauriCommands';
import { open } from '@tauri-apps/plugin-shell';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

// ── URL Mappings ─────────────────────────────────────────────────────────────
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

// ── Layout Constants ─────────────────────────────────────────────────────────
const SEARCH_BAR_HEIGHT = 56;
const MAX_WINDOW_HEIGHT = 600;

export default function Overlay() {
  const { answer, isLoading, error, clearAnswer, query } = useAppStore();
  const browser      = useSettingsStore((s) => s.browser);
  const llmSite      = useSettingsStore((s) => s.llmSite);
  const llmModel     = useSettingsStore((s) => s.llmModel);
  const searchEngine = useSettingsStore((s) => s.searchEngine);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  
  void useSettingsStore((s) => s.theme);

  const updateVersion = useUpdateCheck();
  const [copied, setCopied] = useState(false);
  const hasContent = isLoading || !!error || !!answer;
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resizeWindow = useCallback(async (contentHeight: number) => {
    try {
      const win = getCurrentWindow();
      const size = await win.innerSize();
      // Add buffer for padding (4px) and border (4px) = +8px
      const h = Math.min(Math.max(contentHeight + 12, SEARCH_BAR_HEIGHT + 12), MAX_WINDOW_HEIGHT);
      // Respect current width if user has resized manually
      await win.setSize(new LogicalSize(size.width > 100 ? size.width : 700, h));
    } catch {
      /* Ignore resize errors */
    }
  }, []);

  useEffect(() => {
    document.body.classList.add('overlay-window');
    return () => document.body.classList.remove('overlay-window');
  }, []);

  useEffect(() => {
    if (hasContent) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          resizeWindow(containerRef.current.scrollHeight);
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      resizeWindow(SEARCH_BAR_HEIGHT);
    }
  }, [hasContent, answer, isLoading, error, resizeWindow]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          loadSettings();
          window.dispatchEvent(new Event('focus-input'));
        }
      })
      .then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, [loadSettings]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearAnswer();
        const input = document.querySelector('textarea, input');
        if (input instanceof HTMLElement) input.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearAnswer]);

  const handleBrowserSearch = async () => {
    if (!query.trim()) return;
    const searchUrl = (SEARCH_URLS[searchEngine] ?? SEARCH_URLS.google) + encodeURIComponent(query);
    try {
      if (browser === 'default' || !browser) {
        await open(searchUrl);
      } else {
        await searchInBrowser(browser, searchUrl);
      }
    } catch (e) {
      alert(String(e));
    }
  };

  const handleAIOpen = async () => {
    if (!query.trim()) return;
    const site = llmSite === 'default' ? 'claude' : llmSite;
    let url = AI_URLS[site] ?? AI_URLS.claude;
    if (site === 'perplexity') {
      url = `https://www.perplexity.ai/?q=${encodeURIComponent(query)}`;
    } else if (site === 'gemini') {
      url = `https://gemini.google.com/app?q=${encodeURIComponent(query)}`;
    } else {
      try {
        await writeText(query);
      } catch {}
    }
    try {
      if (browser === 'default' || !browser) {
        await open(url);
      } else {
        await searchInBrowser(browser, url);
      }
    } catch (e) {
      alert(String(e));
    }
  };

  const handleCopy = async () => {
    if (!answer) return;
    try {
      await writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        await navigator.clipboard.writeText(answer);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  const handleDrag = () => {
    isDragging.current = true;
    getCurrentWindow().startDragging();
    setTimeout(() => { isDragging.current = false; }, 500);
  };

  return (
    <div className="p-[2px] w-screen h-screen overflow-hidden">
      <div
        ref={containerRef}
        className="glass h-full w-full"
        style={{
          minHeight: SEARCH_BAR_HEIGHT,
          background: 'var(--clr-glass)',
          borderRadius: hasContent ? 24 : 9999,
          border: '2px solid var(--clr-accent)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'border-radius 0.2s ease',
        }}
      >
      {updateVersion && <UpdateBanner version={updateVersion} />}

      {/* ── Search Bar Section ─────────────────────────────────────────── */}
      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button, input, textarea')) return;
          handleDrag();
        }}
        className={`flex items-center gap-3 px-4 shrink-0 cursor-move select-none transition-all duration-300 ${
          hasContent ? 'mt-1 mx-2 rounded-2xl border border-white/5' : ''
        }`}
        style={{ height: `${SEARCH_BAR_HEIGHT}px`, marginBottom: hasContent ? '4px' : '0' }}
      >
        <div className="flex items-center justify-center w-7 h-7 shrink-0" style={{ color: 'var(--clr-accent)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <QueryInput />
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
            id="web-btn"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-green-500/20 active:scale-95"
            style={{ color: 'var(--clr-success)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
            onClick={handleBrowserSearch}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </button>

          <button
            id="ai-btn"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-blue-500/20 active:scale-95"
            style={{ color: 'var(--clr-accent)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
            onClick={handleAIOpen}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Answer Section ────────────────────────────────────────────── */}
      {hasContent && (
        <div className="flex flex-col flex-1 min-h-0 animate-fade-in-up">
          <div className="flex-1 overflow-auto" style={{ maxHeight: '460px' }}>
            <div className="px-6 py-4">
              <ResultPanel />
            </div>
          </div>
          
          <div
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              handleDrag();
            }}
            className="flex items-center gap-3 px-6 shrink-0 cursor-move select-none"
            style={{ height: '48px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid var(--clr-border)' }}
          >
            {answer && (
              <button
                onClick={handleCopy}
                className="px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 active:scale-95 hover:brightness-110"
                style={{
                  background: copied ? 'var(--clr-success-soft)' : 'var(--clr-accent-soft)',
                  border: `1px solid ${copied ? 'var(--clr-success)' : 'var(--clr-accent)'}`,
                  color: copied ? 'var(--clr-success)' : 'var(--clr-accent)',
                }}
              >
                {copied ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                )}
                {copied ? 'Copied' : 'Copy Response'}
              </button>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 opacity-60">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--clr-accent)' }} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--clr-text-secondary)' }}>
                {llmModel}
              </span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 px-2 py-0.5 rounded border border-current" style={{ color: 'var(--clr-text-tertiary)' }}>
              Esc
            </span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
