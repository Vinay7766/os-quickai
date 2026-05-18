/**
 * Core Constants
 * 
 * Central repository for all static magic numbers, arrays, and configuration options.
 * Strictly decoupled from visual layout files.
 */

export const FREE_MODELS = ['free-model'];

export const API_MODELS = [
  { value: 'gemini', label: 'Gemini', placeholder: 'AIzaSy...', provider: 'gemini' },
  { value: 'grok', label: 'Grok', placeholder: 'xai-...', provider: 'grok' },
  { value: 'chatgpt', label: 'ChatGPT', placeholder: 'sk-proj...', provider: 'openai' },
  { value: 'claude', label: 'Claude', placeholder: 'sk-ant-api03...', provider: 'claude' },
  { value: 'perplexity', label: 'Perplexity', placeholder: 'pplx...', provider: 'perplexity' },
];

export const FREE_MODEL_OPTIONS = [
  { value: 'free-model', label: 'Free Model' },
];

export const BROWSERS = [
  { value: 'default', label: 'System Default' },
  { value: 'chrome', label: 'Google Chrome' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'brave', label: 'Brave' },
  { value: 'bing', label: 'Microsoft Edge' },
  { value: 'opera', label: 'Opera' },
  { value: 'comet', label: 'Comet' },
];

export const SEARCH_ENGINES = [
  { value: 'google', label: 'Google (Default)' },
  { value: 'bing', label: 'Bing' },
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'duckduckgo', label: 'DuckDuckGo' },
  { value: 'custom', label: 'Custom Search Engine' },
];

export const AI_SITES = [
  { value: 'claude', label: 'Claude (Default)' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'grok', label: 'Grok (xAI)' },
  { value: 'perplexity', label: 'Perplexity' },
];
