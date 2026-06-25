/**
 * OverlayHeader Component
 * 
 * The primary search bar interface. Contains the application logo,
 * the mode-aware search input, and quick action buttons for Web/AI search.
 * 
 * Depends on: core/store, shared/components/QueryInput, @tauri-apps/api
 * Used by: features/overlay/Overlay
 */
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../../core/store/useAppStore';
import { useSettingsStore } from '../../../core/store/useSettingsStore';
import { QueryInput } from '../../../shared/components/QueryInput';
import { open } from '@tauri-apps/plugin-shell';
import appLogo from '../../../assets/app-logo.png';
import { searchInBrowser, captureScreen } from '../../../core/lib/tauriCommands';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { BrandMenuPopover } from './BrandMenuPopover';

const SEARCH_BAR_HEIGHT = 52;

const SEARCH_URLS: Record<string, string> = {
  google:     'https://www.google.com/search?q=',
  bing:       'https://www.bing.com/search?q=',
  perplexity: 'https://www.perplexity.ai/?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
};

const AI_URLS: Record<string, string> = {
  chatgpt:    'https://chatgpt.com/',
  claude:     'https://claude.ai/',
  gemini:     'https://gemini.google.com/',
  grok:       'https://x.ai/grok',
  perplexity: 'https://www.perplexity.ai/',
};

interface OverlayHeaderProps {
  hasContent: boolean;
  isLoading: boolean;
  platform: string;
  handleDrag: () => void;
}

function isURL(str: string): boolean {
  const trimmed = str.trim();
  if (trimmed.includes(' ')) return false;
  return /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\/?/.test(trimmed);
}

/**
 * Header component for the search overlay.
 * Handles the logo, search input, and quick action buttons.
 */
export function OverlayHeader({ hasContent, isLoading, platform, handleDrag }: OverlayHeaderProps) {
  const { query, setQuery, isBrandMenuOpen, setBrandMenuOpen, imageBase64, setImageBase64, isActionMenuOpen, setActionMenuOpen } = useAppStore();
  const { browser, llmSite, searchEngine, customSearchUrl } = useSettingsStore();
  const { isListening, toggleListening } = useVoiceRecognition();

  const handleBrowserSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    
    // Direct URL navigation check
    if (isURL(trimmed)) {
      let finalUrl = trimmed;
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      try {
        if (browser === 'default' || !browser) { await open(finalUrl); }
        else { await searchInBrowser(browser, finalUrl); }
        setQuery('');
        return;
      } catch (e) { alert(String(e)); }
    }
    
    let searchUrl = '';
    const encodedQuery = encodeURIComponent(query);
    if (searchEngine === 'custom') {
      if (customSearchUrl.trim()) {
        if (customSearchUrl.includes('{query}')) {
          searchUrl = customSearchUrl.replace('{query}', encodedQuery);
        } else {
          searchUrl = customSearchUrl + (customSearchUrl.includes('?') ? '&' : '?') + 'q=' + encodedQuery;
        }
      } else {
        searchUrl = SEARCH_URLS.google + encodedQuery;
      }
    } else {
      searchUrl = (SEARCH_URLS[searchEngine] ?? SEARCH_URLS.google) + encodedQuery;
    }

    try {
      if (browser === 'default' || !browser) { await open(searchUrl); }
      else { await searchInBrowser(browser, searchUrl); }
      setQuery('');
    } catch (e) { alert(String(e)); }
  };

  const handleAIOpen = async () => {
    if (!query.trim()) return;
    const site = llmSite === 'default' ? 'claude' : llmSite;
    const url = AI_URLS[site] ?? AI_URLS.claude;
    
    try {
      if (browser === 'default' || !browser) { await open(url); }
      else { await searchInBrowser(browser, url); }
      setQuery('');
    } catch (e) { alert(String(e)); }
  };

  return (
    <div
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button, input, textarea')) return;
        handleDrag();
      }}
      className={`flex items-center gap-3 px-4 shrink-0 cursor-move select-none transition-all duration-300 ${
        hasContent ? 'mt-2 rounded-2xl border border-white/5' : ''
      }`}
      style={{ height: `${SEARCH_BAR_HEIGHT}px`, marginBottom: hasContent ? '6px' : '0' }}
    >
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setBrandMenuOpen(!isBrandMenuOpen);
          }}
          className="w-8 h-8 rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center overflow-hidden shrink-0 outline-none select-none"
          style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
          title="Quickno Menu"
        >
          <img src={appLogo} alt="Logo" className="w-full h-full object-cover" style={{ maxWidth: '100%', maxHeight: '100%' }} />
        </button>
        <div className="h-4 w-[1px] bg-white/10" />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {imageBase64 && (
            <div 
              className="w-6 h-6 rounded-md overflow-hidden shrink-0 border border-purple-500/30 relative group cursor-pointer"
              title="Screen captured. Click to clear."
              onClick={() => setImageBase64(null)}
            >
              <img src={`data:image/png;base64,${imageBase64}`} alt="Screenshot" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 items-center justify-center hidden group-hover:flex">
                <span className="text-[10px] text-white">✕</span>
              </div>
            </div>
          )}
          <QueryInput />
        </div>
      </div>

      {isLoading && (
        <div className="flex gap-1 shrink-0 px-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 shrink-0 relative">
        <button
          onClick={() => setActionMenuOpen(!isActionMenuOpen)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 hover:bg-white/10 ${isActionMenuOpen ? 'bg-white/10' : ''}`}
          style={{ color: 'var(--clr-text-secondary)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          title="More Actions"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>

        {isActionMenuOpen && (
          <div 
            className="absolute top-10 right-0 p-2 rounded-2xl flex flex-col gap-2 animate-fade-in-up z-50 border shadow-2xl"
            style={{ background: 'var(--clr-surface)', borderColor: 'var(--clr-border)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
          >
            {/* Capture Button */}
            <button
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                imageBase64 ? 'bg-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'hover:bg-purple-500/10'
              }`}
              style={{ color: 'var(--clr-accent-secondary, #a855f7)', border: '1px solid rgba(168, 85, 247, 0.2)' }}
              onClick={async () => {
                if (imageBase64) {
                  setImageBase64(null); // click again to clear
                } else {
                  try {
                    const { enablePartialScreenCapture } = useSettingsStore.getState();
                    
                    if (enablePartialScreenCapture) {
                      const { Command } = await import('@tauri-apps/plugin-shell');
                      const { writeText, readImage } = await import('@tauri-apps/plugin-clipboard-manager');
                      
                      // Clear clipboard to detect when snip is done
                      await writeText("");
                      
                      // Launch native Windows Snipping Tool in drag mode
                      await Command.create("cmd", ["/C", "start ms-screenclip:"]).spawn();
                      
                      // Poll clipboard for up to 15 seconds (30 * 500ms)
                      let attempts = 0;
                      let capturedBase64 = null;
                      while (attempts < 30) {
                        await new Promise(r => setTimeout(r, 500));
                        try {
                          const img = await readImage();
                          if (img) {
                            const size = await img.size();
                            const rgba = await img.rgba();
                            if (size.width > 0 && rgba) {
                              // Convert Tauri Image (RGBA) to PNG base64 using Canvas
                              const canvas = document.createElement('canvas');
                              canvas.width = size.width;
                              canvas.height = size.height;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                const imageData = new ImageData(new Uint8ClampedArray(rgba), size.width, size.height);
                                ctx.putImageData(imageData, 0, 0);
                                capturedBase64 = canvas.toDataURL('image/png').split(',')[1];
                                break;
                              }
                            }
                          }
                        } catch(e) {
                          // Not an image yet or clipboard empty
                        }
                        attempts++;
                      }
                      
                      if (capturedBase64) {
                        setImageBase64(capturedBase64);
                        setActionMenuOpen(false);
                      }
                    } else {
                      // Standard Full Screen Capture
                      const base64 = await captureScreen();
                      setImageBase64(base64);
                      setActionMenuOpen(false);
                    }
                  } catch (e) {
                    console.error('Failed to capture screen:', e);
                    alert(`Screen capture failed: ${e}\nThis is a known issue on some Windows graphics drivers.`);
                    const { getCurrentWindow } = await import('@tauri-apps/api/window');
                    await getCurrentWindow().show();
                  }
                }
              }}
              title={imageBase64 ? "Screen captured! Click to clear" : "Capture screen (Lens)"}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Voice Control Button */}
            <button
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                isListening ? 'bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse' : 'hover:bg-red-500/10'
              }`}
              style={{ color: 'var(--clr-danger, #ef4444)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              onClick={() => { toggleListening(); setActionMenuOpen(false); }}
              title="Voice Control (Alt+V to hold)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* Web Search Button */}
            <button
              id="web-btn"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-green-500/20 active:scale-95"
              style={{ color: 'var(--clr-success)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
              onClick={() => { handleBrowserSearch(); setActionMenuOpen(false); }}
              title="Search on Web (Alt+Enter)"
            >
              <span className="text-[11px] font-black uppercase">Web</span>
            </button>

            {/* AI Site Button */}
            <button
              id="ai-btn"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-blue-500/20 active:scale-95"
              style={{ color: 'var(--clr-accent)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
              onClick={() => { handleAIOpen(); setActionMenuOpen(false); }}
              title="Open in AI Site (Ctrl+Enter)"
            >
              <span className="text-[11px] font-black uppercase">AI</span>
            </button>

            {/* Mac Settings Button */}
            {platform === 'macos' && (
              <button
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-95"
                style={{ color: 'var(--clr-text-secondary)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                onClick={() => { invoke('show_settings'); setActionMenuOpen(false); }}
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {isBrandMenuOpen && (
        <BrandMenuPopover onClose={() => setBrandMenuOpen(false)} />
      )}
    </div>
  );
}
