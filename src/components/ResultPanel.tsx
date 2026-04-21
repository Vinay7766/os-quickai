import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { useAppStore } from '../store/useAppStore';
import 'highlight.js/styles/github-dark.css';

export function ResultPanel() {
  const { answer, isLoading, error } = useAppStore();

  return (
    <div className="w-full max-h-[280px] overflow-y-auto pr-2" style={{ color: 'var(--clr-text)' }}>
      {isLoading && (
        <div className="flex space-x-1.5 animate-pulse items-center h-8" style={{ color: 'var(--clr-muted)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--clr-indigo)' }}></div>
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--clr-indigo)' }}></div>
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--clr-indigo)' }}></div>
          <span className="ml-2 text-sm">Thinking...</span>
        </div>
      )}
      
      {error && (
        <div className="p-3 rounded-md border text-sm" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
          <strong className="block mb-1">Error:</strong>
          {error}
        </div>
      )}
      
      {(!isLoading && !error && answer) && (
        <div className="prose prose-sm max-w-none dark:prose-invert" style={{ color: 'var(--clr-text)' }}>
          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
            {answer}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
