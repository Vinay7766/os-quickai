// ─────────────────────────────────────────────────────────────────────────────
// UpdateBanner.tsx — New version notification
// ─────────────────────────────────────────────────────────────────────────────
// Shows a subtle banner at the top of the overlay when a newer version
// of Quickno is available on GitHub. Clicking it opens the releases page.
// ─────────────────────────────────────────────────────────────────────────────

import { open } from '@tauri-apps/plugin-shell';

interface UpdateBannerProps {
  version: string;
}

export function UpdateBanner({ version }: UpdateBannerProps) {
  const handleDownload = async () => {
    await open('https://github.com/Vinay7766/quickno/releases/latest');
  };

  return (
    <div className="w-full animate-fade-in-up">
      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-all hover:brightness-110"
        style={{
          background: 'var(--clr-accent)',
          color: '#ffffff',
          borderRadius: '0',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/20 uppercase tracking-tighter">New</div>
          <div>
            <p className="text-[12px] font-semibold leading-tight">
              Version {version} available
            </p>
            <p className="text-[10px] opacity-70">Click to download from GitHub</p>
          </div>
        </div>

        <div className="text-[11px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-md">
          Update Available
        </div>
      </button>
    </div>
  );
}
