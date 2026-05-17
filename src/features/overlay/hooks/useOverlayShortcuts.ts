/**
 * useOverlayShortcuts Hook
 * 
 * Centralizes all keyboard shortcut listeners for the search overlay,
 * including mode switching (Ctrl+1-4) and state management (Esc).
 * 
 * Depends on: core/store/useAppStore
 * Used by: features/overlay/Overlay
 */
import { useEffect } from 'react';
import { useAppStore } from '../../../core/store/useAppStore';

/**
 * Hook to manage global keyboard shortcuts for the search overlay.
 */
export function useOverlayShortcuts() {
  const { clearAnswer, prevAnswer, prevQuery, setMode } = useAppStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Shift + Escape: Clear current state
      if (e.key === 'Escape' && e.shiftKey) {
        clearAnswer();
        return;
      }

      // Ctrl + Escape: Undo / Restore previous query
      if (e.key === 'Escape' && e.ctrlKey) {
        if (prevAnswer || prevQuery) {
          useAppStore.setState({ 
            answer: prevAnswer, 
            query: prevQuery, 
            prevAnswer: '', 
            prevQuery: '' 
          });
        }
        return;
      }

      // Escape: Focus search input
      if (e.key === 'Escape') {
        const input = document.querySelector('textarea, input');
        if (input instanceof HTMLElement) input.focus();
      }

      // Ctrl + 1-4: Mode Switching
      if (e.ctrlKey && e.key === '1') { e.preventDefault(); setMode('search'); return; }
      if (e.ctrlKey && e.key === '2') { e.preventDefault(); setMode('site'); return; }
      if (e.ctrlKey && e.key === '3') { e.preventDefault(); setMode('app'); return; }
      if (e.ctrlKey && e.key === '4') { e.preventDefault(); setMode('terminal'); return; }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearAnswer, prevAnswer, prevQuery, setMode]);
}
