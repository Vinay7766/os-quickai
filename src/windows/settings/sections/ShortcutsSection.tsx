import { UI_COLORS } from '../../../constants/appConstants';

interface ShortcutsSectionProps {
  hotkey: string;
  onHotkeyChange: (hk: string) => void;
  onSave: () => void;
  status: 'idle' | 'saving' | 'ok' | 'err';
}

/**
 * @component ShortcutsSection
 * @description Restored full hotkey configuration and shortcut documentation.
 */
export function ShortcutsSection({ hotkey, onHotkeyChange, onSave, status }: ShortcutsSectionProps) {
  const overlayShortcuts = [
    { keys: 'Enter', action: 'Submit query to internal AI' },
    { keys: 'Ctrl + Enter', action: 'Open query in external AI site' },
    { keys: 'Alt + Enter', action: 'Open query in web browser' },
    { keys: 'Ctrl + 1', action: 'Switch to Search Mode' },
    { keys: 'Ctrl + 2', action: 'Switch to Site Mode' },
    { keys: 'Ctrl + 3', action: 'Switch to App Mode' },
    { keys: '/', action: 'Focus text input' },
    { keys: 'Escape', action: 'Close overlay' },
  ];

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold mb-1">Shortcuts</h2>
        <p className="text-sm" style={{ color: UI_COLORS.TEXT_SECONDARY }}>Configure how you trigger and interact with Quickno.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50">Global Hotkey</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={hotkey}
            onChange={(e) => onHotkeyChange(e.target.value.toLowerCase())}
            placeholder="e.g. alt+a"
            className="flex-1 px-4 py-3 rounded-xl text-sm border bg-transparent focus:outline-none focus:border-[var(--clr-accent)]"
            style={{ borderColor: UI_COLORS.BORDER }}
          />
          <button
            onClick={onSave}
            className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
            style={{ background: status === 'ok' ? 'var(--clr-success)' : 'var(--clr-accent)' }}
          >
            {status === 'saving' ? 'Saving...' : status === 'ok' ? 'Saved' : 'Update'}
          </button>
        </div>
      </div>

      <div className="space-y-4 pt-6">
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50">Overlay Shortcuts</h3>
        <div className="grid gap-2">
          {overlayShortcuts.map(s => (
            <div key={s.keys} className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}>
              <span className="text-sm font-medium">{s.action}</span>
              <code className="text-[11px] font-bold px-2 py-1 rounded-md border" style={{ background: UI_COLORS.SURFACE, borderColor: UI_COLORS.BORDER, color: 'var(--clr-accent)' }}>{s.keys}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
