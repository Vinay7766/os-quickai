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
  enableTerminalMode: boolean;
  updateSetting: (key: string, val: any) => void;
  refreshModels: () => void;
}

export default function PluginSection({
  ollamaEnabled, ollamaUrl, enableTerminalMode, updateSetting, refreshModels
}: Props) {
  const [ollamaPullInput, setOllamaPullInput] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);

  // Mocked installed models to match screenshot visual
  const installedModels = [
    { name: 'qwen3:0.6b', size: '498.4 MB' }
  ];

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
        <h2 className="text-2xl font-bold mb-1">Add Plugins</h2>
        <p className="text-sm opacity-60">Integrate local models via Ollama and other advanced features.</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Terminal Mode</h3>
            <p className="text-[10px] opacity-40">Enable system command execution (Ctrl + 4)</p>
          </div>
          <button onClick={() => updateSetting('enableTerminalMode', !enableTerminalMode)} className={`w-11 h-6 rounded-full transition-all relative ${enableTerminalMode ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enableTerminalMode ? 'right-1' : 'left-1'}`} /></button>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Local AI (Ollama)</h3>
          <button onClick={() => updateSetting('ollamaEnabled', !ollamaEnabled)} className={`w-11 h-6 rounded-full transition-all relative ${ollamaEnabled ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${ollamaEnabled ? 'right-1' : 'left-1'}`} /></button>
        </div>

        {ollamaEnabled && (
          <div className="p-8 rounded-3xl border space-y-6 animate-in fade-in slide-in-from-top-2" style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)' }}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Ollama Service URL</label>
              <input 
                type="text" 
                value={ollamaUrl} 
                onChange={e => updateSetting('ollamaUrl', e.target.value)} 
                placeholder="localhost:11434" 
                className="w-full px-5 py-3 rounded-xl text-sm border focus:outline-none transition-all focus:border-[var(--clr-accent)]" 
                style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }} 
              />
              <p className="text-[10px] opacity-40 px-1">Ensure Ollama is running. Use <code className="opacity-100">127.0.0.1:11434</code> if <code className="opacity-100">localhost</code> fails.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <input 
                type="text" 
                value={ollamaPullInput} 
                onChange={e => setOllamaPullInput(e.target.value)} 
                placeholder="Pull new model (e.g. deepseek-r1)" 
                className="flex-1 px-5 py-3 rounded-xl text-sm border focus:outline-none transition-all focus:border-[var(--clr-accent)]" 
                style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }} 
              />
              <button 
                onClick={handlePullOllama} 
                disabled={isPulling || !ollamaPullInput} 
                className="px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-50" 
                style={{ background: 'var(--clr-accent)' }}
              >
                {isPulling ? 'Pulling...' : 'Pull Model'}
              </button>
            </div>
            {pullError && <p className="text-[10px] text-[var(--clr-danger)] font-bold text-center">{pullError}</p>}
            
            <div className="pt-6 border-t space-y-4" style={{ borderColor: 'var(--clr-border)' }}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Installed Models</h4>
              <div className="space-y-2">
                {installedModels.map(m => (
                  <div key={m.name} className="flex items-center justify-between p-4 rounded-xl border group hover:bg-white/5 transition-all" style={{ background: 'rgba(0,0,0,0.1)', borderColor: 'var(--clr-border)' }}>
                    <span className="text-sm font-bold">{m.name}</span>
                    <span className="text-[10px] opacity-40">{m.size}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
