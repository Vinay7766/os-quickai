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

import { open } from '@tauri-apps/plugin-shell';

interface Props {
  updateVersion: string | null;
}

export default function SupportSection({ updateVersion }: Props) {
  const supportItems = [
    { 
      title: 'Check for Updates', 
      desc: updateVersion 
        ? `A new version (v${updateVersion}) is ready for download!` 
        : 'Ensure you are running the latest version of Quickno.', 
      buttonText: updateVersion ? `Update to v${updateVersion}` : 'Check Now',
      url: updateVersion 
        ? `https://github.com/Vinay7766/quickno/releases/tag/v${updateVersion}`
        : 'https://github.com/Vinay7766/quickno/releases/latest',
      isUpdate: !!updateVersion
    },
    { 
      title: 'Community Discord', 
      desc: 'Join the conversation, ask questions, and share ideas.', 
      buttonText: 'Join Discord',
      url: 'https://discord.gg/tJXcYePghn' 
    },
    { 
      title: 'Bug Reporting', 
      desc: 'Found an issue? Let us know so we can fix it.', 
      buttonText: 'Report Bug',
      url: 'https://discord.gg/CpMW6AMsKC' 
    }
  ];

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold mb-1 tracking-tight">Support & Community</h2>
        <p className="text-sm opacity-50 font-medium">Connect with the developers and other users.</p>
      </div>

      <div className="space-y-4">
        {supportItems.map(item => (
          <div
            key={item.title}
            className={`p-8 rounded-2xl border flex items-center justify-between gap-6 transition-all duration-500 hover:scale-[1.02] ${item.isUpdate ? 'border-[var(--clr-accent)] bg-[var(--clr-accent-soft)]' : 'border-white/5 bg-white/[0.02]'} group relative overflow-hidden`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${item.isUpdate ? 'from-[var(--clr-accent)]/10' : 'from-blue-500/[0.03]'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-bold text-xl tracking-tight">{item.title}</h3>
                {item.isUpdate && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--clr-accent)] text-[9px] font-black uppercase text-white animate-pulse">New Update</span>
                )}
              </div>
              <p className="text-xs opacity-40 leading-relaxed max-w-sm font-medium">{item.desc}</p>
            </div>
            <button
              onClick={() => open(item.url)}
              className="px-8 py-3 rounded-xl text-xs font-bold text-white shrink-0 hover:scale-[1.05] active:scale-[0.95] transition-all shadow-xl relative z-10"
              style={{ 
                background: item.isUpdate ? 'var(--clr-accent)' : '#3b82f6',
                boxShadow: item.isUpdate ? '0 10px 20px -10px var(--clr-accent)' : '0 10px 20px -10px #3b82f6'
              }}
            >
              {item.buttonText}
            </button>
          </div>
        ))}
      </div>
      
      {/* ... (rest of the component) ... */}
      <div className="pt-8 space-y-5">
        <h3 className="text-xl font-bold px-1">Support the Project</h3>
        <div className="grid grid-cols-2 gap-5">
          <button
            onClick={() => open('https://ko-fi.com/vinay7766')}
            className="flex flex-col items-center justify-center p-10 rounded-[28px] border border-white/5 transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] hover:border-yellow-500/30 group relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="absolute inset-0 bg-yellow-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="text-center relative z-10">
              <div className="text-lg font-bold text-yellow-500 mb-0.5">Support Developer</div>
              <p className="text-[11px] opacity-40 font-medium">Help keep Quickno fast & free</p>
            </div>
          </button>

          <button
            onClick={() => open('https://pollinations.ai/')}
            className="flex flex-col items-center justify-center p-10 rounded-[28px] border border-white/5 transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] hover:border-green-500/30 group relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="absolute inset-0 bg-green-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="text-center relative z-10">
              <div className="text-lg font-bold text-green-500 mb-0.5">Support Pollinations</div>
              <p className="text-[11px] opacity-40 font-medium">Back the core AI engine</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
