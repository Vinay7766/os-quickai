/**
 * ThemePanel
 * 
 * Typographic selector panel for choosing light, dark, or device-level themes.
 * 
 * Depends on: None
 * Used by: BrandMenuPopover
 */

interface ThemePanelProps {
  theme: string;
  updateSetting: (key: string, val: any) => void;
  onBack: () => void;
}

/**
 * Renders the app theme selector interface.
 * 
 * @param {ThemePanelProps} props - The component properties.
 * @returns {JSX.Element} The rendered theme selector.
 */
export function ThemePanel({ theme, updateSetting, onBack }: ThemePanelProps) {
  return (
    <div className="flex flex-col p-4 w-full">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={onBack}
          className="text-[9px] font-black uppercase px-2 py-1 rounded bg-white/5 border border-white/10 text-[var(--clr-text-secondary)] hover:text-white transition-colors"
        >
          Back
        </button>
        <span className="text-[10px] font-black uppercase tracking-wider text-white">App theme</span>
      </div>

      <div className="flex flex-col gap-1">
        {[
          { id: 'dark', label: 'Dark theme' },
          { id: 'light', label: 'Light theme' },
          { id: 'system', label: 'Device theme' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => updateSetting('theme', item.id)}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-xl border border-transparent transition-all hover:bg-white/5 active:scale-98 ${
              theme === item.id 
                ? 'bg-white/5 border-white/5 text-white font-bold' 
                : 'text-[var(--clr-text-secondary)]'
            }`}
          >
            <span className="text-[10px] uppercase font-bold">{item.label}</span>
            {theme === item.id && (
              <span className="text-[9px] font-black uppercase text-[var(--clr-accent)]">[Active]</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
