import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface VoiceHistorySession {
  id: string;
  date: string;
  messages: { role: string; content: string }[];
}

export default function HistorySection() {
  const [voiceHistory, setVoiceHistory] = useState<VoiceHistorySession[]>([]);
  const [textHistory, setTextHistory] = useState<VoiceHistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const vData = await invoke<any>('get_setting', { key: 'voiceHistory' });
      if (Array.isArray(vData)) {
        setVoiceHistory(vData.reverse());
      } else if (typeof vData === 'string') {
        setVoiceHistory(JSON.parse(vData).reverse());
      }
      
      const tData = await invoke<any>('get_setting', { key: 'textHistory' });
      if (Array.isArray(tData)) {
        setTextHistory(tData.reverse());
      } else if (typeof tData === 'string') {
        setTextHistory(JSON.parse(tData).reverse());
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (id: string, type: 'text' | 'voice') => {
    if (type === 'voice') {
      const updated = voiceHistory.filter(s => s.id !== id);
      setVoiceHistory(updated);
      await invoke('save_setting', { key: 'voiceHistory', value: updated.slice().reverse() });
    } else {
      const updated = textHistory.filter(s => s.id !== id);
      setTextHistory(updated);
      await invoke('save_setting', { key: 'textHistory', value: updated.slice().reverse() });
    }
  };

  const deleteAll = async (type: 'text' | 'voice') => {
    if (!confirm(`Are you sure you want to permanently delete all ${type} history?`)) return;
    if (type === 'voice') {
      setVoiceHistory([]);
      await invoke('save_setting', { key: 'voiceHistory', value: [] });
    } else {
      setTextHistory([]);
      await invoke('save_setting', { key: 'textHistory', value: [] });
    }
  };

  const currentData = activeTab === 'text' ? textHistory : voiceHistory;

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">History</h2>
          <p className="text-sm opacity-60">Review and manage your past conversations.</p>
        </div>
        {currentData.length > 0 && (
          <button 
            onClick={() => deleteAll(activeTab)}
            className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex border-b border-white/10">
        <button 
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'text' ? 'border-[var(--clr-accent)] text-[var(--clr-accent)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
        >
          Text History
        </button>
        <button 
          onClick={() => setActiveTab('voice')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'voice' ? 'border-[var(--clr-accent)] text-[var(--clr-accent)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
        >
          Voice History
        </button>
      </div>

      {isLoading ? (
        <div className="opacity-50 text-sm">Loading history...</div>
      ) : currentData.length === 0 ? (
        <div className="p-10 border border-dashed rounded-2xl flex flex-col items-center justify-center opacity-40" style={{ borderColor: 'var(--clr-border)' }}>
          <p className="text-sm font-semibold">No {activeTab} history found.</p>
          <p className="text-xs mt-1">Conversations will appear here if you use {activeTab === 'voice' ? 'Voice Mode' : 'Quickno'}.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {currentData.map((session) => (
            <div key={session.id} className="p-6 rounded-2xl border space-y-4 relative group transition-all" style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)' }}>
              <button 
                onClick={() => deleteSession(session.id, activeTab)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-500 hover:text-white"
                title="Delete Session"
              >
                ✕
              </button>
              
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                {new Date(session.date).toLocaleString()}
              </div>
              
              <div className="space-y-3">
                {session.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-[var(--clr-accent)] text-white' : 'bg-black/10 dark:bg-white/10'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
