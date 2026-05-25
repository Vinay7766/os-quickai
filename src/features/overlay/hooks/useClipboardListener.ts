import { useEffect, useRef } from 'react';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../../../core/store/useAppStore';

/**
 * useClipboardListener
 * Automatically pastes clipboard text into the search bar if it changes
 * while the overlay is hidden or when it first opens.
 * Also listens for the "instant-search" global hotkey to automatically submit.
 */
export function useClipboardListener() {
  const { setQuery, query, submitQuery, setMode } = useAppStore();
  const lastClipboardRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;

    const checkClipboard = async () => {
      try {
        const text = await readText();
        if (!mounted) return;
        
        // If the text is valid and different from the last seen text
        if (text && text.trim().length > 0 && text !== lastClipboardRef.current) {
          // If the user's current query is empty, auto-paste the clipboard!
          // (We don't overwrite if they are actively typing something else)
          if (query.trim() === '') {
            setQuery(text);
          }
          lastClipboardRef.current = text;
        }
      } catch (err) {
        // Clipboard read might fail or be empty, ignore
      }
    };

    // Check immediately on mount
    checkClipboard();

    // Check every time the window regains focus
    const handleFocus = () => {
      checkClipboard();
    };

    window.addEventListener('focus', handleFocus);

    // Listen for the "instant-search" global hotkey from Rust
    const unlistenPromise = listen('instant-search', async () => {
      try {
        const text = await readText();
        if (text && text.trim().length > 0) {
          setMode('search'); // Force AI Search mode
          setQuery(text);
          lastClipboardRef.current = text;
          
          // Small delay to ensure state updates before submitting
          setTimeout(() => {
            submitQuery();
          }, 50);
        }
      } catch (err) {
        // Ignore
      }
    });

    return () => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [setQuery, query, setMode]);
}
