/**
 * TermsPanel
 * 
 * Typographic screen rendering terms of service, local privacy clauses, and open source notices.
 * 
 * Depends on: None
 * Used by: BrandMenuPopover
 */

interface TermsPanelProps {
  onBack: () => void;
}

/**
 * Renders the typographic terms & conditions viewer.
 * 
 * @param {TermsPanelProps} props - The component properties.
 * @returns {JSX.Element} The rendered terms viewer.
 */
export function TermsPanel({ onBack }: TermsPanelProps) {
  return (
    <div className="flex flex-col p-4 w-full overflow-hidden h-full">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={onBack}
          className="text-[9px] font-black uppercase px-2 py-1 rounded bg-white/5 border border-white/10 text-[var(--clr-text-secondary)] hover:text-white transition-colors"
        >
          Back
        </button>
        <span className="text-[10px] font-black uppercase tracking-wider text-white">Terms & Conditions</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin text-[9px] uppercase font-bold text-[var(--clr-text-secondary)] leading-relaxed space-y-2 pr-1 select-text h-[280px]">
        <h4 className="font-black text-white text-[9px] tracking-wider block">1. Terms of Use</h4>
        <p className="normal-case font-normal opacity-85">Welcome to Quickno! By installing and using this application, you agree to comply with our Terms of Service.</p>
        <h4 className="font-black text-white text-[9px] tracking-wider block">2. Privacy Policy</h4>
        <p className="normal-case font-normal opacity-85">Your privacy is our utmost priority. Quickno functions entirely locally. We do not transmit, analyze, or collect any private desktop, clipboard, or screen data on external servers.</p>
        <h4 className="font-black text-white text-[9px] tracking-wider block">3. Open-Source Attributions</h4>
        <p className="normal-case font-normal opacity-85">Quickno incorporates third-party open-source libraries that are listed in the THIRD_PARTY_NOTICES markdown document.</p>
        <h4 className="font-black text-white text-[9px] tracking-wider block">4. AI Providers</h4>
        <p className="normal-case font-normal opacity-85">All AI requests are direct interactions with the chosen provider (OpenAI, Anthropic, Gemini, Grok) and are bound by their respective privacy terms.</p>
      </div>
    </div>
  );
}
