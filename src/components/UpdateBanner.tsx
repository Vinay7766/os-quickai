import { ExternalLink } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';

interface UpdateBannerProps {
  version: string;
}

export function UpdateBanner({ version }: UpdateBannerProps) {
  const handleDownload = async () => {
    await open('https://github.com/kalan/os-quickai/releases/latest');
  };

  return (
    <div className="w-full mb-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <div 
        onClick={handleDownload}
        className="group relative flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, var(--clr-indigo), #9333ea)',
          border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
        }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs animate-bounce mt-1">✨</div>
          <div>
            <p className="text-white text-[13px] font-bold leading-tight">Version {version} Available!</p>
            <p className="text-white/70 text-[11px]">Click to update manually from GitHub.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 text-white/90 font-semibold text-xs bg-black/10 px-3 py-1.5 rounded-lg border border-white/10 group-hover:bg-black/20 transition-colors">
          Download
          <ExternalLink size={12} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
