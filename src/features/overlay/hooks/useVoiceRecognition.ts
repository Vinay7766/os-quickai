import { useEffect, useState, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../../../core/store/useAppStore';

export function useVoiceRecognition() {
  const { setQuery, query } = useAppStore();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const currentText = finalTranscript || interimTranscript;
        if (currentText.trim()) {
          // If there was previous text, append it. For a simple implementation, we just overwrite.
          setQuery(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically submit when voice stops
        setTimeout(() => {
          useAppStore.getState().submitQuery();
        }, 300);
      };
      
      recognitionRef.current = recognition;
    }

    let unlistenStart: (() => void) | null = null;
    let unlistenStop: (() => void) | null = null;

    const setupListener = async () => {
      unlistenStart = await listen('voice-start', () => {
        if (recognitionRef.current && !isListening) {
          useAppStore.getState().setQuery('');
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Failed to start recognition', e);
          }
        }
      });

      unlistenStop = await listen('voice-stop', () => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.error('Failed to stop recognition', e);
          }
        }
      });
    };

    setupListener();

    return () => {
      if (unlistenStart) unlistenStart();
      if (unlistenStop) unlistenStop();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [setQuery, isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this environment.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      useAppStore.getState().setQuery('');
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  return { isListening, toggleListening };
}
