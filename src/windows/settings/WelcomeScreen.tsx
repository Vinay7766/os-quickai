// ─────────────────────────────────────────────────────────────────────────────
// WelcomeScreen.tsx — First-run welcome page
// ─────────────────────────────────────────────────────────────────────────────
// Shown only once after the first installation. Uses the Tauri store to
// persist a "hasSeenWelcome" flag so it never shows again after dismissal.
// ─────────────────────────────────────────────────────────────────────────────

interface WelcomeScreenProps {
  /** Called when the user clicks "Get Started" */
  onGetStarted: () => void;
}

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div
      className="h-screen flex flex-col items-center justify-center px-12 animate-fade-in-up"
      style={{ background: 'var(--clr-surface)', color: 'var(--clr-text)' }}
    >
      {/* App logo */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white mb-8 shadow-lg"
        style={{ background: 'var(--clr-accent)' }}
      >
        Q
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold tracking-tight text-center mb-3">
        Welcome to Quickno
      </h1>
      <p className="text-sm text-center max-w-sm leading-relaxed mb-10"
        style={{ color: 'var(--clr-text-secondary)' }}>
        Your lightning-fast AI assistant. Press{' '}
        <kbd className="px-2 py-0.5 rounded text-xs font-bold"
          style={{ background: 'var(--clr-input-bg)', border: '1px solid var(--clr-border)' }}>
          Alt+A
        </kbd>{' '}
        anywhere to open the search bar, and configure everything from this page.
      </p>

      {/* Feature highlights */}
      <div className="w-full max-w-sm space-y-3 mb-10">
        {[
          { icon: '⚡', title: 'Instant AI answers', desc: 'Ask anything from the floating search bar' },
          { icon: '🌐', title: 'Smart web search', desc: 'Open queries in your preferred browser' },
          { icon: '🔒', title: 'Secure & private', desc: 'API keys stored in Windows Credential Manager' },
        ].map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-4 p-4 rounded-xl"
            style={{ background: 'var(--clr-input-bg)', border: '1px solid var(--clr-border)' }}
          >
            <span className="text-xl shrink-0">{f.icon}</span>
            <div>
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-secondary)' }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <button
        onClick={onGetStarted}
        className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-md"
        style={{ background: 'var(--clr-accent)' }}
      >
        Get Started →
      </button>

      <p className="mt-6 text-[11px]" style={{ color: 'var(--clr-text-tertiary)' }}>
        You can always change settings later from the system tray.
      </p>
    </div>
  );
}
