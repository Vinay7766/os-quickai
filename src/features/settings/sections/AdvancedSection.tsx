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

interface Props {
  ollamaEnabled: boolean;
  ollamaUrl: string;
  customProviders: any[];
  updateSetting: (key: string, val: any) => void;
  refreshModels: () => void;
}

export default function AdvancedSection({
  ollamaEnabled, ollamaUrl, customProviders, updateSetting, refreshModels
}: Props) {
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustom, setNewCustom] = useState({ name: '', baseUrl: '', apiKey: '' });
  const [ollamaPullInput, setOllamaPullInput] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);

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

  const handlePullOllama = async () => {
    if (!ollamaPullInput) return;
    setIsPulling(true);
    setPullError(null);
    try {
      await invoke('pull_ollama_model', { url: ollamaUrl, name: ollamaPullInput });
      setOllamaPullInput('');
      refreshModels();
    } catch (e) {
      setPullError(String(e));
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold mb-1">Advanced AI Sources</h2>
        <p className="text-sm" style={{ color: 'var(--clr-text-secondary)' }}>Integrate local models via Ollama or connect any OpenAI-compatible provider.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-tertiary)' }}>Local AI (Ollama)</h3>
          <button onClick={() => updateSetting('ollamaEnabled', !ollamaEnabled)} className={`w-10 h-5 rounded-full transition-all relative ${ollamaEnabled ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}>
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${ollamaEnabled ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
        {ollamaEnabled && (
          <div className="p-6 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}>
            <div className="flex gap-2">
              <input type="text" value={ollamaPullInput} onChange={e => setOllamaPullInput(e.target.value)} placeholder="Enter model name (e.g. deepseek-r1)" className="flex-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none" style={{ background: 'var(--clr-surface)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }} />
              <button onClick={handlePullOllama} disabled={isPulling || !ollamaPullInput} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:brightness-110" style={{ background: 'var(--clr-accent)' }}>{isPulling ? 'Pulling...' : 'Pull Model'}</button>
            </div>
            {pullError && <p className="text-[10px] text-[var(--clr-danger)] font-bold">{pullError}</p>}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--clr-text-tertiary)' }}>Custom Providers (BYOK)</h3>
          <button onClick={() => setShowAddCustom(!showAddCustom)} className="text-[10px] font-bold uppercase tracking-widest text-[var(--clr-accent)] hover:underline">{showAddCustom ? 'Cancel' : '+ Add Provider'}</button>
        </div>
        {showAddCustom && (
          <div className="p-6 rounded-2xl border space-y-4 animate-in fade-in" style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={newCustom.name} onChange={e => setNewCustom({ ...newCustom, name: e.target.value })} placeholder="Friendly Name" className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none" style={{ background: 'var(--clr-surface)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }} />
              <input type="text" value={newCustom.baseUrl} onChange={e => setNewCustom({ ...newCustom, baseUrl: e.target.value })} placeholder="Base URL" className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none" style={{ background: 'var(--clr-surface)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }} />
            </div>
            <input type="password" value={newCustom.apiKey} onChange={e => setNewCustom({ ...newCustom, apiKey: e.target.value })} placeholder="API Key" className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none" style={{ background: 'var(--clr-surface)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }} />
            <button onClick={handleAddCustom} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: 'var(--clr-accent)' }}>Connect & Discover Models</button>
          </div>
        )}
        <div className="space-y-2">
          {customProviders.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border group hover:bg-white/5" style={{ background: 'var(--clr-input-bg)', borderColor: 'var(--clr-border)' }}>
              <div><div className="text-sm font-bold">{p.name}</div><div className="text-[10px] opacity-40 font-mono truncate max-w-[200px]">{p.baseUrl}</div></div>
              <button onClick={() => handleRemoveCustom(p.id)} className="text-[9px] font-bold uppercase tracking-widest text-[var(--clr-danger)] opacity-0 group-hover:opacity-100 hover:underline">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
