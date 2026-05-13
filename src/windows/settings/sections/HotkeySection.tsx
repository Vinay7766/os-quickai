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

interface Props {
  hotkey: string;
  hotkeyStatus: string;
  updateHotkey: (hk: string) => void;
  handleHotkeySave: () => void;
  setHotkeyStatus: (status: any) => void;
}

export default function HotkeySection({
  hotkey, hotkeyStatus, updateHotkey, handleHotkeySave, setHotkeyStatus
}: Props) {
  const shortcuts = [
    { label: 'Submit query to internal AI', key: 'Enter' },
    { label: 'Open query in external AI site', key: 'Ctrl + Enter' },
    { label: 'Open query in web browser', key: 'Alt + Enter' },
    { label: 'Switch to Search Mode', key: 'Ctrl + 1' },
    { label: 'Switch to Site Mode', key: 'Ctrl + 2' },
    { label: 'Switch to App Mode', key: 'Ctrl + 3' },
    { label: 'Focus text input', key: '/' },
    { label: 'Close overlay', key: 'Escape' },
  ];

  return (
    <div className="space-y-10 animate-fade-in-up">
      <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>

      <div className="p-8 rounded-3xl border space-y-6" style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)' }}>
        <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Global Toggle Key</h3>
        <div className="flex items-center gap-6">
          <div 
            className="flex-1 px-6 py-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer group"
            style={{ 
              background: 'rgba(0,0,0,0.2)', 
              borderColor: hotkeyStatus === 'err' ? 'var(--clr-danger)' : 'var(--clr-border)' 
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              e.preventDefault();
              setHotkeyStatus('saving');
              const mods = [];
              if (e.ctrlKey) mods.push('ctrl');
              if (e.altKey) mods.push('alt');
              if (e.shiftKey) mods.push('shift');
              let k = e.key.toLowerCase();
              if (k === 'control' || k === 'alt' || k === 'shift') return;
              if (mods.length === 0) { setHotkeyStatus('err'); return; }
              updateHotkey([...mods, k].join('+'));
              setHotkeyStatus('idle');
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Click to Change:</span>
            <span className="text-sm font-bold text-[var(--clr-accent)] uppercase tracking-[0.2em]">{hotkey.replace(/\+/g, ' + ')}</span>
          </div>
          <button 
            onClick={handleHotkeySave} 
            className="px-8 py-4 rounded-2xl text-xs font-bold text-white shadow-xl shadow-[var(--clr-accent)]/20 transition-all hover:scale-[1.02] active:scale-95" 
            style={{ background: 'var(--clr-accent)' }}
          >
            {hotkeyStatus === 'ok' ? 'Registered' : 'Register Hotkey'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Guide for Overlay Shortcuts</h3>
        <div className="grid gap-2">
          {shortcuts.map(s => (
            <div key={s.label} className="flex items-center justify-between px-6 py-4 rounded-2xl border transition-all hover:bg-white/5" style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)' }}>
              <span className="text-sm font-medium opacity-80">{s.label}</span>
              <code className="text-[11px] font-bold px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--clr-accent)' }}>{s.key}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
