/**
 * ShortcutPanel
 * 
 * Typographic global keyboard shortcut recorder subcomponent.
 * 
 * Depends on: React, useEffect, useRef
 * Used by: BrandMenuPopover
 */
import { useState, useEffect, useRef } from 'react';

interface ShortcutPanelProps {
  hotkey: string;
  updateHotkey: (formatted: string) => Promise<void>;
  onBack: () => void;
}

/**
 * Renders the global hotkey recorder card.
 * 
 * @param {ShortcutPanelProps} props - The component properties.
 * @returns {JSX.Element} The rendered shortcut recorder.
 */
export function ShortcutPanel({ hotkey, updateHotkey, onBack }: ShortcutPanelProps) {
  const [recording, setRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const recordingRef = useRef<boolean>(false);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    if (!recording) return;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      const modifiers = [];
      if (e.ctrlKey) modifiers.push('ctrl');
      if (e.altKey) modifiers.push('alt');
      if (e.shiftKey) modifiers.push('shift');
      if (e.metaKey) modifiers.push('meta');

      const key = e.key.toLowerCase();
      
      if (['control', 'alt', 'shift', 'meta'].includes(key)) {
        setRecordedKeys(modifiers);
        return;
      }

      let keyName = key;
      if (key === ' ') keyName = 'space';
      
      const finalKeys = [...modifiers];
      if (!finalKeys.includes(keyName)) {
        finalKeys.push(keyName);
      }
      
      setRecordedKeys(finalKeys);
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recording]);

  const handleSaveHotkey = async () => {
    if (recordedKeys.length > 0) {
      const formatted = recordedKeys.join('+');
      await updateHotkey(formatted);
    }
    setRecording(false);
  };

  const handleRestoreDefaultHotkey = async () => {
    await updateHotkey('alt+a');
    setRecordedKeys(['alt', 'a']);
    setRecording(false);
  };

  return (
    <div className="flex flex-col p-4 w-full">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={() => { onBack(); setRecording(false); }}
          className="text-[9px] font-black uppercase px-2 py-1 rounded bg-white/5 border border-white/10 text-[var(--clr-text-secondary)] hover:text-white transition-colors"
        >
          Back
        </button>
        <span className="text-[10px] font-black uppercase tracking-wider text-white">Keyboard Shortcut</span>
      </div>

      <div className="flex flex-col gap-3 py-1">
        <div 
          onClick={() => { setRecording(true); setRecordedKeys([]); }}
          className={`flex flex-col items-center justify-center p-5 rounded-2xl border cursor-pointer transition-all ${
            recording 
              ? 'border-[var(--clr-accent)] bg-white/5 shadow-[0_0_15px_rgba(59,130,246,0.05)]' 
              : 'border-white/5 bg-white/5 hover:border-white/10'
          }`}
        >
          <span className="text-[9px] text-[var(--clr-text-secondary)] uppercase tracking-wider font-bold mb-2">
            {recording ? 'Recording...' : 'Click to change'}
          </span>
          <div className="flex items-center gap-1">
            {(recording ? recordedKeys : hotkey.split('+')).map((k, i) => (
              <kbd 
                key={i} 
                className="px-2 py-0.5 text-[9px] font-black uppercase bg-white/5 rounded border border-white/10 text-white"
              >
                {k}
              </kbd>
            ))}
          </div>
        </div>

        <div className="flex gap-2 w-full mt-1">
          <button
            onClick={handleRestoreDefaultHotkey}
            className="flex-1 px-3 py-2 text-[9px] font-black uppercase text-[var(--clr-text-secondary)] hover:text-white bg-white/5 border border-white/5 rounded-xl transition-all active:scale-95"
          >
            Restore Default
          </button>
          {recording && (
            <button
              onClick={handleSaveHotkey}
              className="flex-1 px-3 py-2 text-[9px] font-black uppercase text-white bg-[var(--clr-accent)] rounded-xl transition-all active:scale-95"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
