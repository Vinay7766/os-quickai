// ─────────────────────────────────────────────────────────────────────────────
// Settings.tsx — Main configuration page & Welcome flow manager
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useSettingsStore, FREE_MODELS } from '../../store/useSettingsStore';
import { saveApiKey, deleteApiKey, getApiKey, updateShortcut, checkBrowserExists } from '../../lib/tauriCommands';
import { open } from '@tauri-apps/plugin-shell';
import WelcomeScreen from './WelcomeScreen';
import { createStore } from '@tauri-apps/plugin-store';

// ── Configuration Data ───────────────────────────────────────────────────────

const API_MODELS = [
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', placeholder: 'AIzaSy...' },
  { value: 'grok-1.5', label: 'Grok 1.5 (xAI)', placeholder: 'xai-...' },
  { value: 'gpt-4o-mini', label: 'ChatGPT (GPT-4o Mini)', placeholder: 'sk-proj-...' },
  { value: 'gpt-4o', label: 'ChatGPT (GPT-4o)', placeholder: 'sk-proj-...' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus', placeholder: 'sk-ant-api03-...' },
];

const FREE_MODEL_OPTIONS = [
  { value: 'minimax-2.5', label: 'Minimax 2.5 (Free)' },
  { value: 'qwen-3.6', label: 'Qwen 3.6 (Free)' },
  { value: 'nemotron', label: 'Nvidia Nemotron (Free)' },
];

const BROWSERS = [
  { value: 'default', label: 'System Default' },
  { value: 'chrome', label: 'Google Chrome' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'brave', label: 'Brave' },
  { value: 'bing', label: 'Microsoft Edge' },
  { value: 'opera', label: 'Opera' },
  { value: 'comet', label: 'Comet' },
];

const AI_SITES = [
  { value: 'claude', label: 'Claude (Default)' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'grok', label: 'Grok (xAI)' },
  { value: 'perplexity', label: 'Perplexity' },
];

type Section = 'models' | 'interface' | 'hotkey' | 'feedback' | 'danger';

const SIDEBAR_NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'models', label: 'AI Models & APIs', icon: '🧠' },
  { id: 'interface', label: 'Interface & Browser', icon: '🎨' },
  { id: 'hotkey', label: 'Shortcuts', icon: '⌨️' },
  { id: 'feedback', label: 'Support & Community', icon: '💬' },
  { id: 'danger', label: 'Security & Data', icon: '🛡️' },
];

export default function Settings() {
  const {
    hotkey, llmModel, browser, llmSite, theme, settingsLoaded,
    loadSettings, updateHotkey, updateSetting, saveAll
  } = useSettingsStore();

  const [hasCompletedWelcome, setHasCompletedWelcome] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('models');
  const [keyInput, setKeyInput] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [hotkeyStatus, setHotkeyStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');

  // ── Initialization ─────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.add('settings-window');
    
    async function init() {
      await loadSettings();
      // Check if welcome screen was previously completed
      const store = await createStore('settings.json', { autoSave: false });
      const completed = await store.get<boolean>('hasCompletedWelcome');
      setHasCompletedWelcome(!!completed);

      // Load existing API key display
      const key = await getApiKey();
      if (key) setKeyInput('••••••••••••');
    }
    init();

    return () => document.body.classList.remove('settings-window');
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleWelcomeComplete = async () => {
    try {
      const store = await createStore('settings.json', { autoSave: false });
      await store.set('hasCompletedWelcome', true);
      await store.save();
      setHasCompletedWelcome(true);
    } catch (e) {
      console.error('Failed to save welcome state', e);
      setHasCompletedWelcome(true); // Proceed anyway
    }
  };

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
    if (confirm('Delete the saved API key? This will permanently remove it from the Windows Credential Manager and your local machine.')) {
      await deleteApiKey();
      setKeyInput('');
      setKeyStatus('idle');
      alert('API Key successfully deleted from your machine.');
    }
  };

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

  const handleBrowserChange = async (val: string) => {
    if (val !== 'default') {
      const exists = await checkBrowserExists(val);
      if (!exists) {
        const browserName = BROWSERS.find(b => b.value === val)?.label || val;
        // Simple native alert, cleaner than custom toasts for edge case settings
        alert(`Selected browser (${browserName}) could not be found on your system.\nPlease install it or choose another option.`);
        return;
      }
    }
    await updateSetting('browser', val);
  };

  // ── Drag Window Handle ─────────────────────────────────────────────────
  // Custom window titlebar to allow dragging the window around
  const WindowDragHandle = () => (
    <div 
      onMouseDown={() => getCurrentWindow().startDragging()}
      className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-move z-50 select-none opacity-0 hover:opacity-100 transition-opacity"
      style={{ background: 'var(--clr-hover)' }}
    >
      <div className="w-12 h-1 rounded-full" style={{ background: 'var(--clr-text-tertiary)' }} />
    </div>
  );

  // ── Rendering ──────────────────────────────────────────────────────────

  if (!settingsLoaded || hasCompletedWelcome === null) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--clr-surface)' }}>
        <div className="loading-dot w-3 h-3" />
      </div>
    );
  }

  // Show Welcome Screen on first launch
  if (!hasCompletedWelcome) {
    return (
      <>
        <WindowDragHandle />
        <WelcomeScreen onGetStarted={handleWelcomeComplete} />
      </>
    );
  }

  const isFreeModel = FREE_MODELS.includes(llmModel);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--clr-surface)', color: 'var(--clr-text)' }}>
      <WindowDragHandle />
      
      {/* ── Sidebar ── */}
      <div 
        className="w-64 shrink-0 flex flex-col py-10 px-4 border-r pt-12"
        style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)' }}
      >
        {/* Brand Header */}
        <div className="px-4 mb-8 flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm"
            style={{ background: 'var(--clr-accent)' }}
          >
            Q
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Quickno</h1>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--clr-text-secondary)' }}>
              Settings
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-1.5 flex-1">
          {SIDEBAR_NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveSection(n.id)}
              className="group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all w-full relative text-left"
              style={{
                background: activeSection === n.id ? 'var(--clr-surface)' : 'transparent',
                color: activeSection === n.id ? 'var(--clr-accent)' : 'var(--clr-text-secondary)',
                fontWeight: activeSection === n.id ? 600 : 500,
                boxShadow: activeSection === n.id ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleManualSave}
          className="mt-6 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-95"
          style={{ 
            background: saveIndicator ? 'var(--clr-success)' : 'var(--clr-accent)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {saveIndicator ? 'Saved successfully ✓' : 'Save all changes'}
        </button>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto px-12 py-12 pt-16">
        <div className="max-w-xl">
          
          {/* Models Section */}
          {activeSection === 'models' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-xl font-bold mb-1">AI Models & APIs</h2>
                <p className="text-sm" style={{ color: 'var(--clr-text-secondary)' }}>
                  Select the AI model that powers your search assistant.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-tertiary)' }}>Model Selection</h3>
                <div 
                  className="grid gap-1.5 p-1.5 rounded-2xl border"
                  style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}
                >
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-secondary)' }}>Free Models (No API Key)</div>
                  {FREE_MODEL_OPTIONS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => updateSetting('llmModel', m.value)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all"
                      style={{
                        background: llmModel === m.value ? 'var(--clr-surface)' : 'transparent',
                        color: llmModel === m.value ? 'var(--clr-accent)' : 'var(--clr-text)',
                        boxShadow: llmModel === m.value ? 'var(--shadow-sm)' : 'none',
                      }}
                    >
                      <span className={llmModel === m.value ? 'font-bold' : ''}>{m.label}</span>
                      {llmModel === m.value && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--clr-accent)' }} />}
                    </button>
                  ))}
                  
                  <div className="px-3 py-2 mt-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-secondary)' }}>Premium API Models (Bring Your Own Key)</div>
                  {API_MODELS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => updateSetting('llmModel', m.value)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all"
                      style={{
                        background: llmModel === m.value ? 'var(--clr-surface)' : 'transparent',
                        color: llmModel === m.value ? 'var(--clr-accent)' : 'var(--clr-text)',
                        boxShadow: llmModel === m.value ? 'var(--shadow-sm)' : 'none',
                      }}
                    >
                      <span className={llmModel === m.value ? 'font-bold' : ''}>{m.label}</span>
                      {llmModel === m.value && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--clr-accent)' }} />}
                    </button>
                  ))}
                </div>
              </div>

              {!isFreeModel && (
                <div 
                  className="p-6 rounded-2xl border space-y-4"
                  style={{ background: 'var(--clr-accent-soft)', borderColor: 'var(--clr-border)' }}
                >
                  <div>
                    <h4 className="text-sm font-bold">API Key Manager</h4>
                    <p className="text-xs mt-1" style={{ color: 'var(--clr-text-secondary)' }}>
                      Stored securely in Windows Credential Manager. Never leaves your machine.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={keyInput}
                      onChange={e => setKeyInput(e.target.value)}
                      placeholder={API_MODELS.find(m => m.value === llmModel)?.placeholder ?? 'Enter your secure API key...'}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none transition-all"
                      style={{ background: 'var(--clr-surface)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                    />
                    <button
                      onClick={handleSaveKey}
                      disabled={keyStatus === 'saving' || !keyInput || keyInput === '••••••••••••'}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-colors"
                      style={{ background: 'var(--clr-accent)' }}
                    >
                      {keyStatus === 'saving' ? 'Saving...' : 'Save Key'}
                    </button>
                  </div>
                  {keyStatus === 'success' && <p className="text-xs font-medium" style={{ color: 'var(--clr-success)' }}>✓ API Key encrypted and saved securely.</p>}
                  {keyStatus === 'error' && <p className="text-xs font-medium" style={{ color: 'var(--clr-danger)' }}>Failed to store API Key.</p>}
                </div>
              )}
            </div>
          )}

          {/* Interface & Browser Section */}
          {activeSection === 'interface' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-xl font-bold mb-1">Interface & Navigation</h2>
                <p className="text-sm" style={{ color: 'var(--clr-text-secondary)' }}>
                  Customize the look and web interaction behavior.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-tertiary)' }}>Theme Mode</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'System' },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => updateSetting('theme', t.value)}
                      className="px-4 py-3 rounded-xl text-sm font-semibold transition-all border flex flex-col items-center gap-1.5"
                      style={{
                        background: theme === t.value ? 'var(--clr-surface)' : 'var(--clr-input-bg)',
                        borderColor: theme === t.value ? 'var(--clr-accent)' : 'var(--clr-border)',
                        color: theme === t.value ? 'var(--clr-accent)' : 'var(--clr-text-secondary)',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-tertiary)' }}>Preferred Browser</h3>
                <select
                  value={browser}
                  onChange={e => handleBrowserChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm font-semibold border focus:outline-none cursor-pointer"
                  style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                >
                  {BROWSERS.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
                <p className="text-xs" style={{ color: 'var(--clr-text-secondary)' }}>
                  "System Default" will automatically use your OS-level browser preference.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-tertiary)' }}>Preferred AI Site</h3>
                <select
                  value={llmSite}
                  onChange={e => updateSetting('llmSite', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm font-semibold border focus:outline-none cursor-pointer"
                  style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                >
                  {AI_SITES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <p className="text-xs" style={{ color: 'var(--clr-text-secondary)' }}>
                  This site will open when you click the "AI Search" button in the overlay.
                </p>
              </div>
            </div>
          )}

          {/* Shortcuts Section */}
          {activeSection === 'hotkey' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-xl font-bold mb-1">Keyboard Shortcuts</h2>
                <p className="text-sm" style={{ color: 'var(--clr-text-secondary)' }}>
                  Customize the global hotkey to summon the search overlay.
                </p>
              </div>

              <div 
                className="p-6 rounded-2xl border space-y-4"
                style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}
              >
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-tertiary)' }}>Global Toggle Key</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={hotkey}
                    onChange={e => updateHotkey(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono border focus:outline-none"
                    style={{ background: 'var(--clr-surface)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
                  />
                  <button
                    onClick={handleHotkeySave}
                    disabled={hotkeyStatus === 'saving'}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'var(--clr-accent)' }}
                  >
                    {hotkeyStatus === 'saving' ? 'Saving...' : hotkeyStatus === 'ok' ? 'Saved' : 'Apply'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-tertiary)' }}>Overlay Shortcuts</h3>
                <div className="grid gap-2">
                  {[
                    { keys: 'Enter', action: 'Submit query to internal AI' },
                    { keys: 'Ctrl + Enter', action: 'Open query in external AI site' },
                    { keys: 'Alt + Enter', action: 'Open query in web browser' },
                    { keys: '/', action: 'Focus text input' },
                    { keys: 'Escape', action: 'Close overlay' },
                  ].map(s => (
                    <div 
                      key={s.keys} 
                      className="flex items-center justify-between px-4 py-3 rounded-xl border"
                      style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}
                    >
                      <span className="text-sm">{s.action}</span>
                      <code 
                        className="text-[11px] font-bold px-2 py-1 rounded-md"
                        style={{ background: 'var(--clr-surface)', color: 'var(--clr-accent)', border: '1px solid var(--clr-border)' }}
                      >
                        {s.keys}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Feedback & Support */}
          {activeSection === 'feedback' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-xl font-bold mb-1">Support & Community</h2>
                <p className="text-sm" style={{ color: 'var(--clr-text-secondary)' }}>
                  Connect with the developers and other users.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  { title: 'Community Discord', desc: 'Join the conversation, ask questions, and share ideas.', url: 'https://discord.gg/tJXcYePghn' },
                  { title: 'Bug Reporting', desc: 'Found an issue? Let us know so we can fix it.', url: 'https://discord.gg/CpMW6AMsKC' },
                  { title: 'Feature Requests', desc: 'Suggest new features for future versions.', url: 'https://discord.gg/CpMW6AMsKC' }
                ].map(item => (
                  <div 
                    key={item.title} 
                    className="p-5 rounded-2xl border flex items-center justify-between gap-4"
                    style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}
                  >
                    <div>
                      <h3 className="font-bold text-sm mb-0.5">{item.title}</h3>
                      <p className="text-[12px]" style={{ color: 'var(--clr-text-secondary)' }}>{item.desc}</p>
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
            </div>
          )}

          {/* Danger Zone */}
          {activeSection === 'danger' && (
            <div className="space-y-8 animate-fade-in-up">
              <div>
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--clr-danger)' }}>Security & Data</h2>
                <p className="text-sm" style={{ color: 'var(--clr-text-secondary)' }}>
                  Manage sensitive data stored on your local machine.
                </p>
              </div>

              <div 
                className="p-6 rounded-2xl border space-y-4"
                style={{ background: 'var(--clr-danger-soft)', borderColor: 'rgba(220, 38, 38, 0.15)' }}
              >
                <div>
                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--clr-danger)' }}>Delete API Key</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--clr-text-secondary)' }}>
                    This will permanently remove your stored API key from the Windows Credential Manager and your local machine. Premium AI models will no longer work until a new key is provided.
                  </p>
                </div>
                <button
                  onClick={handleDeleteKey}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-sm"
                  style={{ background: 'var(--clr-danger)' }}
                >
                  Delete API Key
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
