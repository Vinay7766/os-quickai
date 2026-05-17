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

// ─────────────────────────────────────────────────────────────────────────────
// ResultPanel.tsx — AI response display
// ─────────────────────────────────────────────────────────────────────────────
// Renders the AI model's response in the overlay. Supports:
//   • Loading state with animated dots
//   • Error state with clear messaging
//   • Markdown rendering with syntax-highlighted code blocks
//   • Shows which AI model generated the response
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '../../core/store/useAppStore';
import { useSettingsStore } from '../../core/store/useSettingsStore';
import 'highlight.js/styles/github-dark.css';

export function ResultPanel() {
  const { answer, isLoading, error } = useAppStore();
  const { llmModel } = useSettingsStore();

  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault();
    
    // Ctrl+Click always opens in system browser
    if (e.ctrlKey) {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
      return;
    }

    // Always open in internal search pill
    useAppStore.setState({ internalUrl: url });
  };

  return (
    <div className="w-full select-text cursor-auto" style={{ color: 'var(--clr-text)' }}>

      {/* ── Loading State ─────────────────────────────────────────────── */}
      {isLoading && (
        <div
          className="flex items-center gap-2 h-8 animate-pulse"
          style={{ color: 'var(--clr-text-secondary)' }}
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="loading-dot"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-xs font-medium">Thinking...</span>
        </div>
      )}

      {/* ── Error State ───────────────────────────────────────────────── */}
      {error && (
        <ErrorDisplay error={error} />
      )}

      {/* ── Answer State ──────────────────────────────────────────────── */}
      {!isLoading && !error && answer && (
        <div className="animate-fade-in-up">
          <div
            className="prose prose-sm max-w-none dark:prose-invert leading-relaxed break-words overflow-x-hidden"
            style={{ color: 'var(--clr-text)' }}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeHighlight]}
              components={{
                a: ({ href, children }) => (
                  <a 
                    href={href} 
                    onClick={(e) => handleLinkClick(e, href || '')}
                    className="text-[var(--clr-accent)] hover:underline font-bold"
                  >
                    {children}
                  </a>
                )
              }}
            >
              {answer}
            </ReactMarkdown>
          </div>

          <div
            className="mt-5 pt-3 border-t flex items-center gap-2 opacity-50"
            style={{ borderColor: 'var(--clr-border)' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {llmModel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorDisplay({ error }: { error: string }) {
  const [showDetails, setShowDetails] = useState(false);
  const isPollinations = error.toLowerCase().includes('pollinations') || 
                         error.includes('500') || 
                         error.toLowerCase().includes('enospc');

  return (
    <div
      className="p-5 rounded-2xl border animate-fade-in-up"
      style={{
        background: 'rgba(var(--clr-accent-rgb), 0.03)',
        borderColor: 'var(--clr-border)',
      }}
    >
      <div className="flex items-start gap-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--clr-accent-soft)', color: 'var(--clr-accent)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--clr-text)' }}>
            {isPollinations ? 'Free Provider Under High Load' : 'Provider Connection Issue'}
          </h3>
          <p className="text-xs leading-relaxed opacity-70 mb-4" style={{ color: 'var(--clr-text)' }}>
            {isPollinations 
              ? "The community-hosted free model is currently experiencing heavy traffic. You can try again in a moment, or switch to a direct provider (Gemini, OpenAI, or Claude) in Settings for instant, guaranteed availability."
              : "We're having trouble connecting to the AI provider. This is usually a temporary network issue."}
          </p>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            >
              {showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
            </button>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <button 
              onClick={() => useAppStore.getState().submitQuery()}
              className="text-[10px] font-bold uppercase tracking-widest text-[var(--clr-accent)] hover:underline"
            >
              Retry Now
            </button>
          </div>

          {showDetails && (
            <div 
              className="mt-4 p-3 rounded-lg border bg-black/20 font-mono text-[10px] break-all animate-in fade-in slide-in-from-top-2"
              style={{ borderColor: 'rgba(220, 38, 38, 0.2)', color: 'var(--clr-danger)' }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
