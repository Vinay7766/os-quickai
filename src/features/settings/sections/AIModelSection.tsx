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

import { API_MODELS } from '../Settings';
import { factoryReset } from '../../../core/lib/tauriCommands';

interface Props {
  llmModel: string;
  availableModels: string[];
  storedKeys: Record<string, boolean>;
  activeKeyProvider: string | null;
  keyInput: string;
  keyStatus: string;
  isRefreshingModels: boolean;
  setKeyInput: (val: string) => void;
  setActiveKeyProvider: (val: string | null) => void;
  handleSaveKey: (provider?: string) => void;
  handleDeleteKey: (provider?: string) => void;
  handleResetAllKeys: () => void;
  handleRefresh: () => void;
  updateSetting: (key: string, val: any) => void;
}

export default function AIModelSection({
  llmModel, availableModels, storedKeys, activeKeyProvider,
  keyInput, keyStatus, isRefreshingModels,
  setKeyInput, setActiveKeyProvider, handleSaveKey, handleDeleteKey, handleResetAllKeys, handleRefresh, updateSetting
}: Props) {

  const onFactoryReset = async () => {
    if (confirm("FACTORY RESET: This will wipe ALL settings, API keys, and registry markers. The app will close and you must restart it manually. Continue?")) {
      await factoryReset();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <div>
        <h2 className="text-2xl font-bold mb-1 tracking-tight">AI Models & APIs</h2>
        <p className="text-sm text-white/50 font-medium">Select Your own model by BYOK</p>
      </div>

      {/* Main Model Selection Card */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 px-1">Model Selection</h3>
        <div className="p-6 rounded-[28px] border border-white/5 space-y-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="space-y-3">
            <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-30">Free Models (No API Key)</h4>
            <button 
              onClick={() => updateSetting('llmModel', 'free-model')} 
              className="w-full flex items-center justify-between p-4 rounded-xl transition-all hover:bg-white/5 active:scale-[0.99] group"
              style={{ background: llmModel === 'free-model' ? 'rgba(37,99,235,0.1)' : 'transparent' }}
            >
              <span className={`text-[14px] ${llmModel === 'free-model' ? 'font-bold text-[var(--clr-accent)]' : 'text-white/70'}`}>Free Model</span>
              {llmModel === 'free-model' && <div className="w-1.5 h-1.5 rounded-full bg-[var(--clr-accent)] shadow-[0_0_8px_var(--clr-accent)]" />}
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-30">BYOK Models</h4>
            <div className="grid gap-1.5">
              {API_MODELS.map(m => {
                const isActive = llmModel.startsWith(m.value) || (availableModels.includes(llmModel) && m.provider === activeKeyProvider);
                return (
                  <button 
                    key={m.value} 
                    onClick={() => updateSetting('llmModel', m.value)} 
                    className="w-full flex items-center justify-between p-4 rounded-xl transition-all hover:bg-white/5 active:scale-[0.99] group"
                    style={{ background: isActive ? 'rgba(37,99,235,0.1)' : 'transparent' }}
                  >
                    <span className={`text-[14px] ${isActive ? 'font-bold text-[var(--clr-accent)]' : 'text-white/70'}`}>{m.label}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[var(--clr-accent)] shadow-[0_0_8px_var(--clr-accent)]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-20">Custom Providers</span>
            <button className="text-[10px] font-bold uppercase tracking-widest text-[var(--clr-accent)] hover:underline">+ Add New</button>
          </div>
        </div>
      </div>

      {/* API Key Manager Card */}
      <div className="p-8 rounded-[28px] border border-white/5 space-y-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div>
          <h4 className="text-lg font-bold mb-0.5 tracking-tight">API Key Manager</h4>
          <p className="text-[11px] opacity-40 font-medium">Stored securely in Windows Credential Manager.</p>
        </div>
        <div className="space-y-5">
          {API_MODELS.map(m => (
            <div key={m.provider} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-white tracking-tight">{m.label}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${storedKeys[m.provider] ? 'text-[var(--clr-accent)]' : 'text-white/10'}`}>
                    {storedKeys[m.provider] ? 'Connected' : 'Not Configured'}
                  </span>
                </div>
                <div className="flex items-center gap-5">
                  {storedKeys[m.provider] && (
                    <button onClick={() => handleDeleteKey(m.provider)} className="text-[9px] font-bold uppercase tracking-wider text-red-500/30 hover:text-red-500 transition-all">Delete</button>
                  )}
                  <button 
                    onClick={() => { setActiveKeyProvider(activeKeyProvider === m.provider ? null : m.provider); setKeyInput(''); }}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--clr-accent)] hover:underline active:scale-95 transition-all"
                  >
                    {storedKeys[m.provider] ? 'Update' : 'Add Key'}
                  </button>
                </div>
              </div>
              {activeKeyProvider === m.provider && (
                <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                  <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder={`Enter ${m.label} Key`} className="flex-1 px-4 py-2.5 rounded-xl text-xs border bg-black/40 border-white/10 outline-none focus:border-[var(--clr-accent)]" />
                  <button onClick={() => handleSaveKey(m.provider)} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--clr-accent)] text-white disabled:opacity-50 transition-all" disabled={keyStatus === 'saving'}>
                    {keyStatus === 'saving' ? '...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ollama Model Selection Card */}
      <div className="p-8 rounded-[28px] border border-white/5 space-y-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold tracking-tight">Model Selection</h4>
          <button onClick={handleRefresh} className="text-[10px] font-bold uppercase tracking-widest text-[var(--clr-accent)] hover:underline transition-all disabled:opacity-50" disabled={isRefreshingModels}>
            Refresh List
          </button>
        </div>
        <div className="space-y-4">
          <h3 className="text-[9px] font-bold uppercase tracking-widest opacity-20">Ollama (Local)</h3>
          <div className="p-2 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            {availableModels.length > 0 ? availableModels.map(m => (
              <button 
                key={m} 
                onClick={() => updateSetting('llmModel', m)} 
                className="w-full flex items-center justify-between p-3.5 rounded-xl transition-all hover:bg-white/5 active:scale-[0.99]"
                style={{ background: llmModel === m ? 'rgba(37,99,235,0.08)' : 'transparent' }}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[14px] ${llmModel === m ? 'font-bold text-[var(--clr-accent)]' : 'text-white/70'}`}>
                    {m.split('/').pop()?.replace('models/', '') || m}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/20 uppercase tracking-tight">Local</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-white/10">
                  <span>498.4 MB</span>
                  {llmModel === m && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-[var(--clr-accent)]"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
              </button>
            )) : (
              <div className="p-8 text-center opacity-10 text-[11px] font-bold uppercase tracking-widest">No local models</div>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance & Reset */}
      <div className="pt-4 space-y-5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 px-1">Maintenance & Reset</h3>
        <div className="grid grid-cols-2 gap-5">
          <button 
            onClick={handleResetAllKeys} 
            className="flex flex-col items-center justify-center p-8 rounded-[28px] border border-white/5 transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] hover:border-red-500/20 group relative overflow-hidden" 
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="absolute inset-0 bg-red-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h4 className="font-bold text-red-500 text-lg mb-0.5 tracking-tight">Delete API Keys</h4>
            <p className="text-[11px] text-white/30 font-medium">Wipe stored credentials</p>
          </button>

          <button 
            onClick={onFactoryReset} 
            className="flex flex-col items-center justify-center p-8 rounded-[28px] border border-white/5 transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] hover:border-orange-500/20 group relative overflow-hidden" 
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="absolute inset-0 bg-orange-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h4 className="font-bold text-orange-500 text-lg mb-0.5 tracking-tight">Factory Reset</h4>
            <p className="text-[11px] text-white/30 font-medium">Reset all app information</p>
          </button>
        </div>
      </div>
    </div>
  );
}
