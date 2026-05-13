import { useState, useEffect } from 'react';
import { UI_COLORS } from '../../../constants/appConstants';
import { getApiKey, saveApiKey, deleteApiKey } from '../../../lib/tauriCommands';
import { invoke } from '@tauri-apps/api/core';

interface AIModelsSectionProps {
  llmModel: string;
  availableModels: string[];
  isRefreshingModels: boolean;
  onSettingChange: (key: string, value: any) => void;
  refreshModels: () => Promise<void>;
}

const API_MODELS = [
  { value: 'gemini', label: 'Gemini', placeholder: 'AIzaSy...', provider: 'gemini' },
  { value: 'grok', label: 'Grok', placeholder: 'xai-...', provider: 'grok' },
  { value: 'chatgpt', label: 'ChatGPT', placeholder: 'sk-proj-...', provider: 'openai' },
  { value: 'claude', label: 'Claude', placeholder: 'sk-ant-api03-...', provider: 'claude' },
  { value: 'perplexity', label: 'Perplexity', placeholder: 'pplx-...', provider: 'perplexity' },
];

/**
 * @component AIModelsSection
 * @description Fully restored API key manager, Discovered Models list, and Danger Zone.
 */
export function AIModelsSection({ 
  llmModel, availableModels, isRefreshingModels, onSettingChange, refreshModels 
}: AIModelsSectionProps) {
  const [storedKeys, setStoredKeys] = useState<Record<string, boolean>>({});
  const [activeKeyProvider, setActiveKeyProvider] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    Promise.all(API_MODELS.map(async m => {
      const key = await getApiKey(m.provider);
      return { provider: m.provider, exists: !!key };
    })).then(results => {
      const mapping: Record<string, boolean> = {};
      results.forEach(r => mapping[r.provider] = r.exists);
      setStoredKeys(mapping);
    });
  }, []);

  const handleSaveKey = async (provider: string) => {
    if (!keyInput || keyInput === '••••••••••••') return;
    setKeyStatus('saving');
    try {
      await saveApiKey(keyInput, provider);
      setKeyStatus('success');
      setStoredKeys(prev => ({ ...prev, [provider]: true }));
      await refreshModels();
      setTimeout(() => {
        setKeyStatus('idle');
        setKeyInput('••••••••••••');
        setActiveKeyProvider(null);
      }, 2000);
    } catch {
      setKeyStatus('error');
    }
  };

  const handleFactoryReset = async () => {
    if (confirm('Are you absolutely sure? This will wipe ALL settings and API keys. The app will close.')) {
      await invoke('factory_reset');
      await invoke('close_overlay');
      window.location.reload(); 
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold mb-1">AI Models & APIs</h2>
        <p className="text-sm" style={{ color: UI_COLORS.TEXT_SECONDARY }}>Select Your own model by BYOK</p>
      </div>

      {/* Model Selection */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50">Model Selection</h3>
        <div className="p-2 rounded-2xl border" style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}>
          <button
            onClick={() => onSettingChange('llmModel', 'free-model')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${llmModel === 'free-model' ? 'bg-[var(--clr-surface)]' : ''}`}
            style={{ color: llmModel === 'free-model' ? 'var(--clr-accent)' : 'inherit' }}
          >
            <span className={llmModel === 'free-model' ? 'font-bold' : ''}>Free Model</span>
            {llmModel === 'free-model' && <div className="w-2 h-2 rounded-full bg-[var(--clr-accent)] shadow-[0_0_8px_rgba(37,99,235,0.5)]" />}
          </button>
          
          <div className="px-4 py-2 mt-2 text-[9px] font-bold opacity-30 uppercase tracking-widest border-t" style={{ borderColor: UI_COLORS.BORDER }}>Premium API Models</div>
          {API_MODELS.map(m => (
            <button
              key={m.value}
              onClick={() => onSettingChange('llmModel', m.value)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${llmModel.startsWith(m.value) ? 'bg-[var(--clr-surface)]' : ''}`}
              style={{ color: llmModel.startsWith(m.value) ? 'var(--clr-accent)' : 'inherit' }}
            >
              <span className={llmModel.startsWith(m.value) ? 'font-bold' : ''}>{m.label}</span>
              {llmModel.startsWith(m.value) && <div className="w-2 h-2 rounded-full bg-[var(--clr-accent)] shadow-[0_0_8px_rgba(37,99,235,0.5)]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Discovered Models List */}
      {availableModels.length > 0 && (
        <div className="p-6 rounded-2xl border space-y-4" style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold">Specific Model Selection</h4>
            <button 
              onClick={() => refreshModels()} 
              disabled={isRefreshingModels}
              className="text-[10px] font-bold text-[var(--clr-accent)] uppercase hover:underline disabled:opacity-50"
            >
              {isRefreshingModels ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
            {availableModels.map(m => (
              <button
                key={m}
                onClick={() => onSettingChange('llmModel', m)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all hover:bg-white/5 ${llmModel === m ? 'text-[var(--clr-accent)] font-bold' : 'opacity-60'}`}
              >
                <span>{m.split('/').pop() || m}</span>
                {llmModel === m && <div className="w-2 h-2 rounded-full bg-[var(--clr-accent)]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* API Key Manager */}
      <div className="space-y-4 pt-4 border-t" style={{ borderColor: UI_COLORS.BORDER }}>
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50">API Key Manager</h3>
        <div className="grid gap-2">
          {API_MODELS.map(m => (
            <div key={m.provider} className="p-4 rounded-xl border group transition-all" style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">{m.label}</span>
                  {storedKeys[m.provider] && <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Connected</span>}
                </div>
                <div className="flex items-center gap-3">
                  {storedKeys[m.provider] && (
                    <button onClick={() => deleteApiKey(m.provider).then(() => setStoredKeys(prev => ({ ...prev, [m.provider]: false })))} className="text-[9px] font-bold text-red-500 uppercase opacity-0 group-hover:opacity-100">Delete</button>
                  )}
                  <button onClick={() => { setActiveKeyProvider(activeKeyProvider === m.provider ? null : m.provider); setKeyInput(storedKeys[m.provider] ? '••••••••••••' : ''); }} className="text-[9px] font-bold text-[var(--clr-accent)] uppercase">{activeKeyProvider === m.provider ? 'Cancel' : 'Update'}</button>
                </div>
              </div>
              {activeKeyProvider === m.provider && (
                <div className="flex gap-2 animate-in slide-in-from-top-1">
                  <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder={m.placeholder} className="flex-1 px-3 py-2 rounded-lg text-xs border bg-transparent focus:outline-none focus:border-[var(--clr-accent)]" style={{ borderColor: UI_COLORS.BORDER }} />
                  <button onClick={() => handleSaveKey(m.provider)} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[var(--clr-accent)]">
                    {keyStatus === 'saving' ? '...' : 'Save'}
                  </button>
                </div>
              )}
              {keyStatus === 'success' && activeKeyProvider === m.provider && <p className="text-[10px] font-medium text-green-500 mt-2 px-1">Key successfully saved.</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-8 border-t" style={{ borderColor: UI_COLORS.BORDER }}>
        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-4 text-red-500 opacity-50">Danger Zone</h3>
        <div className="p-5 rounded-2xl border flex items-center justify-between gap-4" style={{ background: 'rgba(220, 38, 38, 0.02)', borderColor: 'rgba(220, 38, 38, 0.1)' }}>
          <div>
            <div className="text-sm font-bold text-red-500">Factory Reset</div>
            <p className="text-[10px] opacity-40">Wipe all settings & keys</p>
          </div>
          <button onClick={handleFactoryReset} className="px-4 py-2 rounded-lg bg-red-500 text-white text-[11px] font-bold">Reset All</button>
        </div>
      </div>
    </div>
  );
}
