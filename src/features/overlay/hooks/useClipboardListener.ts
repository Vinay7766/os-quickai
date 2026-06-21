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
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [setQuery, query, setMode]);
}
