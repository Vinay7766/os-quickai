/**
 * BrowserPanel
 * 
 * Typographic selector panel for preferred system browsers and search engines.
 * 
 * Depends on: None
 * Used by: BrandMenuPopover
 */

interface BrowserPanelProps {
  browser: string;
  searchEngine: string;
  llmSite: string;
  updateSetting: (key: string, val: any) => void;
  onBack: () => void;
}

/**
 * Renders the browser and search engine configurations list.
 * 
 * @param {BrowserPanelProps} props - The component properties.
 * @returns {JSX.Element} The rendered browser panel.
 */
export function BrowserPanel({ browser, searchEngine, llmSite, updateSetting, onBack }: BrowserPanelProps) {
  return (
    <div className="flex flex-col p-4 w-full overflow-y-auto scrollbar-thin max-h-[360px]">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={onBack}
          className="text-[9px] font-black uppercase px-2 py-1 rounded bg-white/5 border border-white/10 text-[var(--clr-text-secondary)] hover:text-white transition-colors"
        >
          Back
        </button>
        <span className="text-[10px] font-black uppercase tracking-wider text-white">Browser & Search</span>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <span className="text-[8px] uppercase tracking-wider font-black text-[var(--clr-text-secondary)] opacity-55 block mb-1.5">Preferred Browser</span>
          <div className="relative">
            <select
              value={browser}
              onChange={(e) => updateSetting('browser', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase text-white bg-black/40 border border-white/10 outline-none focus:border-[var(--clr-accent)] appearance-none cursor-pointer pr-10"
              style={{ background: 'rgba(0, 0, 0, 0.4)' }}
            >
              <option value="default" className="bg-[#1c1c1c] text-white">System Default</option>
              <option value="chrome" className="bg-[#1c1c1c] text-white">Google Chrome</option>
              <option value="firefox" className="bg-[#1c1c1c] text-white">Firefox</option>
              <option value="brave" className="bg-[#1c1c1c] text-white">Brave</option>
              <option value="safari" className="bg-[#1c1c1c] text-white">Safari</option>
              <option value="edge" className="bg-[#1c1c1c] text-white">Microsoft Edge</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
        </div>

        <div>
          <span className="text-[8px] uppercase tracking-wider font-black text-[var(--clr-text-secondary)] opacity-55 block mb-1.5">Search Engine</span>
          <div className="relative">
            <select
              value={searchEngine}
              onChange={(e) => updateSetting('searchEngine', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase text-white bg-black/40 border border-white/10 outline-none focus:border-[var(--clr-accent)] appearance-none cursor-pointer pr-10"
              style={{ background: 'rgba(0, 0, 0, 0.4)' }}
            >
              <option value="google" className="bg-[#1c1c1c] text-white">Google</option>
              <option value="bing" className="bg-[#1c1c1c] text-white">Bing</option>
              <option value="perplexity" className="bg-[#1c1c1c] text-white">Perplexity</option>
              <option value="duckduckgo" className="bg-[#1c1c1c] text-white">DuckDuckGo</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
        </div>

        <div>
          <span className="text-[8px] uppercase tracking-wider font-black text-[var(--clr-text-secondary)] opacity-55 block mb-1.5">Preferred AI</span>
          <div className="relative">
            <select
              value={llmSite}
              onChange={(e) => updateSetting('llmSite', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase text-white bg-black/40 border border-white/10 outline-none focus:border-[var(--clr-accent)] appearance-none cursor-pointer pr-10"
              style={{ background: 'rgba(0, 0, 0, 0.4)' }}
            >
              <option value="default" className="bg-[#1c1c1c] text-white">System Default</option>
              <option value="chatgpt" className="bg-[#1c1c1c] text-white">ChatGPT</option>
              <option value="claude" className="bg-[#1c1c1c] text-white">Claude AI</option>
              <option value="gemini" className="bg-[#1c1c1c] text-white">Google Gemini</option>
              <option value="grok" className="bg-[#1c1c1c] text-white">xAI Grok</option>
              <option value="perplexity" className="bg-[#1c1c1c] text-white">Perplexity</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
