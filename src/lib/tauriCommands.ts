// ─────────────────────────────────────────────────────────────────────────────
// tauriCommands.ts — Frontend bindings for Rust backend commands
// ─────────────────────────────────────────────────────────────────────────────
// Each function here maps to a #[tauri::command] in the Rust backend.
// They are thin wrappers around Tauri's `invoke()` function.
// ─────────────────────────────────────────────────────────────────────────────

import { invoke } from '@tauri-apps/api/core';

// ── AI Query ─────────────────────────────────────────────────────────────────

/** Send a query to the selected AI model and get a response. */
export async function queryLlm(query: string, model: string, apiKey: string): Promise<string> {
  return await invoke<string>('query_llm', { query, model, apiKey });
}

// ── API Key Management ───────────────────────────────────────────────────────

/** Save an API key to Windows Credential Manager for a specific provider. */
export async function saveApiKey(key: string, provider: string): Promise<void> {
  return await invoke<void>('save_api_key', { key, provider });
}

/** Retrieve the stored API key for a specific provider (returns null if none exists). */
export async function getApiKey(provider: string): Promise<string | null> {
  return await invoke<string | null>('get_api_key', { provider });
}

/** Delete the API key for a specific provider from both the app and Windows Credential Manager. */
export async function deleteApiKey(provider: string): Promise<void> {
  return await invoke<void>('delete_api_key', { provider });
}

/** Test if an API key is valid (currently only works for OpenAI keys). */
export async function testApiKey(key: string): Promise<boolean> {
  return await invoke<boolean>('test_api_key', { key });
}

// ── Browser ──────────────────────────────────────────────────────────────────

/** Open a URL in a specific browser. */
export async function searchInBrowser(browser: string, url: string): Promise<void> {
  return await invoke<void>('search_in_browser', { browser, url });
}

/** Check if a browser is installed on the system. */
export async function checkBrowserExists(browser: string): Promise<boolean> {
  return await invoke<boolean>('check_browser_exists', { browser });
}

// ── System Theme ─────────────────────────────────────────────────────────────

/** Detect the OS dark/light theme from the Windows registry.
 *  WebView2 doesn't reliably forward `prefers-color-scheme`, so we
 *  read it natively from the Rust backend. Returns "dark" or "light". */
export async function getSystemTheme(): Promise<string> {
  return await invoke<string>('get_system_theme');
}


// ── Gemini & Models ──────────────────────────────────────────────────────────

/** List available Gemini models using the API key. */
export async function listGeminiModels(apiKey: string): Promise<string[]> {
  return await invoke<string[]>('list_gemini_models', { apiKey });
}

export async function listProviderModels(apiKey: string, provider: string): Promise<string[]> {
  return await invoke<string[]>('list_provider_models', { apiKey, provider });
}

// ── Application Launching ────────────────────────────────────────────────────

/** Launch a Windows application by name. */
export async function launchApp(name: string): Promise<void> {
  return await invoke<void>('launch_app', { name });
}

// ── Window & Shortcuts ───────────────────────────────────────────────────────

/** Change the global hotkey for toggling the search overlay. */
export async function updateShortcut(newShortcut: string): Promise<void> {
  return await invoke<void>('update_shortcut', { newShortcut });
}
