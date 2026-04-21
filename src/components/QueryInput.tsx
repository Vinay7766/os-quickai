import { KeyboardEvent, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export function QueryInput() {
  const { query, setQuery, submitQuery, isLoading } = useAppStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [query]);

  // Auto-focus when overlay mounts
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Escape is handled by Overlay.tsx
    
    if (e.key === 'Enter') {
      if (e.ctrlKey) {
        // AI Shortcut
        e.preventDefault();
        const aiBtn = document.getElementById('ai-btn');
        aiBtn?.click();
      } else if (e.altKey) {
        // Web Shortcut
        e.preventDefault();
        const webBtn = document.getElementById('web-btn');
        webBtn?.click();
      } else if (!e.shiftKey) {
        // Regular Enter -> Local AI Answer
        e.preventDefault();
        submitQuery();
      }
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
      placeholder="Ask anything..."
      className="w-full bg-transparent border-none focus:outline-none resize-none scrollbar-none disabled:opacity-50"
      style={{
        color: 'var(--clr-text)',
        fontSize: '15px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 400,
        lineHeight: '1.5',
        minHeight: '24px',
        maxHeight: '120px',
        paddingTop: '2px',
      }}
      rows={1}
    />
  );
}
