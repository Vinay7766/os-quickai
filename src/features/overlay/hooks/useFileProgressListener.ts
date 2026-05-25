import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../../../core/store/useAppStore';

export function useFileProgressListener() {
  const { setFileProgress } = useAppStore();

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen<{ progress: number; operation: string; file: string }>('file-progress', (event) => {
        if (event.payload.progress >= 100) {
          // Clear progress shortly after finishing
          setTimeout(() => {
            useAppStore.getState().setFileProgress(null);
          }, 1000);
        } else {
          setFileProgress(event.payload);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [setFileProgress]);
}
