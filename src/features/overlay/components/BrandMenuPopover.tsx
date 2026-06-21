/**
 * BrandMenuPopover
 * 
 * Lightweight view routing container for Quickno's header brand configuration dropdown.
 * Strictly adheres to 100% typographic visual layout conventions.
 * 
 * Depends on: React, useSettingsStore, @tauri-apps/plugin-shell
 * Used by: OverlayHeader
 */

import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../../../core/store/useSettingsStore';

// Subcomponents
import { ThemePanel } from './popover/ThemePanel';
import { ShortcutPanel } from './popover/ShortcutPanel';
import { BrowserPanel } from './popover/BrowserPanel';
import { SupportPanel } from './popover/SupportPanel';
import { TermsPanel } from './popover/TermsPanel';
import { AIPanel } from './popover/AIPanel';

interface BrandMenuPopoverProps {
  onClose: () => void;
}

type MenuView = 'main' | 'theme' | 'shortcut' | 'browser' | 'support' | 'terms' | 'ai';

/**
 * Renders the popover router with main lists and conditional sub-panels.
 * 
 * @param {BrandMenuPopoverProps} props - The component properties.
 * @returns {JSX.Element} The rendered popover card.
 */
export function BrandMenuPopover({ onClose }: BrandMenuPopoverProps) {
  const [view, setView] = useState<MenuView>('main');
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    theme,
    hotkey,
    browser,
    searchEngine,
    llmModel,
    availableModels,
    updateSetting,
    updateHotkey,
  } = useSettingsStore();

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        // Prevent dismissal only during hotkey recording
        const isRecording = document.querySelector('.border-\\[var\\(--clr-accent\\)\\]');
        if (!isRecording) {
          onClose();
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const currentBrowserLabel = browser === 'default' ? 'Default' : browser;

  return (
    <div
      ref={popoverRef}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute top-12 left-4 w-72 rounded-2xl border border-white/5 shadow-2xl z-50 overflow-hidden text-left flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-top-4 duration-200"
      style={{
        background: 'rgba(15, 15, 15, 0.95)',
        backdropFilter: 'blur(20px)',
        maxHeight: '320px',
      }}
    >
      {/* ── Sub-panels ──────────────────────────────────────────────────────── */}
      {view === 'ai' && (
        <AIPanel llmModel={llmModel} availableModels={availableModels} updateSetting={updateSetting} onBack={() => setView('main')} />
      )}

      {view === 'theme' && (
        <ThemePanel theme={theme} updateSetting={updateSetting} onBack={() => setView('main')} />
      )}

      {view === 'shortcut' && (
        <ShortcutPanel hotkey={hotkey} updateHotkey={updateHotkey} onBack={() => setView('main')} />
      )}

      {view === 'browser' && (
        <BrowserPanel browser={browser} searchEngine={searchEngine} llmModel={llmModel} availableModels={availableModels} updateSetting={updateSetting} onBack={() => setView('main')} />
      )}

      {view === 'support' && (
        <SupportPanel onBack={() => setView('main')} onViewTerms={() => setView('terms')} />
      )}

      {view === 'terms' && (
        <TermsPanel onBack={() => setView('main')} />
      )}

      {/* ── Main List View ──────────────────────────────────────────────────── */}
      {view === 'main' && (
        <>
          {/* Header Brand Info */}
          <div className="flex items-center justify-between p-3.5 border-b border-white/5 shrink-0 select-none">
            <span className="text-[11px] font-black uppercase tracking-wider text-white">Quickno</span>
            <span className="text-[9px] text-[var(--clr-accent)] font-bold uppercase tracking-wider">Configuration</span>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
            <span className="text-[8px] uppercase tracking-widest font-black text-[var(--clr-text-secondary)] opacity-40 px-2 block mb-1">System Configuration</span>
            
            <button
              onClick={() => setView('theme')}
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase text-[var(--clr-text-secondary)] hover:text-white hover:bg-white/5 transition-all group active:scale-98"
            >
              <span>App theme</span>
              <span className="text-[9px] font-black text-[var(--clr-accent)] uppercase">
                {theme}
              </span>
            </button>

            <button
              onClick={() => setView('shortcut')}
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase text-[var(--clr-text-secondary)] hover:text-white hover:bg-white/5 transition-all group active:scale-98"
            >
              <span>Configurations</span>
              <kbd className="px-1.5 py-0.5 text-[8px] font-black bg-white/5 rounded border border-white/10 text-white uppercase">{hotkey}</kbd>
            </button>

            <button
              onClick={() => setView('browser')}
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase text-[var(--clr-text-secondary)] hover:text-white hover:bg-white/5 transition-all group active:scale-98"
            >
              <span>Browser & Search</span>
              <span className="text-[9px] font-black text-[var(--clr-accent)] uppercase truncate max-w-[100px]">
                {currentBrowserLabel}
              </span>
            </button>

            <div className="h-[1px] bg-white/5 my-2" />
            
            <button
              onClick={() => setView('support')}
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-[10px] font-black uppercase text-[var(--clr-text-secondary)] hover:text-white hover:bg-white/5 transition-all group active:scale-98"
            >
              <span>Feedback & Support</span>
              <span className="text-[9px] font-black text-[var(--clr-text-secondary)] opacity-50 uppercase tracking-widest group-hover:text-white transition-all">
                More
              </span>
            </button>
          </div>

          {/* Version Footer */}
          <div className="p-3 text-center border-t border-white/5 bg-black/10 shrink-0">
            <span className="text-[9px] text-[var(--clr-text-secondary)] opacity-55 font-bold uppercase tracking-wider">Version 1.0.2</span>
          </div>
        </>
      )}
    </div>
  );
}
