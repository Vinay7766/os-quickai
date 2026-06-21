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

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, emit } from '@tauri-apps/api/event';
import { type } from '@tauri-apps/plugin-os';
import { useSettingsStore } from '../../../core/store/useSettingsStore';

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
  const [osName, setOsName] = useState<string>('');

  // Sandbox state
  const [pluginCode, setPluginCode] = useState("return `Hello from Quickno Plugin Engine! Input was: ${PluginInput.name}`;");
  const [pluginInput, setPluginInput] = useState('{ "name": "User" }');
  const [pluginOutput, setPluginOutput] = useState<string | null>(null);
  const [isRunningPlugin, setIsRunningPlugin] = useState(false);

  useEffect(() => {
    try {
      setOsName(type());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const { availableModels, ollamaModelSizes } = useSettingsStore();

  const installedModels = availableModels
    .filter(m => m.startsWith('ollama:'))
    .map(m => {
      const name = m.replace('ollama:', '');
      const sizeBytes = ollamaModelSizes[m] || 0;
      let sizeStr = 'UNKNOWN SIZE';
      if (sizeBytes > 0) {
        const sizeGB = sizeBytes / (1024 * 1024 * 1024);
        sizeStr = sizeGB >= 1 ? `${sizeGB.toFixed(1)} GB` : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
      }
      return { name, size: sizeStr };
    });

  const [pullProgress, setPullProgress] = useState<{ status: string, completed?: number, total?: number } | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setupListener = async () => {
      unlisten = await listen<{status: string, completed?: number, total?: number}>('ollama-pull-progress', (event) => {
        setPullProgress(event.payload);
      });
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  const handleCancelPull = async () => {
    await emit('cancel-ollama-pull');
    setIsPulling(false);
    setPullProgress(null);
  };

  const handlePullOllama = async () => {
    if (!ollamaPullInput) return;
    setIsPulling(true);
    setPullError(null);
    setPullProgress(null);
    try {
      await invoke('pull_ollama_model', { url: ollamaUrl, name: ollamaPullInput });
      setOllamaPullInput('');
      refreshModels();
    } catch (e) {
      const errStr = String(e);
      if (errStr.includes("cancelled")) {
        setPullError("Pull cancelled.");
      } else if (errStr.includes("file does not exist") || errStr.includes("not found")) {
        setPullError(`Model "${ollamaPullInput}" not found. Please check spelling.`);
      } else {
        try {
          const match = errStr.match(/\{.*\}/);
          if (match) {
            setPullError(JSON.parse(match[0]).error || errStr);
          } else {
            setPullError(errStr);
          }
        } catch {
          setPullError(errStr);
        }
      }
    } finally {
      setIsPulling(false);
      setPullProgress(null);
    }
  };

  const handleRunPlugin = async () => {
    setIsRunningPlugin(true);
    setPluginOutput(null);
    try {
      const parsedInput = JSON.parse(pluginInput);
      const res = await invoke<string>('run_plugin', { code: pluginCode, input: JSON.stringify(parsedInput) });
      setPluginOutput(res);
    } catch (e) {
      setPluginOutput(`Error: ${String(e)}`);
    } finally {
      setIsRunningPlugin(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold mb-1">Add Plugins</h2>
        <p className="text-sm opacity-60">Integrate local models via Ollama and other advanced features.</p>
      </div>

      <div className="space-y-6">
        {osName === 'linux' && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Terminal Mode</h3>
              <p className="text-[10px] opacity-40">Enable system command execution (Ctrl + 4)</p>
            </div>
            <button onClick={() => updateSetting('enableTerminalMode', !enableTerminalMode)} className={`w-11 h-6 rounded-full transition-all relative ${enableTerminalMode ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enableTerminalMode ? 'right-1' : 'left-1'}`} /></button>
          </div>
        )}

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
              {isPulling ? (
                <button 
                  onClick={handleCancelPull} 
                  className="px-8 py-3 rounded-xl text-sm font-bold text-red-500 bg-red-500/10 border border-red-500/20 shadow-lg transition-all hover:bg-red-500/20 active:scale-95" 
                >
                  Cancel
                </button>
              ) : (
                <button 
                  onClick={handlePullOllama} 
                  disabled={!ollamaPullInput} 
                  className="px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-50" 
                  style={{ background: 'var(--clr-accent)' }}
                >
                  Pull Model
                </button>
              )}
            </div>
            
            {pullProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
                  <span>{pullProgress.status}</span>
                  {pullProgress.total && pullProgress.completed && (
                    <span>{((pullProgress.completed / pullProgress.total) * 100).toFixed(1)}%</span>
                  )}
                </div>
                {pullProgress.total && pullProgress.completed && (
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--clr-accent)] transition-all duration-300" style={{ width: `${(pullProgress.completed / pullProgress.total) * 100}%` }} />
                  </div>
                )}
              </div>
            )}
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

      <div className="pt-6 mt-10 border-t space-y-6" style={{ borderColor: 'var(--clr-border)' }}>
        <div>
          <h2 className="text-xl font-bold mb-1">Developer Sandbox</h2>
          <p className="text-sm opacity-60">Test the secure Rust-embedded JavaScript engine (Boa).</p>
        </div>
        
        <div className="p-6 rounded-3xl border space-y-4" style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)' }}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Plugin Code (JS)</label>
            <textarea
              value={pluginCode}
              onChange={e => setPluginCode(e.target.value)}
              className="w-full h-32 px-5 py-3 rounded-xl text-xs font-mono border focus:outline-none transition-all focus:border-[var(--clr-accent)]"
              style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
              placeholder="Write your JS plugin here..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Test Input (JSON)</label>
            <input
              type="text"
              value={pluginInput}
              onChange={e => setPluginInput(e.target.value)}
              className="w-full px-5 py-3 rounded-xl text-sm font-mono border focus:outline-none transition-all focus:border-[var(--clr-accent)]"
              style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleRunPlugin}
              disabled={isRunningPlugin}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--clr-accent)' }}
            >
              {isRunningPlugin ? 'Running...' : 'Run Sandboxed Plugin'}
            </button>
          </div>

          {pluginOutput !== null && (
            <div className="mt-4 p-4 rounded-xl border font-mono text-xs overflow-auto max-h-40 animate-fade-in-up" 
                 style={{ background: 'black', borderColor: 'var(--clr-border)', color: pluginOutput.startsWith('Error') ? 'var(--clr-danger)' : 'var(--clr-success)' }}>
              {pluginOutput}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
