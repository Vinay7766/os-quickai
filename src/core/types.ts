/**
 * Core Types
 * 
 * Central collection of domain TypeScript interfaces and type definitions.
 */

export interface AppInfo {
  name: string;
  appId: string;
}

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}
