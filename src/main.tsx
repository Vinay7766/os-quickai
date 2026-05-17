// ─────────────────────────────────────────────────────────────────────────────
// main.tsx — Application entry point (React)
// ─────────────────────────────────────────────────────────────────────────────
// Quickno uses multiple Tauri windows, each rendering a different component:
//   • "overlay"  → The search bar that appears via global hotkey
//   • "settings" → The main configuration page
//
// The window label is read from Tauri internals to determine which
// component to render. All windows share the same JS bundle.
// ─────────────────────────────────────────────────────────────────────────────

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// ── Window Detection ─────────────────────────────────────────────────────────
// Reads the current window's label from Tauri's internal metadata.
// This tells us which UI component to render.

function getWindowLabel(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? '';
  } catch {
    return '';
  }
}

const label = getWindowLabel();

// ── Window Components ────────────────────────────────────────────────────────
// Using eager imports because all windows are hidden on startup.
// Lazy loading caused a visible blank flash before Suspense resolved.

import Overlay  from './features/overlay/Overlay';
import Settings from './features/settings/Settings';

// ── Fallback ─────────────────────────────────────────────────────────────────
// Shows a transparent or themed background while the app initializes.

const Fallback = () => (
  <div
    style={{
      width: '100vw',
      height: '100vh',
      background: label === 'overlay' ? 'transparent' : 'var(--clr-surface)',
    }}
  />
);

// ── Root Component ───────────────────────────────────────────────────────────
// Routes to the correct window component based on the Tauri window label.

function App() {
  if (label === 'overlay')  return <Overlay />;
  if (label === 'settings') return <Settings />;
  return null;
}

// ── Mount ────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<Fallback />}>
      <App />
    </Suspense>
  </React.StrictMode>
);
