import { UI_COLORS } from '../../../constants/appConstants';

interface InterfaceSectionProps {
  browser: string;
  theme: string;
  llmSite: string;
  enableSiteLauncher: boolean;
  enableAppLauncher: boolean;
  openLinksInternal: boolean;
  onSettingChange: (key: string, value: any) => void;
}

const BROWSERS = [
  { value: 'default', label: 'System Default' },
  { value: 'chrome', label: 'Google Chrome' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'brave', label: 'Brave' },
  { value: 'bing', label: 'Microsoft Edge' },
  { value: 'opera', label: 'Opera' },
];

const AI_SITES = [
  { value: 'claude', label: 'Claude (Default)' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'grok', label: 'Grok (xAI)' },
  { value: 'perplexity', label: 'Perplexity' },
];

export function InterfaceSection({ 
  browser, theme, llmSite, enableSiteLauncher, enableAppLauncher, openLinksInternal, onSettingChange 
}: InterfaceSectionProps) {
  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold mb-1">Interface & Navigation</h2>
        <p className="text-sm" style={{ color: UI_COLORS.TEXT_SECONDARY }}>Customize the look and web interaction behavior.</p>
      </div>

      {/* Theme Mode */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50">Theme Mode</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => onSettingChange('theme', t.value)}
              className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all border flex flex-col items-center gap-1.5 ${theme === t.value ? 'border-[var(--clr-accent)]' : ''}`}
              style={{
                background: theme === t.value ? 'var(--clr-accent-soft)' : UI_COLORS.INPUT_BG,
                borderColor: theme === t.value ? 'var(--clr-accent)' : UI_COLORS.BORDER,
                color: theme === t.value ? 'var(--clr-accent)' : UI_COLORS.TEXT_SECONDARY,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Browser Selection */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50">Preferred Browser</h3>
        <select
          value={browser}
          onChange={e => onSettingChange('browser', e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold border focus:outline-none cursor-pointer"
          style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER, color: 'var(--clr-text)' }}
        >
          {BROWSERS.map(b => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <p className="text-[10px] opacity-40">"System Default" will automatically use your OS-level browser preference.</p>
      </div>

      {/* AI Site Selection */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50">Preferred AI Site</h3>
        <select
          value={llmSite}
          onChange={e => onSettingChange('llmSite', e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold border focus:outline-none cursor-pointer"
          style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER, color: 'var(--clr-text)' }}
        >
          {AI_SITES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <p className="text-[10px] opacity-40">This site will open when you click the "AI Search" button in the overlay.</p>
      </div>

      {/* Launcher Toggles */}
      <div className="space-y-4 pt-6 border-t" style={{ borderColor: UI_COLORS.BORDER }}>
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50">Feature Toggles</h3>

        <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}>
          <div>
            <div className="text-sm font-bold">Site Launcher</div>
            <p className="text-[10px] opacity-60">Open URLs directly from the search bar.</p>
          </div>
          <button
            onClick={() => onSettingChange('enableSiteLauncher', !enableSiteLauncher)}
            className={`w-10 h-5 rounded-full transition-all relative ${enableSiteLauncher ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${enableSiteLauncher ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}>
          <div>
            <div className="text-sm font-bold">App Launcher</div>
            <p className="text-[10px] opacity-60">Launch Windows apps by typing their name.</p>
          </div>
          <button
            onClick={() => onSettingChange('enableAppLauncher', !enableAppLauncher)}
            className={`w-10 h-5 rounded-full transition-all relative ${enableAppLauncher ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${enableAppLauncher ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}>
          <div>
            <div className="text-sm font-bold">Internal Browser</div>
            <p className="text-[10px] opacity-60">Open links within the assistant panel when possible.</p>
          </div>
          <button
            onClick={() => onSettingChange('openLinksInternal', !openLinksInternal)}
            className={`w-10 h-5 rounded-full transition-all relative ${openLinksInternal ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${openLinksInternal ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
