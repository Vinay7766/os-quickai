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
// WelcomeScreen.tsx — First-run welcome page
// ─────────────────────────────────────────────────────────────────────────────
// Shown only once after the first installation. Uses the Tauri store to
// persist a "hasSeenWelcome" flag so it never shows again after dismissal.
// ─────────────────────────────────────────────────────────────────────────────

interface WelcomeScreenProps {
  /** Called when the user clicks "Get Started" */
  onGetStarted: () => void;
}

import { useState } from 'react';
import appLogo from '../../assets/app-logo.png';
import appBanner from '../../assets/app-banner.png';
import welcomeAnim from '../../assets/welcome-animation.webm';

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const [stage, setStage] = useState<'animation' | 'content'>('animation');

  return (
    <div
      className="h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--clr-surface)', color: 'var(--clr-text)' }}
    >
      {/* Stage 1: Cinematic Full-Screen Animation */}
      {stage === 'animation' && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black animate-in fade-in duration-700 cursor-pointer group"
          onClick={() => setStage('content')}
          title="Click to skip"
        >
          <video 
            autoPlay 
            muted 
            playsInline 
            onEnded={() => setStage('content')}
            className="w-full h-full object-contain"
          >
            <source src={welcomeAnim} type="video/webm" />
          </video>
          
          {/* Skip Button Overlay */}
          <div className="absolute bottom-12 right-12 px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-bold uppercase tracking-widest text-white/50 group-hover:text-white group-hover:bg-white/20 transition-all z-[60]">
            Click anywhere to skip →
          </div>
        </div>
      )}

      {/* Stage 2: Interactive Welcome Content */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-1000 transform ${stage === 'content' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
        {/* App Banner */}
        <div className="w-full max-w-md mb-10 rounded-3xl overflow-hidden shadow-2xl border border-white/5 group relative" style={{ maxHeight: '200px' }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <img src={appBanner} alt="Banner" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
        </div>

        {/* App logo */}
        <img 
          src={appLogo} 
          alt="Logo" 
          className="w-20 h-20 rounded-2xl mb-8 shadow-2xl border border-white/10" 
        />

        {/* Heading */}
        <h1 className="text-4xl font-bold tracking-tight text-center mb-3">
          Welcome to Quickno
        </h1>
        <p className="text-sm text-center max-w-sm leading-relaxed mb-10"
          style={{ color: 'var(--clr-text-secondary)' }}>
          Your lightning-fast AI assistant. Press{' '}
          <kbd className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: 'var(--clr-input-bg)', border: '1px solid var(--clr-border)' }}>
            Alt+A
          </kbd>{' '}
          anywhere to open the search bar.
        </p>

        {/* CTA button */}
        <button
          onClick={onGetStarted}
          className="px-10 py-4 rounded-2xl text-base font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-xl shadow-[var(--clr-accent)]/20"
          style={{ background: 'var(--clr-accent)' }}
        >
          Explore Quickno →
        </button>

        <p className="mt-8 text-[11px]" style={{ color: 'var(--clr-text-tertiary)' }}>
          Quickno v1.0.2 • Crafted for performance
        </p>
      </div>
    </div>
  );
}
