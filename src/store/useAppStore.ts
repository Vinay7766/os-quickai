import { create } from 'zustand';
import { queryLlm, getApiKey } from '../lib/tauriCommands';
import { useSettingsStore } from './useSettingsStore';

interface AppState {
  query: string;
  answer: string;
  isLoading: boolean;
  error: string | null;
  setQuery: (q: string) => void;
  submitQuery: () => Promise<void>;
  clearAnswer: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  query: '',
  answer: '',
  isLoading: false,
  error: null,
  setQuery: (q: string) => set({ query: q }),
  clearAnswer: () => set({ answer: '', query: '', error: null }),
  submitQuery: async () => {
    const { query } = get();
    if (!query.trim()) return;

    set({ isLoading: true, error: null, answer: '' });
    try {
      const apiKey = await getApiKey();
      const llmModel = useSettingsStore.getState().llmModel;
      const isFree = ['minimax-2.5', 'qwen-3.6', 'nemotron'].includes(llmModel);

      if (!isFree && !apiKey) throw new Error("API Key not found. Please set it in Settings.");
      
      const answer = await queryLlm(query, llmModel, apiKey || "");
      set({ answer, isLoading: false, error: null });
    } catch (e: any) {
      set({ error: e.toString(), isLoading: false });
    }
  }
}));
