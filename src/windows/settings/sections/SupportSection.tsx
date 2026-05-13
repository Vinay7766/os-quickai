import { open } from '@tauri-apps/plugin-shell';
import { UI_COLORS, APP_METADATA } from '../../../constants/appConstants';

export function SupportSection() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold mb-1">Support & Community</h2>
        <p className="text-sm" style={{ color: UI_COLORS.TEXT_SECONDARY }}>Connect with the developers and other users.</p>
      </div>

      <div className="grid gap-3">
        <div
          className="p-5 rounded-2xl border flex items-center justify-between gap-4"
          style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}
        >
          <div>
            <h3 className="font-bold text-sm mb-0.5">Application Version</h3>
            <p className="text-[12px]" style={{ color: UI_COLORS.TEXT_SECONDARY }}>
              You are currently running Quickno v{APP_METADATA.VERSION}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Latest Version
          </div>
        </div>

        {[
          { title: 'Community Discord', desc: 'Join the conversation, ask questions, and share ideas.', url: 'https://discord.gg/29a3qkEsX' },
          { title: 'Bug Reporting', desc: 'Found an issue? Let us know so we can fix it.', url: 'https://discord.gg/CpMW6AMsKC' },
          { title: 'Feature Requests', desc: 'Suggest new features for future versions.', url: 'https://discord.gg/CpMW6AMsKC' }
        ].map(item => (
          <div
            key={item.title}
            className="p-5 rounded-2xl border flex items-center justify-between gap-4"
            style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}
          >
            <div>
              <h3 className="font-bold text-sm mb-0.5">{item.title}</h3>
              <p className="text-[12px]" style={{ color: UI_COLORS.TEXT_SECONDARY }}>{item.desc}</p>
            </div>
            <button
              onClick={() => open(item.url)}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white shrink-0 hover:brightness-110 active:scale-95 transition-all"
              style={{ background: 'var(--clr-accent)' }}
            >
              Open Link
            </button>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t" style={{ borderColor: UI_COLORS.BORDER }}>
        <h3 className="text-sm font-bold mb-4">Support the Project</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => open('https://ko-fi.com/vinay7766')}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden"
            style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-yellow-500/0 group-hover:from-yellow-500/5 group-hover:to-yellow-500/10 transition-all" />
            <div className="text-center relative z-10">
              <div className="text-sm font-bold text-yellow-500">Support Developer</div>
              <p className="text-[10px] opacity-60">Help keep Quickno fast & free</p>
            </div>
          </button>

          <button
            onClick={() => open('https://ko-fi.com/pollinations')}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden"
            style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/0 group-hover:from-green-500/5 group-hover:to-green-500/10 transition-all" />
            <div className="text-center relative z-10">
              <div className="text-xs font-bold text-green-500">Support Pollinations</div>
              <p className="text-[10px] opacity-60">Back the core AI engine</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
