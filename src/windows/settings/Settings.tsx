// ─────────────────────────────────────────────────────────────────────────────
// Settings.tsx — Main configuration page & Welcome flow manager
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useSettingsStore, FREE_MODELS } from '../../store/useSettingsStore';
import { saveApiKey, deleteApiKey, getApiKey, updateShortcut, checkBrowserExists } from '../../lib/tauriCommands';
import { open } from '@tauri-apps/plugin-shell';
import WelcomeScreen from './WelcomeScreen';
import { invoke } from '@tauri-apps/api/core';

// ── Configuration Data ───────────────────────────────────────────────────────

const API_MODELS = [
  { value: 'gemini', label: 'Gemini', placeholder: 'AIzaSy...', provider: 'gemini' },
  { value: 'grok', label: 'Grok', placeholder: 'xai-...', provider: 'grok' },
  { value: 'chatgpt', label: 'ChatGPT', placeholder: 'sk-proj-...', provider: 'openai' },
  { value: 'claude', label: 'Claude', placeholder: 'sk-ant-api03-...', provider: 'claude' },
];

const FREE_MODEL_OPTIONS = [
  { value: 'minimax-2.5', label: 'Minimax 2.5 (Free)' },
  { value: 'gemini-1.5-flash-8b', label: 'Gemini Flash (Free)' },
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
    enableSiteLauncher, enableAppLauncher, openLinksInternal,
    availableModels,
    loadSettings, updateHotkey, updateSetting, saveAll, refreshModels
  } = useSettingsStore();

  const [hasCompletedWelcome, setHasCompletedWelcome] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('models');
  const [keyInput, setKeyInput] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [hotkeyStatus, setHotkeyStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  // ── Initialization ─────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.add('settings-window');
    
    // Fallback timeout to guarantee the loading screen never gets permanently stuck
    const forceLoadTimer = setTimeout(() => {
      console.warn("Initialization timed out. Forcing UI to load.");
      if (!useSettingsStore.getState().settingsLoaded) {
        useSettingsStore.setState({ settingsLoaded: true });
      }
      setHasCompletedWelcome(prev => prev === null ? false : prev);
    }, 2000);

    // Non-blocking initialization
    loadSettings().finally(() => {
      invoke<boolean>('get_setting', { key: 'hasCompletedWelcome_v1_2' })
        .then(completed => {
          clearTimeout(forceLoadTimer);
          setHasCompletedWelcome(!!completed);
        })
        .catch(e => {
          clearTimeout(forceLoadTimer);
          console.error('Failed to read welcome state', e);
          setHasCompletedWelcome(false);
        });
    });

    // Fetch API key independently
    getApiKey().then(key => {
      if (key) {
        setKeyInput('••••••••••••');
        // Initial model refresh if on a premium provider
        const currentProvider = API_MODELS.find(m => llmModel.startsWith(m.value))?.provider;
        if (currentProvider) {
          refreshModels(key, currentProvider);
        }
      }
    });

    return () => {
      clearTimeout(forceLoadTimer);
      document.body.classList.remove('settings-window');
    };
  }, []);

  // Auto-refresh when provider changes
  useEffect(() => {
    const apiModel = API_MODELS.find(m => m.value === llmModel);
    if (apiModel) {
      getApiKey().then(key => {
        if (key) refreshModels(key, apiModel.provider);
      });
    }
  }, [llmModel]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleWelcomeComplete = async () => {
    try {
      await invoke('save_setting', { key: 'hasCompletedWelcome_v1_2', value: true });
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
      
      // Refresh models immediately after saving key
      const apiModel = API_MODELS.find(m => m.value === llmModel);
      if (apiModel) {
        setIsRefreshingModels(true);
        await refreshModels(keyInput, apiModel.provider);
        setIsRefreshingModels(false);
      }

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

  // ── Rendering ──────────────────────────────────────────────────────────

  if (!settingsLoaded || hasCompletedWelcome === null) {
    return (
      <div className="min-h-screen text-[var(--clr-text-primary)] flex flex-col font-sans" style={{ background: 'var(--clr-surface)' }}>
        <div className="loading-dot w-3 h-3" />
      </div>
    );
  }

  // Show Welcome Screen on first launch
  if (!hasCompletedWelcome) {
    return (
      <>
        <WelcomeScreen onGetStarted={handleWelcomeComplete} />
      </>
    );
  }

  const isFreeModel = FREE_MODELS.includes(llmModel);

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--clr-surface)', color: 'var(--clr-text)' }}>
      
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
                  {API_MODELS.map(m => {
                    const isActiveProvider = llmModel === m.value || availableModels.includes(llmModel);
                    return (
                      <button
                        key={m.value}
                        onClick={() => updateSetting('llmModel', m.value)}
                        className="flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all"
                        style={{
                          background: isActiveProvider ? 'var(--clr-surface)' : 'transparent',
                          color: isActiveProvider ? 'var(--clr-accent)' : 'var(--clr-text)',
                          boxShadow: isActiveProvider ? 'var(--shadow-sm)' : 'none',
                        }}
                      >
                        <span className={isActiveProvider ? 'font-bold' : ''}>{m.label}</span>
                        {isActiveProvider && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--clr-accent)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isFreeModel && (
                <div className="space-y-4">
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

                  {/* Discovered Models List */}
                  {availableModels.length > 0 && (
                    <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)' }}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold">Specific Model Selection</h4>
                        <button 
                          onClick={() => handleSaveKey()} 
                          className="text-[10px] font-bold uppercase tracking-wider text-[var(--clr-accent)] hover:underline"
                          disabled={isRefreshingModels}
                        >
                          {isRefreshingModels ? 'Refreshing...' : 'Refresh List'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                        {availableModels.map(m => (
                          <button
                            key={m}
                            onClick={() => updateSetting('llmModel', m)}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all hover:bg-white/5"
                            style={{
                              background: llmModel === m ? 'var(--clr-accent-soft)' : 'transparent',
                              color: llmModel === m ? 'var(--clr-accent)' : 'var(--clr-text-secondary)',
                            }}
                          >
                            <span className={llmModel === m ? 'font-bold' : ''}>
                              {m.split('/').pop()?.replace('models/', '') || m}
                            </span>
                            {llmModel === m && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

              {/* Launcher Toggles */}
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--clr-border)' }}>
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-tertiary)' }}>Feature Toggles</h3>
                
                <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}>
                  <div>
                    <div className="text-sm font-bold">Site Launcher</div>
                    <p className="text-[10px] opacity-60">Open URLs directly from the search bar.</p>
                  </div>
                  <button
                    onClick={() => updateSetting('enableSiteLauncher', !enableSiteLauncher)}
                    className={`w-10 h-5 rounded-full transition-all relative ${enableSiteLauncher ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${enableSiteLauncher ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}>
                  <div>
                    <div className="text-sm font-bold">App Launcher</div>
                    <p className="text-[10px] opacity-60">Launch Windows apps by typing their name.</p>
                  </div>
                  <button
                    onClick={() => updateSetting('enableAppLauncher', !enableAppLauncher)}
                    className={`w-10 h-5 rounded-full transition-all relative ${enableAppLauncher ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${enableAppLauncher ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}>
                  <div>
                    <div className="text-sm font-bold">Internal Browser</div>
                    <p className="text-[10px] opacity-60">Open links within the assistant panel when possible.</p>
                  </div>
                  <button
                    onClick={() => updateSetting('openLinksInternal', !openLinksInternal)}
                    className={`w-10 h-5 rounded-full transition-all relative ${openLinksInternal ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${openLinksInternal ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
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
