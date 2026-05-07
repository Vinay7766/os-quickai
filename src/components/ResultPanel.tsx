// ─────────────────────────────────────────────────────────────────────────────
// ResultPanel.tsx — AI response display
// ─────────────────────────────────────────────────────────────────────────────
// Renders the AI model's response in the overlay. Supports:
//   • Loading state with animated dots
//   • Error state with clear messaging
//   • Markdown rendering with syntax-highlighted code blocks
//   • Shows which AI model generated the response
// ─────────────────────────────────────────────────────────────────────────────

import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useAppStore } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { open } from '@tauri-apps/plugin-shell';
import 'highlight.js/styles/github-dark.css';

export function ResultPanel() {
  const { answer, isLoading, error } = useAppStore();
  const { llmModel } = useSettingsStore();

  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault();
    
    // Ctrl+Click always opens in system browser
    if (e.ctrlKey) {
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
        <div
          className="p-4 rounded-xl border text-sm leading-relaxed"
          style={{
            background: 'var(--clr-danger-soft)',
            borderColor: 'rgba(220, 38, 38, 0.15)',
            color: 'var(--clr-danger)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--clr-danger)' }} />
            <strong className="text-[10px] font-bold uppercase tracking-wider">Error</strong>
          </div>
          {error}
        </div>
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
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--clr-accent)' }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {llmModel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
