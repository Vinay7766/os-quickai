import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function Pet() {
  const [message, setMessage] = useState<string>('Hello! I am Quickno Pet.');
  const [isHappy, setIsHappy] = useState(false);

  useEffect(() => {
    // Make window background strictly transparent
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';

    const unlistenProgress = listen('file-progress', (event: any) => {
      const { percentage, operation } = event.payload;
      if (percentage >= 100) {
        setMessage(`${operation.toUpperCase()} COMPLETE! 🎉`);
        setIsHappy(true);
        setTimeout(() => {
          getCurrentWindow().hide();
        }, 4000);
      } else {
        setMessage(`Working: ${percentage.toFixed(0)}%`);
        setIsHappy(false);
      }
    });

    const unlistenMessage = listen('pet-message', (event: any) => {
      setMessage(event.payload);
      setIsHappy(true);
      setTimeout(() => {
        getCurrentWindow().hide();
      }, 4000);
    });

    return () => {
      unlistenProgress.then(f => f());
      unlistenMessage.then(f => f());
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-end pb-4 pointer-events-none select-none">
      {/* Speech Bubble */}
      <div className="relative bg-white text-black font-bold text-xs px-3 py-2 rounded-xl shadow-lg mb-2 text-center animate-fade-in-up max-w-[130px] break-words">
        {message}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-white border-r-[6px] border-r-transparent"></div>
      </div>
      
      {/* Pet Character (Bouncing Cat) */}
      <div className={`text-6xl filter drop-shadow-xl ${isHappy ? 'animate-bounce' : 'animate-pulse'}`}>
        {isHappy ? '😻' : '😼'}
      </div>
    </div>
  );
}
