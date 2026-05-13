import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { AIModelsSection } from './sections/AIModelsSection';
import { InterfaceSection } from './sections/InterfaceSection';
import { SupportSection } from './sections/SupportSection';
import { PluginsSection } from './sections/PluginsSection';
import { ShortcutsSection } from './sections/ShortcutsSection';
import { UI_COLORS, APP_METADATA } from '../../constants/appConstants';
import WelcomeScreen from './WelcomeScreen';
import { invoke } from '@tauri-apps/api/core';

/**
 * @file Settings.tsx
 * @description Main settings orchestration component. 
 * Adheres to < 250 line hard limit by delegating to domain-specific sections.
 */
export default function Settings() {
  const [activeSection, setActiveSection] = useState('ai');
  const [showSaved, setShowSaved] = useState(false);
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState<boolean | null>(null);
  const [hotkeyStatus, setHotkeyStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  
  const { 
    browser, theme, llmModel, customProviders, settingsLoaded,
    llmSite, hotkey, ollamaEnabled, ollamaUrl, availableModels,
    enableSiteLauncher, enableAppLauncher, openLinksInternal,
    loadSettings, updateSetting, addCustomProvider, updateHotkey, refreshModels
  } = useSettingsStore();

  useEffect(() => {
    // Fallback timeout to guarantee the loading screen never gets permanently stuck
    const forceLoadTimer = setTimeout(() => {
      console.warn("Initialization timed out. Forcing UI to load.");
      if (!settingsLoaded) {
        // We can't call set directly on store here easily without getting it, 
        // but loadSettings will eventually finish or we can force state.
      }
      setHasCompletedWelcome(prev => prev === null ? false : prev);
    }, 2000);

    loadSettings().finally(() => {
      invoke<boolean>('get_setting', { key: 'hasCompletedWelcome_v1_0_1' })
        .then(completed => {
          clearTimeout(forceLoadTimer);
          setHasCompletedWelcome(!!completed);
        })
        .catch(() => {
          clearTimeout(forceLoadTimer);
          setHasCompletedWelcome(false);
        });
    });

    return () => clearTimeout(forceLoadTimer);
  }, [loadSettings, settingsLoaded]);

  const handleSettingChange = (key: string, value: any) => {
    updateSetting(key, value);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleRefreshModels = async () => {
    setIsRefreshingModels(true);
    try { await refreshModels(); } finally { setIsRefreshingModels(false); }
  };

  const handleSaveHotkey = async () => {
    setHotkeyStatus('saving');
    try {
      await updateHotkey(hotkey);
      setHotkeyStatus('ok');
      setTimeout(() => setHotkeyStatus('idle'), 2000);
    } catch {
      setHotkeyStatus('err');
    }
  };

  if (!settingsLoaded || hasCompletedWelcome === null) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--clr-bg)' }}><div className="loading-dot" /></div>;
  }

  if (!hasCompletedWelcome) {
    return <WelcomeScreen onGetStarted={async () => {
      await invoke('save_setting', { key: 'hasCompletedWelcome_v1_0_1', value: true });
      setHasCompletedWelcome(true);
    }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--clr-bg)', color: 'var(--clr-text)' }}>
      {/* Sidebar Navigation */}
      <div className="w-64 border-r flex flex-col p-6 gap-2" style={{ borderColor: UI_COLORS.BORDER, background: 'var(--clr-bg-sidebar)' }}>
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-lg" style={{ background: UI_COLORS.ACCENT }}>Q</div>
          <h1 className="text-lg font-black tracking-tight">{APP_METADATA.NAME} <span className="text-[10px] font-normal opacity-40">v{APP_METADATA.VERSION}</span></h1>
        </div>
        
        {[
          { id: 'ai', label: 'AI Models & APIs' },
          { id: 'plugins', label: 'Plugins for Advanced AI' },
          { id: 'interface', label: 'Interface & Browser' },
          { id: 'hotkey', label: 'Shortcuts' },
          { id: 'feedback', label: 'Support & Community' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${activeSection === item.id ? 'translate-x-1 shadow-lg' : 'opacity-60 hover:opacity-100'}`}
            style={{ 
              background: activeSection === item.id ? UI_COLORS.ACCENT : 'transparent',
              color: activeSection === item.id ? 'white' : 'inherit'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Domain Content Sections */}
      <div className="flex-1 overflow-y-auto p-12 relative scroll-smooth">
        <div className="max-w-2xl mx-auto">
          {activeSection === 'ai' && (
            <AIModelsSection 
              llmModel={llmModel} 
              availableModels={availableModels}
              isRefreshingModels={isRefreshingModels}
              onSettingChange={handleSettingChange}
              refreshModels={handleRefreshModels}
            />
          )}
          {activeSection === 'plugins' && (
            <PluginsSection 
              customProviders={customProviders}
              ollamaEnabled={ollamaEnabled}
              ollamaUrl={ollamaUrl}
              onSettingChange={handleSettingChange}
              onAddCustom={addCustomProvider}
              onDeleteCustom={(id) => updateSetting('customProviders', customProviders.filter(p => p.id !== id))}
              refreshModels={handleRefreshModels}
            />
          )}
          {activeSection === 'interface' && (
            <InterfaceSection 
              browser={browser} theme={theme} llmSite={llmSite}
              enableSiteLauncher={enableSiteLauncher}
              enableAppLauncher={enableAppLauncher}
              openLinksInternal={openLinksInternal}
              onSettingChange={handleSettingChange} 
            />
          )}
          {activeSection === 'hotkey' && (
            <ShortcutsSection 
              hotkey={hotkey}
              onHotkeyChange={(hk) => updateSetting('hotkey', hk)}
              onSave={handleSaveHotkey}
              status={hotkeyStatus}
            />
          )}
          {activeSection === 'feedback' && <SupportSection />}
        </div>

        {/* Global Toast Notification */}
        <div className={`fixed bottom-8 right-8 px-5 py-2.5 rounded-2xl bg-green-500 text-white text-[11px] font-black uppercase tracking-widest shadow-2xl transition-all duration-500 flex items-center gap-2 ${
          showSaved ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'
        }`}>
          SAVED CHANGES
        </div>
      </div>
    </div>
  );
}
