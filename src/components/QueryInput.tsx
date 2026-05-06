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

import { KeyboardEvent, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';

export function QueryInput() {
  const { 
    query, setQuery, submitQuery, isLoading, 
    searchMode, setMode, clearAnswer,
    isModeMenuOpen, isModelMenuOpen, setModeMenuOpen, setModelMenuOpen
  } = useAppStore();
  const { llmModel, updateSetting, availableModels } = useSettingsStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Auto-resize textarea ───────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [query]);

  // ── Menu management ────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setModeMenuOpen(false);
        setModelMenuOpen(false);
      }
    };
    if (isModeMenuOpen || isModelMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModeMenuOpen, isModelMenuOpen, setModeMenuOpen, setModelMenuOpen]);

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

  const currentModelLabel = llmModel === 'qwen-coder' ? 'Qwen Coder' :
                           llmModel === 'qwen'       ? 'Qwen 72B' :
                           llmModel === 'deepseek'   ? 'DeepSeek' :
                           llmModel === 'llama'      ? 'Llama 3.3' :
                           llmModel === 'mistral'    ? 'Mistral' :
                           llmModel.includes('gemini') ? 'Gemini' : 
                           llmModel.includes('claude') ? 'Claude' : 
                           llmModel.includes('grok') ? 'Grok' : 
                           llmModel.includes('gpt') ? 'ChatGPT' : llmModel;

  return (
    <div ref={containerRef} className="flex items-center w-full gap-2">
      {/* Mode Switcher */}
      <div className="relative">
        <button
          className="flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-white/10 transition-colors"
          style={{ color: 'var(--clr-accent)' }}
          onClick={(e) => {
            e.stopPropagation();
            setModeMenuOpen(!isModeMenuOpen);
            if (!isModeMenuOpen) setModelMenuOpen(false); // Close other menu
          }}
        >
          {getModeIcon()}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        
        {isModeMenuOpen && (
          <div className="absolute top-full left-0 mt-2 w-32 glass rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {(['search', 'site', 'app'] as const).map(m => (
              <button
                key={m}
                className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors hover:bg-white/10 ${searchMode === m ? 'text-[var(--clr-accent)]' : 'text-[var(--clr-text-secondary)]'}`}
                onClick={() => { setMode(m); setModeMenuOpen(false); }}
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
            onClick={(e) => {
              e.stopPropagation();
              setModelMenuOpen(!isModelMenuOpen);
              if (!isModelMenuOpen) setModeMenuOpen(false); // Close other menu
            }}
          >
            {currentModelLabel}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="6 9 12 15 18 9" /></svg>
          </button>

          {isModelMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 glass rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="max-h-48 overflow-y-auto scrollbar-thin">
                {/* Free Models */}
                <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
                  <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Free Models</span>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      updateSetting('enableFailover', !useSettingsStore.getState().enableFailover); 
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all ${useSettingsStore.getState().enableFailover ? 'bg-[var(--clr-accent)]/10 border-[var(--clr-accent)]/30 text-[var(--clr-accent)]' : 'bg-white/5 border-white/10 text-white/40'}`}
                    title={useSettingsStore.getState().enableFailover ? "High Reliability: Will try other models if the selected one fails (Slower)" : "Speed Mode: Direct connection (Faster)"}
                  >
                    <span style={{ fontSize: '8px' }}>{useSettingsStore.getState().enableFailover ? 'Reliable' : 'Speed'}</span>
                    <div className={`w-2 h-2 rounded-full ${useSettingsStore.getState().enableFailover ? 'bg-[var(--clr-accent)]' : 'bg-white/20'}`} />
                  </button>
                </div>
                {[
                  { id: 'qwen-coder', label: 'Qwen 2.5 Coder' },
                  { id: 'qwen',       label: 'Qwen 2.5 72B' },
                  { id: 'deepseek',   label: 'DeepSeek V3' },
                  { id: 'llama',      label: 'Llama 3.3' },
                  { id: 'mistral',    label: 'Mistral Large' }
                ].map(m => (
                  <button
                    key={m.id}
                    className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors hover:bg-white/10 ${llmModel === m.id ? 'text-[var(--clr-accent)]' : 'text-[var(--clr-text-secondary)]'}`}
                    onClick={() => { updateSetting('llmModel', m.id); setModelMenuOpen(false); }}
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
                        onClick={() => { updateSetting('llmModel', m); setModelMenuOpen(false); }}
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
