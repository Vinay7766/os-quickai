import { invoke } from '@tauri-apps/api/core';

export default function Guide() {
  const handleGetStarted = async () => {
    // Hides guide and opens settings — handled server-side by Rust
    await invoke('open_settings');
  };

  return (
    <div
      className="h-screen w-full flex flex-col select-none"
      style={{ background: 'var(--clr-surface)', color: 'var(--clr-text)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-8 py-6" style={{ borderBottom: '1px solid var(--clr-border)' }}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
        >
          ✦
        </div>
        <div>
          <h1 className="text-xl font-bold">OS QuickAI — Successfully Installed! 🎉</h1>
          <p className="text-sm" style={{ color: 'var(--clr-muted)' }}>
            Your AI assistant is running. Here's everything you need to know.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-8 py-5 space-y-3">
        {[
          { icon: '⌨️', title: 'Press Alt + A from anywhere', desc: 'Summon the AI search bar over any window instantly. Press Escape to hide it. Drag it anywhere on screen.', color: '#3b82f6' },
          { icon: '💬', title: 'Type & press Enter to ask AI', desc: 'Ask anything — code, writing, math, facts. Use Shift+Enter for multi-line. The built-in AI answers immediately.', color: '#8b5cf6' },
          { icon: '🌐', title: 'Search in Browser button', desc: 'Click the "Browser" button in the search bar to open your query in the browser you selected in Settings.', color: '#10b981' },
          { icon: '🤖', title: 'Open in AI model button', desc: 'Click the "AI" button to open your query directly in a new chat on ChatGPT, Claude, Gemini, or Grok.', color: '#f59e0b' },
          { icon: '⚙️', title: 'Configure via System Tray', desc: 'Right-click the OS QuickAI icon in your taskbar (bottom-right) → Settings to set your API keys, model, and browser.', color: '#ef4444' },
          { icon: '🔑', title: 'Free Models need no API key', desc: 'Minimax 2.5, Qwen 3.6 and Nvidia Nemotron work without any key. For ChatGPT, Claude, Gemini or Grok — add your key in Settings.', color: '#6366f1' },
          { icon: '🚀', title: 'Auto-starts with Windows', desc: 'OS QuickAI is registered to run at startup. You\'ll always have it ready in your tray without launching manually.', color: '#14b8a6' },
        ].map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-3 rounded-xl"
            style={{ background: 'var(--clr-input-bg)', border: '1px solid var(--clr-border)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5"
              style={{ background: `${step.color}20` }}
            >
              {step.icon}
            </div>
            <div>
              <p className="font-semibold text-sm mb-0.5">{step.title}</p>
              <p className="text-xs" style={{ color: 'var(--clr-muted)', lineHeight: '1.55' }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-8 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--clr-border)' }}>
        <p className="text-xs" style={{ color: 'var(--clr-muted)' }}>
          Access this guide anytime via Tray → User Guide
        </p>
        <button
          onClick={handleGetStarted}
          className="px-6 py-2 rounded-full text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            boxShadow: '0 0 20px rgba(99,102,241,0.45)',
          }}
        >
          Get Started →
        </button>
      </div>
    </div>
  );
}
