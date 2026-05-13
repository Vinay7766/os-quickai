import { useState } from 'react';
import { UI_COLORS } from '../../../constants/appConstants';
import { invoke } from '@tauri-apps/api/core';

interface PluginsSectionProps {
  customProviders: any[];
  ollamaEnabled: boolean;
  ollamaUrl: string;
  onSettingChange: (key: string, value: any) => void;
  onAddCustom: (provider: any) => void;
  onDeleteCustom: (id: string) => void;
  refreshModels: () => Promise<void>;
}

/**
 * @component PluginsSection
 * @description Restored full Ollama and Custom Provider management logic.
 */
export function PluginsSection({ 
  customProviders, ollamaEnabled, ollamaUrl, 
  onSettingChange, onAddCustom, onDeleteCustom, refreshModels 
}: PluginsSectionProps) {
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustom, setNewCustom] = useState({ name: '', baseUrl: '', apiKey: '' });
  const [ollamaPullInput, setOllamaPullInput] = useState('');
  const [isPulling, setIsPulling] = useState(false);

  const handlePullOllama = async () => {
    if (!ollamaPullInput) return;
    setIsPulling(true);
    try {
      await invoke('pull_ollama_model', { url: ollamaUrl, name: ollamaPullInput });
      setOllamaPullInput('');
      await refreshModels();
    } catch (e) {
      alert(`Pull failed: ${e}`);
    } finally {
      setIsPulling(false);
    }
  };

  const handleAddCustom = () => {
    if (!newCustom.name || !newCustom.baseUrl) return;
    onAddCustom({ ...newCustom, id: `custom-${Date.now()}` });
    setNewCustom({ name: '', baseUrl: '', apiKey: '' });
    setShowAddCustom(false);
  };

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold mb-1">Add Plugins</h2>
        <p className="text-sm" style={{ color: UI_COLORS.TEXT_SECONDARY }}>Integrate local models via Ollama or connect custom providers.</p>
      </div>

      {/* Ollama Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50">Local AI (Ollama)</h3>
          <button
            onClick={() => onSettingChange('ollamaEnabled', !ollamaEnabled)}
            className={`w-10 h-5 rounded-full transition-all relative ${ollamaEnabled ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${ollamaEnabled ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
        {ollamaEnabled && (
          <div className="p-6 rounded-2xl border space-y-4" style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={ollamaPullInput}
                onChange={e => setOllamaPullInput(e.target.value)}
                placeholder="Model name (e.g. llama3)"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none focus:border-[var(--clr-accent)]"
                style={{ borderColor: UI_COLORS.BORDER }}
              />
              <button
                onClick={handlePullOllama}
                disabled={isPulling || !ollamaPullInput}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[var(--clr-accent)] disabled:opacity-50"
              >
                {isPulling ? 'Pulling...' : 'Pull'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Providers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50">Custom Providers</h3>
          <button onClick={() => setShowAddCustom(!showAddCustom)} className="text-[10px] font-bold uppercase text-[var(--clr-accent)] hover:underline">
            {showAddCustom ? 'Cancel' : '+ Add Provider'}
          </button>
        </div>
        
        {showAddCustom && (
          <div className="p-6 rounded-2xl border space-y-4 shadow-xl" style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={newCustom.name} onChange={e => setNewCustom({...newCustom, name: e.target.value})} placeholder="Name" className="px-4 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none" style={{ borderColor: UI_COLORS.BORDER }} />
              <input type="text" value={newCustom.baseUrl} onChange={e => setNewCustom({...newCustom, baseUrl: e.target.value})} placeholder="Base URL" className="px-4 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none" style={{ borderColor: UI_COLORS.BORDER }} />
            </div>
            <input type="password" value={newCustom.apiKey} onChange={e => setNewCustom({...newCustom, apiKey: e.target.value})} placeholder="API Key" className="w-full px-4 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none" style={{ borderColor: UI_COLORS.BORDER }} />
            <button onClick={handleAddCustom} className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[var(--clr-accent)]">Add Provider</button>
          </div>
        )}

        <div className="space-y-2">
          {customProviders.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border group" style={{ background: UI_COLORS.INPUT_BG, borderColor: UI_COLORS.BORDER }}>
              <div>
                <div className="text-sm font-bold">{p.name}</div>
                <div className="text-[10px] opacity-40">{p.baseUrl}</div>
              </div>
              <button onClick={() => onDeleteCustom(p.id)} className="text-[9px] font-bold text-red-500 uppercase opacity-0 group-hover:opacity-100 hover:underline">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
