/**
 * OverlayContent Component
 * 
 * Manages the primary display area of the overlay. Orchestrates
 * the AI ResultPanel and the internal browser iframe failover.
 * 
 * Depends on: core/store, shared/components/ResultPanel, @tauri-apps/plugin-shell
 * Used by: features/overlay/Overlay
 */
import { useState } from 'react';
import { useAppStore } from '../../../core/store/useAppStore';
import { ResultPanel } from '../../../shared/components/ResultPanel';
import { open } from '@tauri-apps/plugin-shell';

interface OverlayContentProps {
  handleDrag: () => void;
  resultRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Content area for the search overlay.
 * Handles AI responses and internal browser iframe.
 */
export function OverlayContent({ handleDrag, resultRef }: OverlayContentProps) {
  const { answer, clearAnswer, internalUrl, setInternalUrl } = useAppStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!answer) return;
    try {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      await writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-fade-in-up overflow-hidden">
      {internalUrl ? (
        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between px-6 py-2 border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="text-[10px] font-bold opacity-40 truncate uppercase tracking-widest">{internalUrl}</span>
            </div>
            <div className="flex-1 flex items-center justify-center gap-2">
              <button onClick={() => open('https://ko-fi.com/vinay7766')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[9px] font-bold text-[var(--clr-text-secondary)] hover:text-white">Support Me</button>
              <button onClick={() => open('https://ko-fi.com/pollinations')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[9px] font-bold text-[var(--clr-text-secondary)] hover:text-white">Pollinations</button>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={async () => { 
                  if (internalUrl) { 
                    const { open } = await import('@tauri-apps/plugin-shell'); 
                    await open(internalUrl); 
                  } 
                }} 
                className="px-2 py-1 rounded-md hover:bg-white/10 text-[10px] font-bold text-[var(--clr-accent)] uppercase tracking-widest transition-colors"
              >
                Open Externally
              </button>
              <button onClick={() => setInternalUrl(null)} className="px-2 py-1 rounded-md hover:bg-white/10 text-[10px] font-bold text-[var(--clr-danger)] uppercase tracking-widest transition-colors">Close</button>
            </div>
          </div>
          <iframe 
            src={internalUrl} 
            className="flex-1 w-full border-none bg-white" 
            title="Internal Browser" 
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" 
            referrerPolicy="no-referrer" 
          />
        </div>
      ) : (
        <>
          <div ref={resultRef} className="flex-1 min-h-[100px] overflow-auto scrollbar-thin scrollbar-thumb-[var(--clr-accent-soft)]">
            <div className="px-6 py-4"><ResultPanel /></div>
          </div>
          <div 
            onMouseDown={(e) => { 
              if ((e.target as HTMLElement).closest('button')) return; 
              handleDrag(); 
            }} 
            className="flex items-center gap-3 px-6 shrink-0 cursor-move select-none" 
            style={{ height: '48px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid var(--clr-border)' }}
          >
            {answer && (
              <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/5 active:scale-95" style={{ color: copied ? 'var(--clr-success)' : 'var(--clr-text-secondary)' }}>
                {copied ? 'Copied!' : 'Copy Answer'}
              </button>
            )}
            <div className="flex-1" />
            <button onClick={clearAnswer} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all">Clear State</button>
          </div>
        </>
      )}
    </div>
  );
}
