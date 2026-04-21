import { invoke } from '@tauri-apps/api/core';

export async function queryLlm(query: string, model: string, apiKey: string): Promise<string> {
  return await invoke<string>('query_llm', { query, model, apiKey });
}

export async function saveApiKey(key: string): Promise<void> {
  return await invoke<void>('save_api_key', { key });
}

export async function getApiKey(): Promise<string | null> {
  return await invoke<string | null>('get_api_key');
}

export async function deleteApiKey(): Promise<void> {
  return await invoke<void>('delete_api_key');
}

export async function testApiKey(key: string): Promise<boolean> {
  return await invoke<boolean>('test_api_key', { key });
}

export async function searchInBrowser(browser: string, url: string): Promise<void> {
  return await invoke<void>('search_in_browser', { browser, url });
}

export async function updateShortcut(newShortcut: string): Promise<void> {
  return await invoke<void>('update_shortcut', { newShortcut });
}
