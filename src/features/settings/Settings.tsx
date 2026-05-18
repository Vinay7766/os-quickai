/*
 * Copyright 2026 Vinay7766
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Settings.tsx — Main configuration page & Welcome flow manager
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '../../core/store/useSettingsStore';
import { saveApiKey, deleteApiKey, getApiKey, updateShortcut, checkBrowserExists } from '../../core/lib/tauriCommands';
import WelcomeScreen from './WelcomeScreen';
import { invoke } from '@tauri-apps/api/core';
import { useUpdateCheck } from '../../core/hooks/useUpdateCheck';
import appLogo from '../../assets/app-logo.png';

// Sections
import AIModelSection from './sections/AIModelSection';
import InterfaceSection from './sections/InterfaceSection';
import HotkeySection from './sections/HotkeySection';
import SupportSection from './sections/SupportSection';
import PluginSection from './sections/PluginSection';

import { API_MODELS } from '../../core/constants';

type Section = 'models' | 'plugins' | 'interface' | 'hotkey' | 'support';

const SIDEBAR_NAV: { id: Section; label: string }[] = [
  { id: 'models', label: 'AI Models & APIs' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'interface', label: 'Interface & Browser' },
  { id: 'hotkey', label: 'Shortcuts' },
  { id: 'support', label: 'Support & Community' },
];

export default function Settings() {
  const {
    hotkey, llmModel, browser, searchEngine, customSearchUrl, llmSite, theme, settingsLoaded,
    enableSiteLauncher, enableAppLauncher, enableTerminalMode, openLinksInternal,
    availableModels, customProviders, ollamaEnabled, ollamaUrl,
    loadSettings, updateHotkey, updateSetting, refreshModels
  } = useSettingsStore();
  
  const updateVersion = useUpdateCheck();

  const [hasCompletedWelcome, setHasCompletedWelcome] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('models');
  const [keyInput, setKeyInput] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showToast, setShowToast] = useState(false);
  const [hotkeyStatus, setHotkeyStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [storedKeys, setStoredKeys] = useState<Record<string, boolean>>({});
  const [activeKeyProvider, setActiveKeyProvider] = useState<string | null>(null);

  // ── Initialization ─────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.add('settings-window');
    const forceLoadTimer = setTimeout(() => {
      if (!useSettingsStore.getState().settingsLoaded) useSettingsStore.setState({ settingsLoaded: true });
      setHasCompletedWelcome(prev => prev === null ? false : prev);
    }, 2000);

    loadSettings().finally(() => {
      invoke<boolean>('get_setting', { key: 'hasCompletedWelcome_v1_0_1' })
        .then(completed => { clearTimeout(forceLoadTimer); setHasCompletedWelcome(!!completed); })
        .catch(() => { clearTimeout(forceLoadTimer); setHasCompletedWelcome(false); });
    });

    Promise.all(API_MODELS.map(async m => {
      const key = await getApiKey(m.provider);
      return { provider: m.provider, exists: !!key };
    })).then(results => {
      const mapping: Record<string, boolean> = {};
      results.forEach(r => mapping[r.provider] = r.exists);
      setStoredKeys(mapping);
    });

    return () => { clearTimeout(forceLoadTimer); document.body.classList.remove('settings-window'); };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────

  const triggerToast = useCallback(() => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  const handleUpdateSetting = async (key: string, val: any) => {
    await updateSetting(key, val);
    triggerToast();
  };

  const handleWelcomeComplete = async () => {
    try { await invoke('save_setting', { key: 'hasCompletedWelcome_v1_0_1', value: true }); setHasCompletedWelcome(true); }
    catch (e) { setHasCompletedWelcome(true); }
  };

  const handleSaveKey = async (provider?: string) => {
    if (!keyInput || keyInput === '••••••••••••') return;
    const targetProvider = provider || API_MODELS.find(m => llmModel.startsWith(m.value))?.provider;
    if (!targetProvider) return;
    setKeyStatus('saving');
    try {
      await saveApiKey(keyInput, targetProvider);
      setKeyStatus('success');
      setStoredKeys(prev => ({ ...prev, [targetProvider]: true }));
      triggerToast();
      const apiModel = API_MODELS.find(m => llmModel.startsWith(m.value));
      if (apiModel && apiModel.provider === targetProvider) {
        setIsRefreshingModels(true);
        refreshModels().finally(() => setIsRefreshingModels(false));
      }
      setTimeout(() => { setKeyStatus('idle'); setKeyInput('••••••••••••'); setActiveKeyProvider(null); }, 2500);
    } catch (e) { setKeyStatus('error'); }
  };

  const handleRefresh = async () => {
    const apiModel = API_MODELS.find(m => llmModel.startsWith(m.value));
    if (!apiModel) return;
    const key = await getApiKey(apiModel.provider);
    if (!key) return;
    setIsRefreshingModels(true);
    try { await refreshModels(); } finally { setIsRefreshingModels(false); }
  };

  const handleDeleteKey = async (provider?: string) => {
    const apiModel = API_MODELS.find(m => llmModel.startsWith(m.value));
    const targetProvider = provider || apiModel?.provider;
    
    if (!targetProvider) {
      alert("Please select a model provider first to delete its key.");
      return;
    }

    const providerLabel = API_MODELS.find(p => p.provider === targetProvider)?.label || targetProvider;
    if (confirm(`Delete the saved API key for ${providerLabel}?`)) {
      await deleteApiKey(targetProvider);
      setStoredKeys(prev => ({ ...prev, [targetProvider]: false }));
      if (targetProvider === apiModel?.provider) setKeyInput('');
      setKeyStatus('idle');
      triggerToast();
      alert(`${providerLabel} API Key deleted successfully.`);
    }
  };

  const handleResetAllKeys = async () => {
    if (confirm("Are you sure you want to WIPE ALL stored API keys from your machine? This cannot be undone.")) {
      try {
        for (const model of API_MODELS) {
          await deleteApiKey(model.provider);
        }
        if (customProviders.length > 0) {
          await updateSetting('customProviders', []);
          await invoke('save_setting', { key: 'customProviders', value: '[]' });
        }
        
        const freshMapping: Record<string, boolean> = {};
        API_MODELS.forEach(m => freshMapping[m.provider] = false);
        setStoredKeys(freshMapping);
        setKeyInput('');
        refreshModels();
        triggerToast();
      } catch (e) {
        alert("Failed to wipe all keys: " + String(e));
      }
    }
  };

  const handleHotkeySave = async () => {
    setHotkeyStatus('saving');
    try { 
      await updateShortcut(hotkey); 
      await updateHotkey(hotkey); 
      setHotkeyStatus('ok'); 
      triggerToast();
      setTimeout(() => setHotkeyStatus('idle'), 2000); 
    }
    catch (e) { setHotkeyStatus('err'); }
  };

  const handleBrowserChange = async (val: string) => {
    if (val !== 'default') {
      const exists = await checkBrowserExists(val);
      if (!exists) { alert(`Selected browser could not be found.`); return; }
    }
    await handleUpdateSetting('browser', val);
  };

  if (!settingsLoaded || hasCompletedWelcome === null) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--clr-surface)' }}><div className="loading-dot w-3 h-3" /></div>;
  }

  if (!hasCompletedWelcome) return <WelcomeScreen onGetStarted={handleWelcomeComplete} />;

  return (
    <div className="h-screen flex overflow-hidden relative" style={{ background: 'var(--clr-surface)', color: 'var(--clr-text)' }}>
      {/* Nice interactive Toast */}
      <div className={`absolute top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-500 transform ${showToast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}>
        <div className="px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-3 shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-[var(--clr-success)] animate-pulse shadow-[0_0_8px_var(--clr-success)]" />
          <span className="text-xs font-bold tracking-widest uppercase text-white/90">Saved Changes</span>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col py-10 px-4 border-r pt-12" style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)' }}>
        <div className="px-4 mb-10 flex items-center gap-3">
          <img src={appLogo} alt="Logo" className="w-10 h-10 rounded-xl shadow-xl shadow-[var(--clr-accent)]/10" />
          <div><h1 className="font-bold text-[17px] leading-tight">Quickno</h1><p className="text-[10px] uppercase tracking-wider font-bold opacity-40">Settings</p></div>
        </div>
        <div className="space-y-1.5 flex-1">
          {SIDEBAR_NAV.map((n) => (
            <button key={n.id} onClick={() => setActiveSection(n.id)} className="group flex items-center gap-3 px-5 py-3 rounded-2xl text-sm transition-all w-full relative text-left" style={{
                background: activeSection === n.id ? 'var(--clr-accent)' : 'transparent',
                color: activeSection === n.id ? '#ffffff' : 'var(--clr-text-secondary)',
                fontWeight: activeSection === n.id ? 700 : 500,
              }}>{n.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-16 py-16 custom-scrollbar">
        <div className="max-w-xl">
          {activeSection === 'models' && <AIModelSection llmModel={llmModel} availableModels={availableModels} storedKeys={storedKeys} activeKeyProvider={activeKeyProvider} keyInput={keyInput} keyStatus={keyStatus} isRefreshingModels={isRefreshingModels} setKeyInput={setKeyInput} setActiveKeyProvider={setActiveKeyProvider} handleSaveKey={handleSaveKey} handleDeleteKey={handleDeleteKey} handleResetAllKeys={handleResetAllKeys} handleRefresh={handleRefresh} updateSetting={handleUpdateSetting} customProviders={customProviders} refreshModels={refreshModels} />}
          {activeSection === 'plugins' && <PluginSection ollamaEnabled={ollamaEnabled} ollamaUrl={ollamaUrl} enableTerminalMode={enableTerminalMode} updateSetting={handleUpdateSetting} refreshModels={refreshModels} />}
          {activeSection === 'interface' && <InterfaceSection theme={theme} browser={browser} llmSite={llmSite} searchEngine={searchEngine} customSearchUrl={customSearchUrl} enableSiteLauncher={enableSiteLauncher} enableAppLauncher={enableAppLauncher} openLinksInternal={openLinksInternal} updateSetting={handleUpdateSetting} handleBrowserChange={handleBrowserChange} />}
          {activeSection === 'hotkey' && <HotkeySection hotkey={hotkey} hotkeyStatus={hotkeyStatus} updateHotkey={updateHotkey} handleHotkeySave={handleHotkeySave} setHotkeyStatus={setHotkeyStatus} />}
          {activeSection === 'support' && <SupportSection updateVersion={updateVersion} />}
        </div>
      </div>
    </div>
  );
}
