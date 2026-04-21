import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { saveApiKey, deleteApiKey, getApiKey, updateShortcut } from '../../lib/tauriCommands';


// Models config
const API_MODELS = [
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', placeholder: 'AIza...' },
  { value: 'grok-1.5', label: 'Grok 1.5 (xAI)', placeholder: 'xai-...' },
  { value: 'gpt-4o-mini', label: 'ChatGPT (GPT-4o Mini)', placeholder: 'sk-...' },
  { value: 'gpt-4o', label: 'ChatGPT (GPT-4o)', placeholder: 'sk-...' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus', placeholder: 'sk-ant-...' },
];
const FREE_MODELS = [
  { value: 'minimax-2.5', label: 'Minimax 2.5 (Free)' },
  { value: 'qwen-3.6', label: 'Qwen 3.6 (Free)' },
  { value: 'nemotron', label: 'Nvidia Nemotron (Free)' },
];
const ALL_MODELS = [...API_MODELS, ...FREE_MODELS];

const BROWSERS = [
  { value: 'chrome', label: '🌐 Google Chrome' },
  { value: 'firefox', label: '🦊 Firefox' },
  { value: 'brave', label: '🦁 Brave' },
  { value: 'bing', label: '💠 Bing (Edge)' },
  { value: 'opera', label: '🔴 Opera' },
  { value: 'comet', label: '☄️ Comet' },
];

const AI_SITES = [
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'grok', label: 'Grok (xAI)' },
  { value: 'perplexity', label: 'Perplexity' },
];

type Section = 'models' | 'search' | 'hotkey' | 'danger';

export default function Settings() {
  const { hotkey, llmModel, browser, llmSite, searchEngine, theme, settingsLoaded, loadSettings, updateHotkey, updateSetting, saveAll } = useSettingsStore();
  const [activeSection, setActiveSection] = useState<Section>('models');
  const [keyInput, setKeyInput] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [selectedApiModel, setSelectedApiModel] = useState(API_MODELS[0].value);
  const [saveIndicator, setSaveIndicator] = useState(false);

  useEffect(() => {
    loadSettings();
    document.body.classList.add('settings-window');
    getApiKey().then(key => { if (key) setKeyInput('••••••••••••'); });
    return () => document.body.classList.remove('settings-window');
  }, []);

  const handleManualSave = async () => {
    setSaveIndicator(true);
    await saveAll();
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  const handleSaveKey = async () => {
    if (!keyInput || keyInput === '••••••••••••') return;
    setKeyStatus('saving');
    try {
      await saveApiKey(keyInput);
      setKeyStatus('success');
      setTimeout(() => setKeyStatus('idle'), 2500);
    } catch {
      setKeyStatus('error');
    }
  };

  const handleDeleteKey = async () => {
    if (confirm('Delete the saved API key? This cannot be undone.')) {
      await deleteApiKey();
      setKeyInput('');
      setKeyStatus('idle');
    }
  };

  const [hotkeyStatus, setHotkeyStatus] = useState<'idle'|'saving'|'ok'|'err'>('idle');

  const handleHotkeySave = async () => {
    setHotkeyStatus('saving');
    try {
      await updateShortcut(hotkey);
      await updateHotkey(hotkey); // persist to store
      setHotkeyStatus('ok');
      setTimeout(() => setHotkeyStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setHotkeyStatus('err');
    }
  };

  if (!settingsLoaded) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--clr-surface)', color: 'var(--clr-muted)', fontSize: 13 }}>
        Loading settings...
      </div>
    );
  }

  const isFreeModel = FREE_MODELS.some(m => m.value === llmModel);
  const currentModelLabel = ALL_MODELS.find(m => m.value === llmModel)?.label ?? llmModel;
  const sideNav: { id: Section; icon: string; label: string }[] = [
    { id: 'models', icon: '🤖', label: 'AI Models' },
    { id: 'search', icon: '🌐', label: 'Interface & Browser' },
    { id: 'hotkey', icon: '⌨️', label: 'Shortcuts' },
    { id: 'danger', icon: '🗑️', label: 'Data' },
  ];

  const handleModelChange = async (val: string) => {
    await updateSetting('llmModel', val);
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--clr-surface)', color: 'var(--clr-text)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar nav */}
      <div className="w-52 shrink-0 flex flex-col py-6 px-3 gap-1" style={{ borderRight: '1px solid var(--clr-border)', background: 'var(--clr-input-bg)' }}>
        <div className="px-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>✦</div>
            <span className="font-semibold text-sm ">QuickAI</span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--clr-muted)' }}>Settings</p>
        </div>
        {sideNav.map(n => (
          <button
            key={n.id}
            onClick={() => setActiveSection(n.id)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left w-full"
            style={{
              background: activeSection === n.id ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: activeSection === n.id ? 'var(--clr-indigo)' : 'var(--clr-muted)',
              fontWeight: activeSection === n.id ? 600 : 400,
            }}
          >
            <span>{n.icon}</span>
            {n.label}
          </button>
        ))}

        <div className="flex-1" />
        
        <button
          onClick={handleManualSave}
          className="mx-2 mb-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          style={{ 
            background: saveIndicator ? 'var(--clr-green)' : 'var(--clr-indigo)', 
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {saveIndicator ? '✓ Saved Successfully' : '💾 Save All Changes'}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* ── AI Models Section ── */}
        {activeSection === 'models' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h2 className="text-lg font-bold ">AI Model</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--clr-muted)' }}>Select which model answers your queries in the search bar.</p>
            </div>

            {/* Model picker */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--clr-muted)' }}>Active Model</label>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--clr-border)' }}>
                {/* Free models */}
                <div className="px-3 py-1.5 text-xs font-semibold tracking-widest uppercase" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--clr-green)' }}>
                  ✦ Free — No API Key Required
                </div>
                {FREE_MODELS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => handleModelChange(m.value)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors text-left"
                    style={{
                      background: llmModel === m.value ? 'rgba(16,185,129,0.12)' : 'var(--clr-input-bg)',
                      color: llmModel === m.value ? 'var(--clr-green)' : 'var(--clr-text)',
                      borderBottom: '1px solid var(--clr-border)',
                    }}
                  >
                    <span>{m.label}</span>
                    {llmModel === m.value && <span style={{ color: 'var(--clr-green)' }}>✓</span>}
                  </button>
                ))}
                {/* API models */}
                <div className="px-3 py-1.5 text-xs font-semibold tracking-widest uppercase" style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--clr-indigo)' }}>
                  🔑 API Models — Key Required
                </div>
                {API_MODELS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => handleModelChange(m.value)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors text-left"
                    style={{
                      background: llmModel === m.value ? 'rgba(99,102,241,0.15)' : 'var(--clr-input-bg)',
                      color: llmModel === m.value ? 'var(--clr-indigo)' : 'var(--clr-text)',
                      borderBottom: '1px solid var(--clr-border)',
                    }}
                  >
                    <span>{m.label}</span>
                    {llmModel === m.value && <span style={{ color: 'var(--clr-indigo)' }}>✓</span>}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>
                Currently active: <span style={{ color: 'var(--clr-indigo)' }}>{currentModelLabel}</span>
                {isFreeModel ? ' — No API key needed!' : ''}
              </p>
            </div>

            {/* API Key input (only for API models) */}
            {!isFreeModel && (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--clr-muted)' }}>
                  API Key for: <span style={{ color: '#a5b4fc' }}>{currentModelLabel}</span>
                </label>
                {/* Quick-select which model's key to set */}
                <select
                  value={selectedApiModel}
                  onChange={e => setSelectedApiModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--clr-text)', outline: 'none' }}
                >
                  {API_MODELS.map(m => (
                    <option key={m.value} value={m.value} style={{ background: '#1e293b' }}>{m.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    placeholder={API_MODELS.find(m => m.value === selectedApiModel)?.placeholder ?? 'Enter API key...'}
                    className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--clr-text)' }}
                  />
                  <button
                    onClick={handleSaveKey}
                    disabled={keyStatus === 'saving' || !keyInput || keyInput === '••••••••••••'}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: 'white', minWidth: '80px' }}
                  >
                    {keyStatus === 'saving' ? '...' : 'Save'}
                  </button>
                </div>
                {keyStatus === 'success' && <p className="text-xs" style={{ color: '#34d399' }}>✔ API key saved securely in Windows Credential Manager</p>}
                {keyStatus === 'error' && <p className="text-xs" style={{ color: '#f87171' }}>✘ Failed to save key. Try again.</p>}
                <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>
                  Your key is stored in the Windows Credential Manager — never in plain text files.
                </p>
              </div>
            )}

            {/* Open in AI site */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--clr-muted)' }}>Open in AI (for the AI button)</label>
              <select
                value={llmSite}
                onChange={e => updateSetting('llmSite', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--clr-text)', outline: 'none' }}
              >
                {AI_SITES.map(s => (
                  <option key={s.value} value={s.value} style={{ background: '#1e293b' }}>{s.label}</option>
                ))}
              </select>
              <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>When you click the "AI" button in the search bar, this site opens with your query.</p>
            </div>
          </div>
        )}

        {/* ── Search & Browser Section ── */}
        {activeSection === 'search' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h2 className="text-lg font-bold ">Interface & Browser</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--clr-muted)' }}>Configure the appearance and default browsers.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--clr-muted)' }}>Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light', label: '☀️ Light' },
                  { value: 'dark', label: '🌙 Dark' },
                  { value: 'system', label: '💻 System' },
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => updateSetting('theme', t.value)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm transition-all"
                    style={{
                      background: theme === t.value ? 'rgba(99,102,241,0.2)' : 'var(--clr-input-bg)',
                      border: `1px solid ${theme === t.value ? 'rgba(99,102,241,0.5)' : 'var(--clr-border)'}`,
                      color: theme === t.value ? 'var(--clr-indigo)' : 'var(--clr-text)',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--clr-muted)' }}>Target Browser</label>
              <div className="grid grid-cols-2 gap-2">
                {BROWSERS.map(b => (
                  <button
                    key={b.value}
                    onClick={() => updateSetting('browser', b.value)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all text-left"
                    style={{
                      background: browser === b.value ? 'rgba(99,102,241,0.2)' : 'var(--clr-input-bg)',
                      border: `1px solid ${browser === b.value ? 'rgba(99,102,241,0.5)' : 'var(--clr-border)'}`,
                      color: browser === b.value ? 'var(--clr-indigo)' : 'var(--clr-text)',
                    }}
                  >
                    <span>{b.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: '#475569' }}>
                If the chosen browser is not installed, you'll see a clear install prompt.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--clr-muted)' }}>Search Engine</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'google', label: '🔍 Google' },
                  { value: 'bing', label: '💠 Bing' },
                  { value: 'perplexity', label: '🤔 Perplexity' },
                  { value: 'duckduckgo', label: '🦆 DuckDuckGo' },
                ].map(e => (
                  <button
                    key={e.value}
                    onClick={() => updateSetting('searchEngine', e.value)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all text-left"
                    style={{
                      background: (searchEngine || 'google') === e.value ? 'rgba(99,102,241,0.2)' : 'var(--clr-input-bg)',
                      border: `1px solid ${(searchEngine || 'google') === e.value ? 'rgba(99,102,241,0.5)' : 'var(--clr-border)'}`,
                      color: (searchEngine || 'google') === e.value ? 'var(--clr-indigo)' : 'var(--clr-text)',
                    }}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Shortcuts Section ── */}
        {activeSection === 'hotkey' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h2 className="text-lg font-bold ">Global Shortcut</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--clr-muted)' }}>Change the hotkey that summons the AI overlay.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--clr-muted)' }}>Hotkey</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hotkey}
                  onChange={e => updateHotkey(e.target.value)}
                  placeholder="e.g. alt+a"
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-mono focus:outline-none"
                  style={{ background: 'var(--clr-input-bg)', border: '1px solid var(--clr-border)', color: 'var(--clr-text)' }}
                />
                <button
                  onClick={handleHotkeySave}
                  disabled={hotkeyStatus === 'saving'}
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: 'var(--clr-indigo)' }}
                >
                  {hotkeyStatus === 'saving' ? '...' : hotkeyStatus === 'ok' ? '✓ Applied!' : hotkeyStatus === 'err' ? '✗ Failed' : 'Apply'}
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>
                Default: <code style={{ color: 'var(--clr-indigo)' }}>alt+a</code>. Takes effect immediately.
              </p>
            </div>

            {/* Keyboard shortcuts reference */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Keyboard Shortcuts (inside the assistant)</h3>
              <div className="space-y-2">
                {[
                  { keys: 'Ctrl + Enter', action: 'Open query in AI site', icon: '🤖' },
                  { keys: 'Alt + Enter', action: 'Search in web browser', icon: '🌐' },
                  { keys: 'Enter', action: 'Ask the built-in AI', icon: '💬' },
                  { keys: 'Escape', action: 'Hide the assistant', icon: '✕' },
                  { keys: 'Shift + Enter', action: 'New line in search bar', icon: '↵' },
                ].map(s => (
                  <div key={s.keys} className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: 'var(--clr-input-bg)', border: '1px solid var(--clr-border)' }}>
                    <div className="flex items-center gap-3">
                      <span>{s.icon}</span>
                      <span className="text-sm" style={{ color: 'var(--clr-text)' }}>{s.action}</span>
                    </div>
                    <code className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--clr-indigo)' }}>{s.keys}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Data / Danger Zone ── */}
        {activeSection === 'danger' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h2 className="text-lg font-bold ">Data & Privacy</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--clr-muted)' }}>Manage stored credentials and app data.</p>
            </div>
            <div className="p-4 rounded-xl space-y-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <h3 className="text-sm font-semibold" style={{ color: '#f87171' }}>⚠ Danger Zone</h3>
              <div>
                <p className="text-xs mb-3" style={{ color: 'var(--clr-muted)' }}>Delete the API key stored in Windows Credential Manager. You will need to re-enter it to use API models.</p>
                <button
                  onClick={handleDeleteKey}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}
                >
                  Delete API Key from Keychain
                </button>
              </div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-semibold  mb-1">Privacy</h3>
              <p className="text-xs" style={{ color: 'var(--clr-muted)', lineHeight: '1.6' }}>
                OS QuickAI never logs your queries. Your API key is stored exclusively in the Windows Credential Manager (hardware-backed). 
                Free model queries are routed through a public proxy — no personal data is attached.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
