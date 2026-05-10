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
const SEARCH_BAR_HEIGHT = 52;

export default function Overlay() {
  const { 
    answer, isLoading, error, clearAnswer, query, setQuery,
    prevAnswer, prevQuery, isModeMenuOpen, isModelMenuOpen,
    internalUrl, setInternalUrl, searchMode, setMode
  } = useAppStore();
  
  const browser        = useSettingsStore((s) => s.browser);
  const llmSite        = useSettingsStore((s) => s.llmSite);
  const searchEngine   = useSettingsStore((s) => s.searchEngine);
  const loadSettings        = useSettingsStore((s) => s.loadSettings);
  const refreshModels       = useSettingsStore((s) => s.refreshModels);
  
  void useSettingsStore((s) => s.theme);

  const updateVersion = useUpdateCheck();
  const [copied, setCopied] = useState(false);
  // Expand if we have an answer, an error, an internal URL, or if searching (show dots)
  const hasContent = (searchMode === 'search' && (isLoading || !!answer)) || !!error || !!internalUrl;
  const isMenuOpen = isModeMenuOpen || isModelMenuOpen;
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const resizeWindow = useCallback(async (h: number) => {
    try {
      const win = getCurrentWindow();
      const size = await win.innerSize();
      const FIXED_WIDTH = 680;
      
      const factor = await win.scaleFactor();
      const currentH = size.height / factor;
      const currentW = size.width / factor;

      if (Math.abs(currentH - h) > 1 || Math.abs(currentW - FIXED_WIDTH) > 1) {
         await win.setSize(new LogicalSize(FIXED_WIDTH, h));
      }
    } catch { /* Ignore */ }
  }, []);

  useEffect(() => {
    document.body.classList.add('overlay-window');
    return () => document.body.classList.remove('overlay-window');
  }, []);

  // ── Auto-resize logic ──────────────────────────────────────────────────
  useEffect(() => {
    const trigger = () => {
      if (isMenuOpen) {
        resizeWindow(300);
      } else if (internalUrl) {
        resizeWindow(600);
      } else if (hasContent) {
        // Calculate total height: Search Bar + Result Content + Footer
        const searchH = SEARCH_BAR_HEIGHT + 24; // Including margins
        const resultH = resultRef.current?.scrollHeight || 200;
        const footerH = 48;
        
        let totalH = searchH + resultH + footerH + 16;
        
        // Cap the window height to prevent it from going off-screen
        const targetH = Math.min(totalH, 750);
        resizeWindow(targetH);
      } else {
        resizeWindow(SEARCH_BAR_HEIGHT);
      }
    };

    trigger();
    const timers = [50, 200, 500, 1000].map(ms => setTimeout(trigger, ms));
    return () => timers.forEach(t => clearTimeout(t));
  }, [hasContent, isMenuOpen, internalUrl, answer, error, isLoading, resizeWindow]);

  useEffect(() => {
    loadSettings().then(() => refreshModels());
  }, [loadSettings, refreshModels]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          loadSettings().then(() => refreshModels());
          window.dispatchEvent(new Event('focus-input'));
        }
      })
      .then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, [loadSettings, refreshModels]);

  // ── Shortcuts ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Shift+Esc → Clear/Collapse
      if (e.key === 'Escape' && e.shiftKey) {
        clearAnswer();
        return;
      }
      
      // Ctrl+Esc → Back
      if (e.key === 'Escape' && e.ctrlKey) {
        if (prevAnswer || prevQuery) {
          useAppStore.setState({ answer: prevAnswer, query: prevQuery, prevAnswer: '', prevQuery: '' });
        }
        return;
      }

      // Plain Esc → Focus input
      if (e.key === 'Escape') {
        const input = document.querySelector('textarea, input');
        if (input instanceof HTMLElement) input.focus();
      }

      // Ctrl + 1, 2, 3 → Switch Modes
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setMode('search');
        return;
      }
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setMode('site');
        return;
      }
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setMode('app');
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearAnswer, prevAnswer, prevQuery, setMode]);

  const handleBrowserSearch = async () => {
    if (!query.trim()) return;
    const searchUrl = (SEARCH_URLS[searchEngine] ?? SEARCH_URLS.google) + encodeURIComponent(query);
    try {
      if (browser === 'default' || !browser) {
        await open(searchUrl);
      } else {
        await searchInBrowser(browser, searchUrl);
      }
      setQuery('');
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
      try { await writeText(query); } catch {}
    }
    
    try {
      if (browser === 'default' || !browser) {
        await open(url);
      } else {
        await searchInBrowser(browser, url);
      }
      setQuery('');
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
    <div 
      className="w-full h-screen overflow-hidden flex flex-col box-border relative"
      style={{
        // BORDER ONLY - SHADOW REMOVED TO ELIMINATE "OUTER BORDER" ARTIFACT
        borderRadius: '28px',
        border: `2px solid ${isLoading ? 'var(--clr-accent)' : 'rgba(var(--clr-accent-rgb), 0.5)'}`,
        background: 'var(--clr-glass)',
        transition: 'border-color 0.3s ease', 
        boxShadow: 'none',
        margin: '1px', // Prevents border-clipping on transparent window edges
      }}
    >
      <div
        ref={containerRef}
        className="flex-1 flex flex-col relative w-full"
        style={{
          minHeight: SEARCH_BAR_HEIGHT,
          background: 'transparent',
          overflow: isMenuOpen ? 'visible' : 'hidden',
        }}
      >
        <div ref={contentRef} className="flex flex-col w-full min-h-full">
          {updateVersion && <UpdateBanner version={updateVersion} />}

          {/* ── Search Bar Section ─────────────────────────────────────────── */}
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
                title="Search on Web (Alt+Enter)"
              >
                <span className="text-[10px] font-black uppercase">Web</span>
              </button>

              <button
                id="ai-btn"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-blue-500/20 active:scale-95"
                style={{ color: 'var(--clr-accent)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                onClick={handleAIOpen}
                title="Open in AI Site (Ctrl+Enter)"
              >
                <span className="text-[10px] font-black uppercase">AI</span>
              </button>
            </div>
          </div>

          {/* ── Answer Section ────────────────────────────────────────────── */}
          {hasContent && (
            <div className="flex flex-col flex-1 min-h-0 animate-fade-in-up overflow-hidden">
              {internalUrl ? (
                /* ── Internal Browser View ── */
                <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between px-6 py-2 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-[10px] font-bold opacity-40 truncate uppercase tracking-widest">{internalUrl}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2">
                      <button 
                        onClick={() => open('https://ko-fi.com/vinay7766')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[9px] font-bold text-[var(--clr-text-secondary)] hover:text-white"
                        title="Support the Developer"
                      >
                        Support Me
                      </button>
                      <button 
                        onClick={() => open('https://ko-fi.com/pollinations')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[9px] font-bold text-[var(--clr-text-secondary)] hover:text-white"
                        title="Support Pollinations.ai"
                      >
                        Pollinations
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={async () => {
                          if (internalUrl) {
                            const { open } = await import('@tauri-apps/plugin-shell');
                            await open(internalUrl);
                          }
                        }}
                        className="px-2 py-1 rounded-md hover:bg-white/10 text-[10px] font-bold text-[var(--clr-accent)] uppercase tracking-widest transition-colors"
                      >
                        Open Externally
                      </button>
                      <button 
                        onClick={() => setInternalUrl(null)}
                        className="px-2 py-1 rounded-md hover:bg-white/10 text-[10px] font-bold text-[var(--clr-danger)] uppercase tracking-widest transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <iframe 
                    src={internalUrl} 
                    className="flex-1 w-full border-none bg-white" 
                    title="Internal Browser"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                /* ── Standard AI Result View ── */
                <>
                  <div 
                    ref={resultRef}
                    className="flex-1 min-h-[100px] overflow-auto scrollbar-thin scrollbar-thumb-[var(--clr-accent-soft)]"
                  >
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
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/5 active:scale-95"
                        style={{ color: copied ? 'var(--clr-success)' : 'var(--clr-text-secondary)' }}
                      >
                        {copied ? 'Copied!' : 'Copy Answer'}
                      </button>
                    )}

                    <div className="flex-1" />

                    <button
                      onClick={clearAnswer}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
                    >
                      Clear State
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
