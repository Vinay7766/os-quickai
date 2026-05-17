/**
 * useWindowResize Hook
 * 
 * Manages the dynamic resizing of the search overlay window based on content 
 * height and application state (loading, menu open, browser active).
 * 
 * Depends on: @tauri-apps/api/window, @tauri-apps/plugin-os
 * Used by: features/overlay/Overlay
 */
import { useEffect, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';

const SEARCH_BAR_HEIGHT = 52;

interface UseWindowResizeProps {
  hasContent: boolean;
  isMenuOpen: boolean;
  internalUrl: string | null;
  answer: string | null;
  error: string | null;
  isLoading: boolean;
  resultRef: React.RefObject<HTMLDivElement>;
  loadSettings: () => Promise<void>;
  refreshModels: () => Promise<void>;
  searchMode: string;
}

/**
 * Hook to manage window auto-resizing based on content and state.
 */
export function useWindowResize({
  hasContent,
  isMenuOpen,
  internalUrl,
  answer,
  error,
  isLoading,
  resultRef,
  loadSettings,
  refreshModels,
  searchMode
}: UseWindowResizeProps) {
  const resizeWindow = useCallback(async (h: number) => {
    try {
      const win = getCurrentWindow();
      const size = await win.innerSize();
      const FIXED_WIDTH = searchMode === 'search' ? 480 : 380;
      
      const factor = await win.scaleFactor();
      const currentH = size.height / factor;
      const currentW = size.width / factor;

      if (Math.abs(currentH - h) > 1 || Math.abs(currentW - FIXED_WIDTH) > 1) {
         await win.setSize(new LogicalSize(FIXED_WIDTH, h));
      }
    } catch { /* Ignore */ }
  }, [searchMode]);

  useEffect(() => {
    const trigger = () => {
      if (isMenuOpen) {
        resizeWindow(300);
      } else if (internalUrl) {
        resizeWindow(600);
      } else if (hasContent) {
        const searchH = SEARCH_BAR_HEIGHT + 24;
        const resultH = resultRef.current?.scrollHeight || 200;
        const footerH = 48;
        let totalH = searchH + resultH + footerH + 16;
        const targetH = Math.min(totalH, 750);
        resizeWindow(targetH);
      } else {
        resizeWindow(SEARCH_BAR_HEIGHT);
      }
    };

    trigger();
    const timers = [10, 50, 100, 200, 500, 1000].map(ms => setTimeout(trigger, ms));
    return () => timers.forEach(t => clearTimeout(t));
  }, [hasContent, isMenuOpen, internalUrl, answer, error, isLoading, resizeWindow, resultRef]);

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

  return { resizeWindow };
}
