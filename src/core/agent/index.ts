import { globalToolRegistry } from './ToolRegistry';
import {
  securityInterceptorTool,
  desktopAutomationTool,
  terminalTool,
  siteLauncherTool,
  appLauncherTool,
  llmSearchTool
} from './builtins';

// Register all core tools in the correct order of execution
// 1. Intercept dangerous queries first
globalToolRegistry.register(securityInterceptorTool);
// 2. Intercept desktop automation commands (e.g., locking PC)
globalToolRegistry.register(desktopAutomationTool);
// 3. Mode specific execution tools
globalToolRegistry.register(terminalTool);
globalToolRegistry.register(siteLauncherTool);
globalToolRegistry.register(appLauncherTool);
// 4. Fallback to LLM search engine
globalToolRegistry.register(llmSearchTool);

export * from './types';
export * from './ToolRegistry';
export * from './builtins';
