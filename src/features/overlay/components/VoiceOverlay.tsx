import { useAppStore } from '../../../core/store/useAppStore';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useEffect, useState } from 'react';

export function VoiceOverlay() {
  const { query, answer, isLoading, clearAnswer } = useAppStore();
  const { isListening, toggleListening } = useVoiceRecognition();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const prevSpeaking = useRef(isSpeaking);

  useEffect(() => {
    // Auto-start listening if opened manually and nothing is happening
    if (!isListening && !isLoading && !isSpeaking && !answer && !query) {
      toggleListening();
    }
  }, []);

  useEffect(() => {
    // Force stop microphone when AI is thinking or speaking
    if ((isLoading || isSpeaking) && isListening) {
      toggleListening();
    }
  }, [isLoading, isSpeaking, isListening, toggleListening]);

  useEffect(() => {
    // Auto-resume microphone when AI finishes speaking
    if (prevSpeaking.current && !isSpeaking) {
      useAppStore.getState().setQuery(''); // Clear previous query for fresh input
      if (!isListening) {
        toggleListening();
      }
    }
    prevSpeaking.current = isSpeaking;
  }, [isSpeaking, isListening, toggleListening]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isListening && query.trim()) {
        e.preventDefault();
        toggleListening();
        setTimeout(() => useAppStore.getState().submitQuery(true), 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, query, toggleListening]);

  useEffect(() => {
    // Poll for speech synthesis state to animate the orb when AI is talking
    const interval = setInterval(() => {
      setIsSpeaking(window.speechSynthesis?.speaking || false);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const orbState = isLoading ? 'thinking' : isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle';

  // Dynamic Styles for the Orb
  const getOrbStyles = () => {
    switch (orbState) {
      case 'listening':
        return 'scale-110 bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 shadow-[0_0_80px_rgba(168,85,247,0.8)] animate-pulse';
      case 'thinking':
        return 'scale-90 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_60px_rgba(59,130,246,0.6)] animate-spin';
      case 'speaking':
        return 'scale-125 bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-500 shadow-[0_0_100px_rgba(45,212,191,0.8)] animate-bounce';
      default:
        return 'scale-100 bg-gradient-to-tr from-gray-600 to-gray-400 shadow-[0_0_30px_rgba(255,255,255,0.1)] opacity-50';
    }
  };

  const getLabel = () => {
    switch (orbState) {
      case 'listening': return 'I\'m listening...';
      case 'thinking': return 'Analyzing...';
      case 'speaking': return 'Speaking...';
      default: return 'Voice Mode Ready';
    }
  };

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center relative p-8 animate-fade-in-up transition-all duration-500"
      style={{ minHeight: '300px' }}
      data-tauri-drag-region="true"
    >
      {/* Close Button */}
      <button
        onClick={() => {
          window.speechSynthesis?.cancel();
          clearAnswer();
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/50 hover:bg-white/20 hover:text-white hover:rotate-90 hover:scale-110 transition-all duration-300 z-50 cursor-pointer shadow-xl backdrop-blur-md"
        title="Close Voice Mode"
      >
        ✕
      </button>

      {/* Aesthetic Orb */}
      <div 
        className="relative flex items-center justify-center mb-8 mt-4 cursor-pointer group"
        onClick={() => {
          if (isSpeaking) {
            window.speechSynthesis?.cancel();
            setIsSpeaking(false);
          } else if (!isLoading) {
            // Toggle mic manually if not thinking
            toggleListening();
            if (isListening && query.trim()) {
              // If we were listening and have text, submit it immediately
              setTimeout(() => useAppStore.getState().submitQuery(true), 100);
            }
          }
        }}
        title={isSpeaking ? "Click to stop speaking" : "Click to listen"}
      >
        {/* Glow Ring 1 */}
        <div className={`absolute w-32 h-32 rounded-full blur-2xl transition-all duration-700 ease-in-out mix-blend-screen opacity-70 group-hover:scale-110 ${getOrbStyles()}`} />
        {/* Glow Ring 2 */}
        <div className={`absolute w-24 h-24 rounded-full blur-xl transition-all duration-500 ease-in-out mix-blend-screen opacity-90 group-hover:scale-105 ${getOrbStyles()} delay-75`} />
        {/* Core */}
        <div className={`relative w-16 h-16 rounded-full transition-all duration-300 ease-in-out z-10 border border-white/20 backdrop-blur-sm ${getOrbStyles()}`} />
      </div>

      {/* State Label */}
      <div className="flex flex-col items-center justify-center gap-2 mb-6">
        <p className={`text-sm font-black tracking-widest uppercase transition-all duration-300 ${
          orbState === 'listening' ? 'text-purple-300 animate-pulse' :
          orbState === 'thinking' ? 'text-blue-300' :
          orbState === 'speaking' ? 'text-teal-300' : 'text-gray-400'
        }`}>
          {getLabel()}
        </p>
      </div>

      {/* Transcripts */}
      <div className="w-full max-w-lg text-center px-6 min-h-[80px] flex items-center justify-center flex-col gap-2">
        {answer ? (
          <div className="text-white/80 text-[13px] font-medium leading-relaxed tracking-wide drop-shadow-md animate-in fade-in slide-in-from-bottom-2 max-h-[150px] overflow-y-auto scrollbar-thin px-4">
            {answer}
          </div>
        ) : query ? (
          <p className="text-white/90 text-lg font-medium leading-relaxed tracking-wide drop-shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
            "{query}"
          </p>
        ) : (
          <p className="text-white/30 text-base font-medium italic">
            Waiting for your command...
          </p>
        )}
      </div>

      {/* Submit Override */}
      {isListening && query.trim() && (
        <button
          onClick={() => {
            toggleListening();
            setTimeout(() => useAppStore.getState().submitQuery(true), 100);
          }}
          className="mt-8 px-6 py-2.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/40 hover:to-indigo-500/40 border border-purple-500/30 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center gap-3 active:scale-95 shadow-lg shadow-purple-500/10 backdrop-blur-md group"
        >
          <span>Submit Query</span>
          <span className="opacity-50 text-[10px] bg-black/40 px-1.5 py-0.5 rounded group-hover:opacity-100 transition-opacity">Enter</span>
        </button>
      )}

    </div>
  );
}
