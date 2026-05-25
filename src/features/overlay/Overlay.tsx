/*
 * Copyright 2026 Vinay7766
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useState, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { type } from '@tauri-apps/plugin-os';
import { useAppStore } from '../../core/store/useAppStore';
import { useSettingsStore } from '../../core/store/useSettingsStore';
import { useWindowResize } from './hooks/useWindowResize';
import { useOverlayShortcuts } from './hooks/useOverlayShortcuts';
import { useClipboardListener } from './hooks/useClipboardListener';
import { useFileProgressListener } from './hooks/useFileProgressListener';
import { OverlayHeader } from './components/OverlayHeader';
import { OverlayContent } from './components/OverlayContent';

const SEARCH_BAR_HEIGHT = 52;

/**
 * Overlay.tsx — Primary search overlay window
 * 
 * Orchestrates the search interface, window management, and mode transitions.
 * Modularized into hooks and sub-components for maintainability.
 */
export default function Overlay() {
  const { 
    answer, isLoading, error, 
    isModeMenuOpen, isModelMenuOpen, isBrandMenuOpen, internalUrl, searchMode
  } = useAppStore();
  
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const refreshModels = useSettingsStore((s) => s.refreshModels);
  
  const [platform, setPlatform] = useState<string>('');
  const isMenuOpen = isModeMenuOpen || isModelMenuOpen || isBrandMenuOpen;
  const hasContent = (isLoading || !!answer) || !!error || !!internalUrl;
  
  const resultRef = useRef<HTMLDivElement>(null);

  // ── Custom Hooks ───────────────────────────────────────────────────────────
  useOverlayShortcuts();
  useClipboardListener();
  useFileProgressListener();
  useWindowResize({
    hasContent, isMenuOpen, internalUrl, answer, error, 
    isLoading, resultRef, loadSettings, refreshModels, searchMode
  });

  const loadInstalledApps = useAppStore((s) => s.loadInstalledApps);

  useEffect(() => {
    document.body.classList.add('overlay-window');
    setPlatform(type());
    loadInstalledApps();
    return () => document.body.classList.remove('overlay-window');
  }, []);

  const handleDrag = () => {
    getCurrentWindow().startDragging();
  };

  return (
    <div 
      className="w-full h-screen overflow-hidden flex flex-col box-border relative"
      style={{
        borderRadius: '28px',
        border: `2px solid ${isLoading ? 'var(--clr-accent)' : 'rgba(var(--clr-accent-rgb), 0.5)'}`,
        background: 'var(--clr-glass)',
        transition: 'border-color 0.3s ease', 
        margin: '1px', 
      }}
    >
      <div
        className="flex-1 flex flex-col relative w-full"
        style={{
          minHeight: SEARCH_BAR_HEIGHT,
          background: 'transparent',
          overflow: isMenuOpen ? 'visible' : 'hidden',
        }}
      >
        <div className="flex flex-col w-full min-h-full">
          <OverlayHeader 
            hasContent={hasContent} 
            isLoading={isLoading} 
            platform={platform} 
            handleDrag={handleDrag} 
          />

          {hasContent && (
            <OverlayContent 
              handleDrag={handleDrag} 
              resultRef={resultRef} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
