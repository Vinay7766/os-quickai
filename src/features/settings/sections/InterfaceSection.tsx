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

import { BROWSERS, AI_SITES, SEARCH_ENGINES } from '../../../core/constants';

interface Props {
  theme: string;
  browser: string;
  llmSite: string;
  searchEngine: string;
  customSearchUrl: string;
  enableSiteLauncher: boolean;
  enableAppLauncher: boolean;
  openLinksInternal: boolean;
  updateSetting: (key: string, val: any) => void;
  handleBrowserChange: (val: string) => void;
}

export default function InterfaceSection({
  theme, browser, llmSite, searchEngine, customSearchUrl, enableSiteLauncher, enableAppLauncher, openLinksInternal,
  updateSetting, handleBrowserChange
}: Props) {
  return (
    <div className="space-y-10 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold mb-1">Interface & Navigation</h2>
        <p className="text-sm opacity-60">Customize the look and web interaction behavior.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Theme Mode</h3>
        <div className="grid grid-cols-3 gap-3 p-1.5 rounded-2xl border" style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)' }}>
          {['Light', 'Dark', 'System'].map(t => {
            const val = t.toLowerCase();
            return (
              <button 
                key={val} 
                onClick={() => updateSetting('theme', val)} 
                className="px-4 py-3 rounded-xl text-sm font-semibold transition-all border border-transparent" 
                style={{ 
                  background: theme === val ? 'rgba(0,0,0,0.1)' : 'transparent', 
                  borderColor: theme === val ? 'var(--clr-accent)' : 'transparent', 
                  color: theme === val ? 'var(--clr-accent)' : 'var(--clr-text-secondary)',
                  boxShadow: theme === val ? '0 0 0 1px var(--clr-accent)' : 'none'
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Default Browser</h3>
        </div>
        <div className="relative">
          <select 
            value={browser} 
            onChange={e => handleBrowserChange(e.target.value)} 
            className="w-full px-5 py-4 rounded-2xl text-sm font-semibold border cursor-pointer appearance-none outline-none transition-all focus:border-[var(--clr-accent)] pr-12" 
            style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
          >
            {BROWSERS.map((b: any) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        <p className="text-[11px] opacity-40 mt-1">Automatically use your OS-level browser preference.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Preferred Search Engine</h3>
        </div>
        <div className="relative">
          <select 
            value={searchEngine} 
            onChange={e => updateSetting('searchEngine', e.target.value)} 
            className="w-full px-5 py-4 rounded-2xl text-sm font-semibold border cursor-pointer appearance-none outline-none transition-all focus:border-[var(--clr-accent)] pr-12" 
            style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
          >
            {SEARCH_ENGINES.map((se: any) => <option key={se.value} value={se.value}>{se.label}</option>)}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        
        {searchEngine === 'custom' && (
          <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
            <input 
              type="text" 
              value={customSearchUrl} 
              onChange={e => updateSetting('customSearchUrl', e.target.value)} 
              placeholder="e.g. https://search.brave.com/search?q={query}" 
              className="w-full px-5 py-3.5 rounded-2xl text-xs border outline-none focus:border-[var(--clr-accent)] placeholder-white/20" 
              style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
            />
            <p className="text-[10px] opacity-45 px-1 font-medium">Use <code>{`{query}`}</code> in the URL where the search terms should go.</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Preferred AI Site</h3>
        </div>
        <div className="relative">
          <select 
            value={llmSite} 
            onChange={e => updateSetting('llmSite', e.target.value)} 
            className="w-full px-5 py-4 rounded-2xl text-sm font-semibold border cursor-pointer appearance-none outline-none transition-all focus:border-[var(--clr-accent)] pr-12" 
            style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)', color: 'var(--clr-text)' }}
          >
            {AI_SITES.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        <p className="text-[11px] opacity-40 mt-2">This site will open when you click the "AI Search" button in the overlay.</p>
      </div>

      <div className="pt-8 border-t space-y-6" style={{ borderColor: 'var(--clr-border)' }}>
        <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">Feature Toggles</h3>
        <div className="space-y-3">
          {[
            { id: 'enableSiteLauncher', label: 'Site Launcher', sub: 'Open URLs directly from the search bar.', state: enableSiteLauncher },
            { id: 'enableAppLauncher', label: 'App Launcher', sub: 'Launch Windows apps by typing their name.', state: enableAppLauncher },
            { id: 'openLinksInternal', label: 'Internal Browser', sub: 'Open links within the assistant panel for allowed sites', state: openLinksInternal },
          ].map(f => (
            <div key={f.id} className="p-6 rounded-2xl border flex items-center justify-between transition-all hover:bg-white/5" style={{ background: 'var(--clr-surface-secondary)', borderColor: 'var(--clr-border)' }}>
              <div><h4 className="text-sm font-bold">{f.label}</h4><p className="text-[11px] opacity-40 mt-0.5">{f.sub}</p></div>
              <button onClick={() => updateSetting(f.id, !f.state)} className={`w-11 h-6 rounded-full transition-all relative ${f.state ? 'bg-[var(--clr-accent)]' : 'bg-gray-600'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${f.state ? 'right-1' : 'left-1'}`} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
