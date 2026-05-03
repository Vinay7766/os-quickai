// ─────────────────────────────────────────────────────────────────────────────
// Overlay.tsx — The search bar assistant panel
// ─────────────────────────────────────────────────────────────────────────────
// This is the floating search overlay that appears when the user presses
// the global hotkey (default: Alt+A). It provides:
//   • A text input for querying AI models
//   • Action buttons for web search and AI site redirect
//   • A results panel showing the AI response
//   • Drag-to-move support (click and drag on non-interactive areas)
//   • Auto-hide when focus is lost
//
// The overlay reads settings (theme, browser, AI model, etc.) from the
// shared settings store and syncs in real-time when they change.
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
// Maps search engine and AI site identifiers to their URLs.

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
  // ── State & Refs ─────────────────────────────────────────────────────────
  const { answer, isLoading, error, clearAnswer, query } = useAppStore();

  // Subscribe to ALL settings we need from the store.
  // When any of these change (via cross-window event), the component re-renders.
  const browser      = useSettingsStore((s) => s.browser);
  const llmSite      = useSettingsStore((s) => s.llmSite);
  const llmModel     = useSettingsStore((s) => s.llmModel);
  const searchEngine = useSettingsStore((s) => s.searchEngine);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  // Subscribe to theme changes so CSS variables update when theme switches.
  // The actual DOM class toggle is handled inside the store, but subscribing
  // here ensures the overlay's React tree re-renders with updated CSS vars.
  void useSettingsStore((s) => s.theme);

  const updateVersion = useUpdateCheck();
  const [copied, setCopied] = useState(false);
  const hasContent = isLoading || !!error || !!answer;
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Window Resize ──────────────────────────────────────────────────────
  // Dynamically resizes the overlay window to fit its content.
  const resizeWindow = useCallback(async (contentHeight: number) => {
    try {
      const h = Math.min(Math.max(contentHeight, SEARCH_BAR_HEIGHT), MAX_WINDOW_HEIGHT);
      await getCurrentWindow().setSize(new LogicalSize(700, h));
    } catch {
      /* Ignore resize errors (e.g., during window transitions) */
    }
  }, []);

  // Resize whenever content changes
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

  // ── Load Settings on Mount ─────────────────────────────────────────────
  // This runs once when the overlay is first created. It reads settings
  // from disk AND registers the cross-window event listener so that
  // future changes from the Settings window are applied instantly.
  useEffect(() => {
    loadSettings();
  }, []);

  // ── Focus & Blur Handling ──────────────────────────────────────────────
  // When the overlay gains focus, reload settings to pick up any changes
  // from the main page. When it loses focus, auto-hide (unless dragging).
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          // Re-read settings from disk when overlay is focused
          // (backup sync in case an event was missed while hidden)
          loadSettings();
          window.dispatchEvent(new Event('focus-input'));
        } else if (!isDragging.current) {
          // getCurrentWindow().hide();
        }
      })
      .then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, []);

  // ── Escape Key Handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        getCurrentWindow().hide();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Action Handlers ────────────────────────────────────────────────────

  /** Opens the query in the user's preferred web browser */
  const handleBrowserSearch = async () => {
    if (!query.trim()) return;
    const searchUrl = (SEARCH_URLS[searchEngine] ?? SEARCH_URLS.google) + encodeURIComponent(query);

    try {
      if (browser === 'default' || !browser) {
        // Use the system's default browser
        await open(searchUrl);
      } else {
        // Use the user's selected browser
        await searchInBrowser(browser, searchUrl);
      }
    } catch (e) {
      alert(String(e));
    }
  };

  /** Opens the query in the user's preferred AI site.
   *  For sites that support URL params (Perplexity, Gemini), the query is appended.
   *  For others (ChatGPT, Claude, Grok), the query is copied to clipboard first. */
  const handleAIOpen = async () => {
    if (!query.trim()) return;

    // Determine which AI site to use
    const site = llmSite === 'default' ? 'claude' : llmSite;
    let url = AI_URLS[site] ?? AI_URLS.claude;

    // Some sites support query parameters for auto-filling the input
    if (site === 'perplexity') {
      url = `https://www.perplexity.ai/?q=${encodeURIComponent(query)}`;
    } else if (site === 'gemini') {
      url = `https://gemini.google.com/app?q=${encodeURIComponent(query)}`;
    } else {
      // For sites without query param support, copy query to clipboard
      try {
        await writeText(query);
      } catch {
        /* Clipboard write failed — user can still paste manually */
      }
    }

    // Open in the user's preferred browser
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

  /** Copies the AI response to the clipboard */
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

  /** Initiates window dragging when the user clicks on non-interactive areas */
  const handleDrag = () => {
    isDragging.current = true;
    getCurrentWindow().startDragging();
    setTimeout(() => { isDragging.current = false; }, 500);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="glass"
      style={{
        width: '100%',
        height: '100%',
        minHeight: SEARCH_BAR_HEIGHT,
        background: 'var(--clr-glass)',
        borderRadius: hasContent ? 24 : 9999,
        border: '1.5px solid var(--clr-accent)',
        boxShadow: 'var(--shadow-overlay)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-radius 0.2s ease',
      }}
    >
      {/* Update notification banner */}
      {updateVersion && <UpdateBanner version={updateVersion} />}

      {/* ── Search Bar Row ────────────────────────────────────────────── */}
      <div
        onMouseDown={(e) => {
          // Only start dragging if the user didn't click a button or input
          if ((e.target as HTMLElement).closest('button, input, textarea')) return;
          handleDrag();
        }}
        className="flex items-center gap-3 px-4 shrink-0 cursor-move select-none"
        style={{ height: `${SEARCH_BAR_HEIGHT}px` }}
      >
        {/* Search icon */}
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
          style={{ background: 'var(--clr-accent-soft)', color: 'var(--clr-accent)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        {/* Query input (auto-expanding textarea) */}
        <div className="flex-1 min-w-0">
          <QueryInput />
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-1 shrink-0 px-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Web Search button */}
          <button
            id="web-btn"
            className="pill-btn green"
            onClick={handleBrowserSearch}
            title="Search in browser (Alt+Enter)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Web
          </button>

          {/* AI Site button */}
          <button
            id="ai-btn"
            className="pill-btn blue"
            onClick={handleAIOpen}
            title="Open in AI site (Ctrl+Enter)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            AI
          </button>

          {/* Clear / Close button */}
          <button className="icon-btn" onClick={() => clearAnswer()} title="Clear (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Results Area ──────────────────────────────────────────────── */}
      {hasContent && (
        <div className="flex flex-col flex-1 min-h-0 animate-fade-in-up">
          {/* Divider */}
          <div className="h-px mx-4 opacity-50" style={{ background: 'var(--clr-border)' }} />

          {/* Scrollable results */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <ResultPanel />
          </div>

          {/* Bottom bar with copy button and model info */}
          <div className="h-px mx-4 opacity-50" style={{ background: 'var(--clr-border)' }} />
          <div
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              handleDrag();
            }}
            className="flex items-center gap-3 px-5 shrink-0 cursor-move select-none"
            style={{ height: '46px' }}
          >
            {/* Copy response button */}
            {answer && (
              <button
                onClick={handleCopy}
                className="px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 active:scale-95"
                style={{
                  background: copied ? 'var(--clr-success-soft)' : 'var(--clr-input-bg)',
                  border: `1px solid ${copied ? 'var(--clr-success)' : 'var(--clr-border)'}`,
                  color: copied ? 'var(--clr-success)' : 'var(--clr-text)',
                }}
              >
                {copied ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}

            <div className="flex-1" />

            {/* Active model indicator */}
            <div className="flex items-center gap-1.5 opacity-40">
              <div className="w-1 h-1 rounded-full" style={{ background: 'var(--clr-accent)' }} />
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--clr-text-secondary)' }}>
                {llmModel}
              </span>
            </div>

            {/* Dismiss hint */}
            <span className="text-[9px] font-medium uppercase tracking-wider opacity-30" style={{ color: 'var(--clr-text-tertiary)' }}>
              Esc
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
