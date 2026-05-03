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

export function QueryInput() {
  const { query, setQuery, submitQuery, isLoading } = useAppStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-resize textarea to fit content ────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [query]);

  // ── Focus management ───────────────────────────────────────────────────
  // Auto-focuses on mount and when the overlay gains focus.
  // Also listens for the "/" key to focus from anywhere in the window.
  useEffect(() => {
    const focus = () => textareaRef.current?.focus();

    // Initial focus when the overlay opens
    focus();

    // Re-focus when parent signals (e.g., window regains focus)
    window.addEventListener('focus-input', focus);

    // "/" key focuses the input from anywhere in the window
    const handleGlobalKey = (e: Event) => {
      const ke = e as globalThis.KeyboardEvent;
      if (ke.key === '/' && document.activeElement !== textareaRef.current) {
        ke.preventDefault();
        focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);

    return () => {
      window.removeEventListener('focus-input', focus);
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, []);

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey) {
        // Ctrl+Enter → Open in AI site
        e.preventDefault();
        document.getElementById('ai-btn')?.click();
      } else if (e.altKey) {
        // Alt+Enter → Web search
        e.preventDefault();
        document.getElementById('web-btn')?.click();
      } else if (!e.shiftKey) {
        // Enter (no modifier) → Submit AI query
        e.preventDefault();
        submitQuery();
      }
      // Shift+Enter → Default behavior (new line)
    }
  };

  return (
    <textarea
      ref={textareaRef}
      autoFocus
      disabled={isLoading}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Search the web"
      className="w-full bg-transparent border-none focus:outline-none resize-none scrollbar-none disabled:opacity-50"
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
  );
}
