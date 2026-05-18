/**
 * AIPanel
 * 
 * Typographic selector panel for choosing preferred AI models and free-tiers.
 * 
 * Depends on: None
 * Used by: BrandMenuPopover
 */

interface AIPanelProps {
  llmModel: string;
  availableModels: string[];
  updateSetting: (key: string, val: any) => void;
  onBack: () => void;
}

/**
 * Renders the AI model selector options list.
 * 
 * @param {AIPanelProps} props - The component properties.
 * @returns {JSX.Element} The rendered AI panel.
 */
export function AIPanel({ llmModel, availableModels, updateSetting, onBack }: AIPanelProps) {
  return (
    <div className="flex flex-col p-4 w-full">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={onBack}
          className="text-[9px] font-black uppercase px-2 py-1 rounded bg-white/5 border border-white/10 text-[var(--clr-text-secondary)] hover:text-white transition-colors"
        >
          Back
        </button>
        <span className="text-[10px] font-black uppercase tracking-wider text-white">Preferred AI</span>
      </div>

      <span className="text-[8px] uppercase tracking-wider font-black text-[var(--clr-text-secondary)] opacity-50 block mb-2 shrink-0">Model Selector</span>
      <div className="flex flex-col gap-1 max-h-[240px] overflow-y-auto scrollbar-thin">
        <button
          onClick={() => updateSetting('llmModel', 'free-model')}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-xl border border-transparent transition-all hover:bg-white/5 active:scale-98 shrink-0 ${
            llmModel === 'free-model' 
              ? 'bg-white/5 border-white/5 text-white font-bold' 
              : 'text-[var(--clr-text-secondary)]'
          }`}
        >
          <span className="text-[9px] uppercase font-bold">Free Model</span>
          {llmModel === 'free-model' && (
            <span className="text-[9px] font-black uppercase text-[var(--clr-accent)]">[Active]</span>
          )}
        </button>
        {availableModels.map((model) => (
          <button
            key={model}
            onClick={() => updateSetting('llmModel', model)}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-xl border border-transparent transition-all hover:bg-white/5 active:scale-98 shrink-0 ${
              llmModel === model 
                ? 'bg-white/5 border-white/5 text-white font-bold' 
                : 'text-[var(--clr-text-secondary)]'
            }`}
          >
            <span className="text-[9px] uppercase font-bold truncate pr-2">{model}</span>
            {llmModel === model && (
              <span className="text-[9px] font-black uppercase text-[var(--clr-accent)]">[Active]</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
