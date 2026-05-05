// ─────────────────────────────────────────────────────────────────────────────
// QueryInput.tsx — Search input for the overlay
// ─────────────────────────────────────────────────────────────────────────────
// A textarea that auto-expands as the user types. Supports keyboard shortcuts:
//   • Enter          → Submit query to AI
//   • Ctrl+Enter     → Open query in AI site
//   • Alt+Enter      → Open query in web browser
//   • Shift+Enter    → New line (no submit)
//   • /              → Focus this input (from anywhere in the window)
// ─────────────────────────────────────────────────────────────────────────────

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';

export function QueryInput() {
  const { 
    query, setQuery, submitQuery, isLoading, 
    searchMode, setMode, clearAnswer, availableModels 
  } = useAppStore();
  const { llmModel, updateSetting } = useSettingsStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  // ── Auto-resize textarea ───────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [query]);

  // ── Focus management ───────────────────────────────────────────────────
  useEffect(() => {
    const focus = () => textareaRef.current?.focus();
    focus();
    window.addEventListener('focus-input', focus);
    const handleGlobalKey = (e: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== textareaRef.current) {
        e.preventDefault();
        focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey as any);
    return () => {
      window.removeEventListener('focus-input', focus);
      window.removeEventListener('keydown', handleGlobalKey as any);
    };
  }, []);

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey) {
        e.preventDefault();
        document.getElementById('ai-btn')?.click();
      } else if (e.altKey) {
        e.preventDefault();
        document.getElementById('web-btn')?.click();
      } else if (!e.shiftKey) {
        e.preventDefault();
        submitQuery();
      }
    }
    
    // Shift+Esc for collapse (clear)
    if (e.key === 'Escape' && e.shiftKey) {
      e.preventDefault();
      clearAnswer();
    }
  };

  const getModeIcon = () => {
    switch (searchMode) {
      case 'site': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
      );
      case 'app': return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
      );
      default: return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
      );
    }
  };

  const currentModelLabel = llmModel === 'minimax-2.5' ? 'MiniMax' :
                           llmModel === 'gemini-1.5-flash-8b' ? 'Gemini Flash' :
                           llmModel.includes('gemini') ? 'Gemini' : 
                           llmModel.includes('claude') ? 'Claude' : 
                           llmModel.includes('grok') ? 'Grok' : 
                           llmModel.includes('gpt') ? 'ChatGPT' : llmModel;

  return (
    <div className="flex items-center w-full gap-2">
      {/* Mode Switcher */}
      <div className="relative">
        <button
          className="flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-white/10 transition-colors"
          style={{ color: 'var(--clr-accent)' }}
          onClick={() => setShowModeMenu(!showModeMenu)}
        >
          {getModeIcon()}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        
        {showModeMenu && (
          <div className="absolute top-full left-0 mt-2 w-32 glass rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {(['search', 'site', 'app'] as const).map(m => (
              <button
                key={m}
                className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors hover:bg-white/10 ${searchMode === m ? 'text-[var(--clr-accent)]' : 'text-[var(--clr-text-secondary)]'}`}
                onClick={() => { setMode(m); setShowModeMenu(false); }}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <textarea
        ref={textareaRef}
        autoFocus
        disabled={isLoading}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={searchMode === 'search' ? "Ask anything..." : searchMode === 'site' ? "Enter URL..." : "Enter App Name..."}
        className="flex-1 bg-transparent border-none focus:outline-none resize-none scrollbar-none disabled:opacity-50"
        style={{
          color: 'var(--clr-text)',
          fontSize: '14px',
          fontFamily: 'inherit',
          fontWeight: 400,
          lineHeight: '1.5',
          minHeight: '22px',
          maxHeight: '120px',
          paddingTop: '2px',
        }}
        rows={1}
      />

      {/* Model Switcher (only for search mode) */}
      {searchMode === 'search' && (
        <div className="relative">
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-white/10 hover:bg-white/5 transition-all"
            style={{ color: 'var(--clr-text-secondary)', fontSize: '10px', fontWeight: 'bold' }}
            onClick={() => setShowModelMenu(!showModelMenu)}
          >
            {currentModelLabel}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="6 9 12 15 18 9" /></svg>
          </button>

          {showModelMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 glass rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="max-h-48 overflow-y-auto scrollbar-thin">
                {/* Free Models */}
                <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest opacity-40 font-bold border-b border-white/5">Free Models</div>
                {[
                  { id: 'minimax-2.5', label: 'MiniMax' },
                  { id: 'gemini-1.5-flash-8b', label: 'Gemini Flash' }
                ].map(m => (
                  <button
                    key={m.id}
                    className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors hover:bg-white/10 ${llmModel === m.id ? 'text-[var(--clr-accent)]' : 'text-[var(--clr-text-secondary)]'}`}
                    onClick={() => { updateSetting('llmModel', m.id); setShowModelMenu(false); }}
                  >
                    {m.label}
                  </button>
                ))}
                
                {/* Dynamic/Paid Models */}
                {availableModels.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest opacity-40 font-bold border-b border-white/5 border-t">Your Models</div>
                    {availableModels.map(m => (
                      <button
                        key={m}
                        className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors hover:bg-white/10 ${llmModel === m ? 'text-[var(--clr-accent)]' : 'text-[var(--clr-text-secondary)]'}`}
                        onClick={() => { updateSetting('llmModel', m); setShowModelMenu(false); }}
                      >
                        {m.split('/').pop()?.replace('models/', '') || m}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
