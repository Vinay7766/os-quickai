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

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { API_MODELS } from '../../../core/constants';
import { factoryReset } from '../../../core/lib/tauriCommands';
import { useSettingsStore } from '../../../core/store/useSettingsStore';

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
  customProviders: any[];
  refreshModels: () => void;
}

export default function AIModelSection({
  llmModel, availableModels, storedKeys, activeKeyProvider,
  keyInput, keyStatus, isRefreshingModels,
  setKeyInput, setActiveKeyProvider, handleSaveKey, handleDeleteKey, handleResetAllKeys, handleRefresh, updateSetting,
  customProviders, refreshModels
}: Props) {
  const { ollamaModelSizes } = useSettingsStore();
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustom, setNewCustom] = useState({ name: '', baseUrl: '', apiKey: '' });
  const [selectedKeyProvider, setSelectedKeyProvider] = useState(API_MODELS[0].provider);

  const handleAddCustom = async () => {
    if (!newCustom.name || !newCustom.baseUrl) return;
    const provider = { ...newCustom, id: Date.now().toString() };
    const updated = [...customProviders, provider];
    await updateSetting('customProviders', updated);
    await invoke('save_setting', { key: 'customProviders', value: JSON.stringify(updated) });
    setNewCustom({ name: '', baseUrl: '', apiKey: '' });
    setShowAddCustom(false);
    refreshModels();
  };

  const handleRemoveCustom = async (id: string) => {
    const updated = customProviders.filter(p => p.id !== id);
    await updateSetting('customProviders', updated);
    await invoke('save_setting', { key: 'customProviders', value: JSON.stringify(updated) });
    refreshModels();
  };

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
            <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-35">Select Model</h4>
            <div className="relative">
              <select 
                value={llmModel} 
                onChange={(e) => updateSetting('llmModel', e.target.value)} 
                className="w-full px-5 py-4 rounded-2xl text-[14px] font-bold text-white bg-black/40 border border-white/10 outline-none focus:border-[var(--clr-accent)] appearance-none cursor-pointer pr-10"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
                <option value="free-model" className="bg-[#1c1c1c] text-white">Free Model (No API Key Required)</option>
                {API_MODELS.map((m: any) => (
                  <option key={m.value} value={m.value} className="bg-[#1c1c1c] text-white">
                    {m.label} (BYOK)
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-20">Custom Providers</span>
              <button 
                onClick={() => setShowAddCustom(!showAddCustom)} 
                className="text-[10px] font-bold uppercase tracking-widest text-[var(--clr-accent)] hover:underline"
              >
                {showAddCustom ? 'Cancel' : '+ Add New'}
              </button>
            </div>

            {showAddCustom && (
              <div className="p-5 rounded-2xl border border-white/5 space-y-3 bg-black/20 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    value={newCustom.name} 
                    onChange={e => setNewCustom({ ...newCustom, name: e.target.value })} 
                    placeholder="Friendly Name" 
                    className="w-full px-3 py-2 rounded-xl text-xs border bg-black/40 border-white/10 outline-none focus:border-[var(--clr-accent)] text-white placeholder-white/20" 
                  />
                  <input 
                    type="text" 
                    value={newCustom.baseUrl} 
                    onChange={e => setNewCustom({ ...newCustom, baseUrl: e.target.value })} 
                    placeholder="Base URL (e.g. https://api.openai.com/v1)" 
                    className="w-full px-3 py-2 rounded-xl text-xs border bg-black/40 border-white/10 outline-none focus:border-[var(--clr-accent)] text-white placeholder-white/20" 
                  />
                </div>
                <input 
                  type="password" 
                  value={newCustom.apiKey} 
                  onChange={e => setNewCustom({ ...newCustom, apiKey: e.target.value })} 
                  placeholder="API Key (optional)" 
                  className="w-full px-3 py-2 rounded-xl text-xs border bg-black/40 border-white/10 outline-none focus:border-[var(--clr-accent)] text-white placeholder-white/20" 
                />
                <button 
                  onClick={handleAddCustom} 
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-[var(--clr-accent)] hover:brightness-110 active:scale-[0.98]"
                >
                  Connect & Discover Models
                </button>
              </div>
            )}

            {customProviders && customProviders.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {customProviders.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01] group hover:bg-white/[0.03] transition-all">
                    <div>
                      <div className="text-xs font-bold text-white">{p.name}</div>
                      <div className="text-[9px] opacity-35 font-mono truncate max-w-[200px] text-white">{p.baseUrl}</div>
                    </div>
                    <button 
                      onClick={() => handleRemoveCustom(p.id)} 
                      className="text-[9px] font-bold uppercase tracking-wider text-red-500/50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          <div className="space-y-3">
            <h4 className="text-[9px] font-bold uppercase tracking-widest opacity-35">Select Provider</h4>
            <div className="relative">
              <select 
                value={selectedKeyProvider} 
                onChange={(e) => { setSelectedKeyProvider(e.target.value); setActiveKeyProvider(null); setKeyInput(''); }} 
                className="w-full px-5 py-4 rounded-2xl text-[14px] font-bold text-white bg-black/40 border border-white/10 outline-none focus:border-[var(--clr-accent)] appearance-none cursor-pointer pr-10"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
                {API_MODELS.map((m: any) => (
                  <option key={m.provider} value={m.provider} className="bg-[#1c1c1c] text-white">{m.label} Keys</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>
          </div>

          {(() => {
            const m = API_MODELS.find((p: any) => p.provider === selectedKeyProvider);
            if (!m) return null;
            const isConfigured = storedKeys[m.provider];
            const isInputActive = activeKeyProvider === m.provider;

            return (
              <div className="p-5 rounded-2xl border border-white/5 space-y-4 bg-white/[0.01] animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-bold text-white tracking-tight">{m.label}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isConfigured ? 'text-[var(--clr-accent)]' : 'text-white/10'}`}>
                      {isConfigured ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {isConfigured && (
                      <button 
                        onClick={() => handleDeleteKey(m.provider)} 
                        className="text-[9px] font-bold uppercase tracking-wider text-red-500/50 hover:text-red-500 transition-all active:scale-95"
                      >
                        Delete Key
                      </button>
                    )}
                    <button 
                      onClick={() => { setActiveKeyProvider(isInputActive ? null : m.provider); setKeyInput(''); }}
                      className="text-[10px] font-bold uppercase tracking-widest text-[var(--clr-accent)] hover:underline active:scale-95 transition-all"
                    >
                      {isInputActive ? 'Cancel' : (isConfigured ? 'Update' : 'Add Key')}
                    </button>
                  </div>
                </div>
                {isInputActive && (
                  <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                    <input 
                      type="password" 
                      value={keyInput} 
                      onChange={e => setKeyInput(e.target.value)} 
                      placeholder={m.placeholder ? `Enter key (e.g. ${m.placeholder})` : `Enter ${m.label} Key`} 
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs border bg-black/40 border-white/10 outline-none focus:border-[var(--clr-accent)] text-white placeholder-white/20" 
                    />
                    <button 
                      onClick={() => handleSaveKey(m.provider)} 
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--clr-accent)] text-white disabled:opacity-50 transition-all hover:brightness-110 active:scale-95" 
                      disabled={keyStatus === 'saving'}
                    >
                      {keyStatus === 'saving' ? '...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
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
            {availableModels.filter(m => m.startsWith('ollama:')).length > 0 ? availableModels.filter(m => m.startsWith('ollama:')).map(m => (
              <button 
                key={m} 
                onClick={() => updateSetting('llmModel', m)} 
                className="w-full flex items-center justify-between p-3.5 rounded-xl transition-all hover:bg-white/5 active:scale-[0.99]"
                style={{ background: llmModel === m ? 'rgba(37,99,235,0.08)' : 'transparent' }}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[14px] ${llmModel === m ? 'font-bold text-[var(--clr-accent)]' : 'text-white/70'}`}>
                    {m.replace('ollama:', '')}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/20 uppercase tracking-tight">Local</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-white/10">
                  <span>{(() => {
                    const sizeBytes = ollamaModelSizes ? ollamaModelSizes[m] || 0 : 0;
                    if (sizeBytes === 0) return 'UNKNOWN SIZE';
                    const sizeGB = sizeBytes / (1024 * 1024 * 1024);
                    if (sizeGB >= 1) return `${sizeGB.toFixed(1)} GB`;
                    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
                  })()}</span>
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
