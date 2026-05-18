/**
 * SupportPanel
 * 
 * Typographic selector panel for support links and terms.
 * 
 * Depends on: None
 * Used by: BrandMenuPopover
 */
import { open } from '@tauri-apps/plugin-shell';

interface SupportPanelProps {
  onBack: () => void;
  onViewTerms: () => void;
}

/**
 * Renders the Feedback & Support links menu.
 * 
 * @param {SupportPanelProps} props - The component properties.
 * @returns {JSX.Element} The rendered support panel.
 */
export function SupportPanel({ onBack, onViewTerms }: SupportPanelProps) {
  const handleOpenLink = async (url: string) => {
    try {
      await open(url);
    } catch {
      // Ignore
    }
  };

  const supportLinks = [
    { label: 'Send Feedback', url: 'https://github.com/Vinay7766/quickno/issues/new' },
    { label: 'Join Discord Community', url: 'https://discord.gg/your-invite-link' },
    { label: 'Bug Reporting', url: 'https://github.com/Vinay7766/quickno/issues' }
  ];

  return (
    <div className="flex flex-col p-4 w-full">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={onBack}
          className="text-[9px] font-black uppercase px-2 py-1 rounded bg-white/5 border border-white/10 text-[var(--clr-text-secondary)] hover:text-white transition-colors"
        >
          Back
        </button>
        <span className="text-[10px] font-black uppercase tracking-wider text-white">Feedback & Support</span>
      </div>

      <div className="flex flex-col gap-1">
        {supportLinks.map((item) => (
          <button
            key={item.label}
            onClick={() => handleOpenLink(item.url)}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl border border-transparent transition-all hover:bg-white/5 active:scale-98 text-left text-[10px] uppercase font-bold text-[var(--clr-text-secondary)] hover:text-white"
          >
            <span>{item.label}</span>
          </button>
        ))}

        <div className="h-[1px] bg-white/5 my-1" />

        <button
          onClick={onViewTerms}
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl border border-transparent transition-all hover:bg-white/5 active:scale-98 text-left text-[10px] uppercase font-bold text-[var(--clr-text-secondary)] hover:text-white"
        >
          <span>Terms & Conditions</span>
        </button>
      </div>
    </div>
  );
}
