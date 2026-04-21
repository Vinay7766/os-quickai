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

const SEARCH_URLS: Record<string, string> = {
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  perplexity: 'https://www.perplexity.ai/?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
};
const AI_URLS: Record<string, string> = {
  chatgpt: 'https://chatgpt.com/',
  claude: 'https://claude.ai/',
  gemini: 'https://gemini.google.com/',
  grok: 'https://x.ai/grok',
  perplexity: 'https://www.perplexity.ai/',
};

const PILL_HEIGHT = 62;
const MAX_HEIGHT = 500;

export default function Overlay() {
  const { answer, isLoading, error, clearAnswer, query } = useAppStore();
  const { browser, llmSite, searchEngine, loadSettings } = useSettingsStore();
  const updateVersion = useUpdateCheck();
  const [copied, setCopied] = useState(false);
  const hasContent = isLoading || !!error || !!answer;
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resizeWindow = useCallback(async (contentHeight: number) => {
    try {
      const h = Math.min(Math.max(contentHeight, PILL_HEIGHT), MAX_HEIGHT);
      await getCurrentWindow().setSize(new LogicalSize(680, h));
    } catch { /* ignore */ }
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
      resizeWindow(PILL_HEIGHT);
    }
  }, [hasContent, answer, isLoading, error, resizeWindow]);

  useEffect(() => { loadSettings(); }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          loadSettings();
        } else if (!isDragging.current) {
          getCurrentWindow().hide();
        }
      })
      .then(fn => { unlisten = fn; });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { getCurrentWindow().hide(); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const handleBrowserSearch = async () => {
    if (!query.trim()) return;
    const url = (SEARCH_URLS[searchEngine] ?? SEARCH_URLS.google) + encodeURIComponent(query);
    try { await searchInBrowser(browser || 'chrome', url); }
    catch (e) { alert(String(e)); }
  };

  const handleAIOpen = async () => {
    if (!query.trim()) return;
    let url = AI_URLS[llmSite] ?? AI_URLS.chatgpt;
    if (llmSite === 'perplexity') url = `https://www.perplexity.ai/?q=${encodeURIComponent(query)}`;
    if (llmSite === 'gemini') url = `https://gemini.google.com/app?q=${encodeURIComponent(query)}`;
    await open(url);
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

  const handlePillMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest('button, input, textarea, select, a')) return;
    isDragging.current = true;
    getCurrentWindow().startDragging();
    setTimeout(() => { isDragging.current = false; }, 500);
  };

  /* ── The entire window is filled by one solid-background container ── */
  /* No transparent gaps. Rounded corners via CSS + transparent window.  */
  return (
    <div
      ref={containerRef}
      onMouseDown={handlePillMouseDown}
      style={{
        width: '100%',
        height: '100%',
        minHeight: PILL_HEIGHT,
        background: 'var(--clr-surface)',
        borderRadius: 16,
        border: '1.5px solid var(--clr-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'move',
        userSelect: 'none',
      }}
    >
      {updateVersion && <UpdateBanner version={updateVersion} />}
      
      {/* ── Search pill row ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        height: 54,
        flexShrink: 0,
      }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke="var(--clr-indigo)" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>

        <div style={{ flex: 1, minWidth: 0 }}>
          <QueryInput />
        </div>

        {isLoading && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {[0, 1, 2].map(i => (
              <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <button id="web-btn" className="pill-btn green" onClick={handleBrowserSearch} title="Search in browser (Alt+Enter)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Web
          </button>
          <button id="ai-btn" className="pill-btn indigo" onClick={handleAIOpen} title="Open in AI (Ctrl+Enter)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            AI
          </button>
          <button className="icon-btn" onClick={() => clearAnswer()} title="Clear (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Results area ── */}
      {hasContent && (
        <>
          <div style={{ height: 1, background: 'var(--clr-border)', flexShrink: 0 }} />
          <div style={{ padding: '16px 20px', maxHeight: 340, overflowY: 'auto', flex: 1 }}>
            <ResultPanel />
          </div>
          {answer && (
            <>
              <div style={{ height: 1, background: 'var(--clr-border)', flexShrink: 0 }} />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', flexShrink: 0,
              }}>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 14px', borderRadius: 10,
                    background: 'var(--clr-input-bg)',
                    border: '1px solid var(--clr-border)',
                    color: copied ? 'var(--clr-green)' : 'var(--clr-text)',
                    fontSize: 12, cursor: 'pointer', fontWeight: 600,
                  }}
                >{copied ? 'Copied' : 'Copy'}</button>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--clr-muted)' }}>Esc to hide</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
