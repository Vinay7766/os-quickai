import { useState } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { Search, Copy, ExternalLink, Check } from 'lucide-react';
import { useAppStore } from '../../core/store/useAppStore';
import { useSettingsStore } from '../../core/store/useSettingsStore';
import { searchInBrowser } from '../../core/lib/tauriCommands';

export function ActionButtons() {
  const [copied, setCopied] = useState(false);
  const { query, answer } = useAppStore();
  const { searchEngine, llmSite, browser } = useSettingsStore();

  const handleCopy = async () => {
    await writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSearch = async () => {
    const q = encodeURIComponent(query);
    let url = `https://www.google.com/search?q=${q}`;
    if (searchEngine === 'bing') url = `https://www.bing.com/search?q=${q}`;
    if (searchEngine === 'perplexity') url = `https://www.perplexity.ai/?q=${q}`;
    
    try {
      await searchInBrowser(browser || 'chrome', url);
    } catch (e) {
      alert(e as string);
    }
  };

  const handleAI = async () => {
    let url = `https://chatgpt.com`;
    if (llmSite === 'claude') url = `https://claude.ai/`;
    if (llmSite === 'gemini') url = `https://gemini.google.com/`;
    if (llmSite === 'perplexity') url = `https://www.perplexity.ai/`;
    await open(url);
  };

  return (
    <div className="flex gap-2 px-4 py-3 shrink-0">
      <button 
        onClick={handleSearch}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-md text-xs transition-colors"
      >
        <Search size={14} /> Web Search
      </button>
      
      <button 
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-md text-xs transition-colors"
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        {copied ? "Copied!" : "Copy"}
      </button>

      <div className="flex-1" />

      <button 
        onClick={handleAI}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-md text-xs transition-colors"
      >
        Open in AI <ExternalLink size={14} />
      </button>
    </div>
  );
}
