import { invoke } from '@tauri-apps/api/core';
import { AgentTool, AgentContext, ToolResult } from './types';
import { queryLlm, getApiKey, executeUiActions } from '../lib/tauriCommands';

// ── Tool 1: Security Interceptor ───────────────────────────────────────────
export const securityInterceptorTool: AgentTool = {
  id: 'security-interceptor',
  name: 'Security Interceptor',
  description: 'Blocks destructive OS commands before they execute.',
  canHandle: () => true, // Always inspect queries
  execute: async (ctx: AgentContext): Promise<ToolResult> => {
    if (ctx.isConfirmed) return { type: 'continue' };

    const qLower = ctx.query.toLowerCase().trim();
    let isDangerous = false;
    let dangerReason = '';

    if (ctx.mode === 'terminal') {
      const dangerousTerms = ['rm ', 'del ', 'rd ', 'format ', 'mkfs', 'dd ', 'shutdown', 'reboot', 'restart'];
      for (const term of dangerousTerms) {
        if (qLower.includes(term)) {
          isDangerous = true;
          dangerReason = `destructive terminal command: "${term.trim()}"`;
          break;
        }
      }
    } else {
      if (qLower.startsWith('delete ') || qLower.startsWith('remove ')) {
        isDangerous = true;
        dangerReason = 'irreversible file or folder deletion';
      }

      const matchesTrigger = (triggersCsv: string, input: string) => {
        for (const trigger of triggersCsv.split(',')) {
          const t = trigger.trim().toLowerCase();
          if (t && (input === t || input.startsWith(t + ' ') || input.endsWith(' ' + t))) {
            return true;
          }
        }
        return false;
      };

      if (matchesTrigger(ctx.settings.customRestartCommand || '', qLower)) {
        isDangerous = true;
        dangerReason = 'system restart';
      } else if (matchesTrigger(ctx.settings.customShutdownCommand || '', qLower)) {
        isDangerous = true;
        dangerReason = 'system shutdown';
      }
    }

    if (isDangerous) {
      ctx.callbacks.setPendingCommand(ctx.query.trim(), ctx.mode, dangerReason);
      return { type: 'intercepted' };
    }

    return { type: 'continue' };
  }
};

// ── Tool 2: Desktop Automation Interceptor ─────────────────────────────────
export const desktopAutomationTool: AgentTool = {
  id: 'desktop-automation',
  name: 'Desktop Automation',
  description: 'Handles native file operations and OS controls.',
  canHandle: (ctx) => ctx.mode === 'search',
  execute: async (ctx: AgentContext): Promise<ToolResult> => {
    try {
      const desktopResult = await invoke<string>('execute_desktop_command', { command: ctx.query.trim() });
      ctx.callbacks.setAnswer(desktopResult);
      return { type: 'handled' };
    } catch (err: any) {
      if (err !== 'Not a recognized desktop command') {
        return { type: 'handled', error: err };
      }
      return { type: 'continue' };
    }
  }
};

// ── Tool 3: Terminal Executor ─────────────────────────────────────────────
export const terminalTool: AgentTool = {
  id: 'terminal',
  name: 'Terminal Executor',
  description: 'Executes safe terminal commands.',
  canHandle: (ctx) => ctx.mode === 'terminal',
  execute: async (ctx: AgentContext): Promise<ToolResult> => {
    if (!ctx.settings.enableTerminalMode) {
      return { type: 'handled', error: 'Terminal Mode is disabled. Please turn it on in the Settings.' };
    }
    const result = await invoke<string>('execute_terminal_command', { command: ctx.query.trim() });
    const displayResult = result.trim() || 'Command executed successfully (no output).';
    ctx.callbacks.setAnswer(`\`\`\`bash\n${displayResult}\n\`\`\``);
    return { type: 'handled' };
  }
};

// ── Tool 4: Site Launcher ─────────────────────────────────────────────────
export const siteLauncherTool: AgentTool = {
  id: 'site-launcher',
  name: 'Site Launcher',
  description: 'Opens URLs in the internal browser view.',
  canHandle: (ctx) => ctx.mode === 'site',
  execute: async (ctx: AgentContext): Promise<ToolResult> => {
    if (!ctx.settings.enableSiteLauncher) {
      return { type: 'handled', error: 'Site Launcher is disabled. Please turn it on in the Settings.' };
    }
    let url = ctx.query.trim();
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    ctx.callbacks.setInternalUrl(url);
    return { type: 'handled' };
  }
};

// ── Tool 5: App Launcher ──────────────────────────────────────────────────
export const appLauncherTool: AgentTool = {
  id: 'app-launcher',
  name: 'App Launcher',
  description: 'Launches local applications or files.',
  canHandle: (ctx) => ctx.mode === 'app' || (ctx.mode === 'search' && /^(open|run|launch)\s+/i.test(ctx.query.trim())),
  execute: async (ctx: AgentContext): Promise<ToolResult> => {
    const trimmed = ctx.query.trim();
    const qLower = trimmed.toLowerCase();

    // Explicit App Mode
    if (ctx.mode === 'app') {
      if (!ctx.settings.enableAppLauncher) {
        return { type: 'handled', error: 'App Launcher is disabled. Please turn it on in the Settings.' };
      }
      const selected = ctx.appSuggestions[ctx.activeAppIndex];
      if (selected) {
        await ctx.callbacks.launchApp(selected.name, selected.appId);
      } else {
        await ctx.callbacks.launchApp(trimmed, null);
      }
      ctx.callbacks.clearState();
      return { type: 'handled' };
    }

    // Natural Language App Launch (Search Mode)
    let targetApp = '';
    if (qLower.startsWith('open ')) targetApp = trimmed.substring(5).trim();
    else if (qLower.startsWith('run ')) targetApp = trimmed.substring(4).trim();
    else if (qLower.startsWith('launch ')) targetApp = trimmed.substring(7).trim();

    if (targetApp) {
      const mainPart = targetApp.split(/\s+in\s+/i)[0].trim();
      const isURL = (str: string): boolean => {
        const t = str.trim();
        if (t.includes(' ')) return false;
        return /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\/?/.test(t);
      };

      if (isURL(mainPart)) {
        let targetBrowser = '';
        let urlToOpen = targetApp;
        const parts = targetApp.split(/\s+in\s+/i);
        if (parts.length > 1) {
          const potentialBrowser = parts[parts.length - 1].toLowerCase().trim();
          if (['chrome', 'firefox', 'brave', 'edge', 'bing', 'opera', 'safari', 'comet'].includes(potentialBrowser)) {
            targetBrowser = potentialBrowser === 'edge' ? 'bing' : potentialBrowser;
            urlToOpen = parts.slice(0, -1).join(' in ').trim();
          }
        }

        let finalUrl = urlToOpen;
        if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

        const browser = ctx.settings.browser;
        try {
          if (targetBrowser) {
            const exists = await invoke<boolean>('check_browser_exists', { browser: targetBrowser });
            if (exists) {
              await invoke('search_in_browser', { browser: targetBrowser, url: finalUrl });
            } else {
              if (browser === 'default' || !browser) {
                const { open } = await import('@tauri-apps/plugin-shell');
                await open(finalUrl);
              } else {
                await invoke('search_in_browser', { browser, url: finalUrl });
              }
            }
          } else {
            if (browser === 'default' || !browser) {
              const { open } = await import('@tauri-apps/plugin-shell');
              await open(finalUrl);
            } else {
              await invoke('search_in_browser', { browser, url: finalUrl });
            }
          }
        } catch (e) {
          console.error('Failed to open link:', e);
        }

        ctx.callbacks.clearState();
        return { type: 'handled' };
      }

      const selected = ctx.appSuggestions[ctx.activeAppIndex];
      if (selected) {
        await ctx.callbacks.launchApp(selected.name, selected.appId);
      } else {
        await ctx.callbacks.launchApp(targetApp, null);
      }
      ctx.callbacks.clearState();
      return { type: 'handled' };
    }

    return { type: 'continue' };
  }
};

// ── Tool 6: Default LLM Engine ────────────────────────────────────────────
export const llmSearchTool: AgentTool = {
  id: 'llm-search',
  name: 'AI Search Engine',
  description: 'Passes natural language to the LLM.',
  canHandle: () => true, // Fallback for all unhandled queries
  execute: async (ctx: AgentContext): Promise<ToolResult> => {
    const { settings, query } = ctx;
    const llmModel = settings.llmModel;
    const FREE_MODELS = ['free-model', 'models/gemini-1.5-flash'];
    const isFree = FREE_MODELS.includes(llmModel) || llmModel.startsWith('ollama:');

    const mapping = settings.modelProviderMap[llmModel];

    let apiKey = '';
    if (!isFree) {
      if (mapping?.provider === 'custom') {
        // Retrieve BYOK API key from custom providers list
        const customProvider = settings.customProviders.find((p: any) => p.baseUrl === mapping.baseUrl);
        apiKey = customProvider?.apiKey || '';
        if (!apiKey) {
          return { type: 'handled', error: `API Key for Custom Provider not found. Please check your settings.` };
        }
      } else {
        const provider = llmModel.includes('gemini') ? 'gemini' :
          llmModel.includes('gpt') ? 'openai' :
            llmModel.includes('grok') ? 'grok' :
              llmModel.includes('claude') ? 'claude' : 'openai';

        apiKey = (await getApiKey(provider)) || '';
        if (!apiKey) {
          return { type: 'handled', error: `API Key for ${provider.toUpperCase()} not found. Please add it in Settings.` };
        }
      }
    }

    // ReAct Loop System Prompt (Injected into user query)
    let systemPrompt = query;

    if (settings.enableFullConversationHistory && ctx.conversationHistory && ctx.conversationHistory.length > 0) {
      const historyStr = ctx.conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n\n');
      systemPrompt = `Conversation History:\n${historyStr}\n\nCurrent Request: ${query}`;
    } else if (ctx.prevQuery && ctx.prevAnswer) {
      systemPrompt = `Previous Request: ${ctx.prevQuery}\nPrevious Answer: ${ctx.prevAnswer}\n\nCurrent Request: ${query}`;
    }

    if (settings.enableTerminalMode) {
      systemPrompt = `You are Quickno, an Autonomous Windows OS Agent.
You have access to the following tools:

1. terminal: Runs PowerShell scripts on Windows to perform system tasks, manage files, control media, and automate the OS.

CRITICAL ARCHITECTURE RULES:
- Standardize execution on PowerShell core.
- DO NOT feed raw terminal output. You MUST append '| ConvertTo-Json -Compress' to your PowerShell commands when requesting data so that the output is structured JSON. Agents parse JSON significantly better than raw terminal text.
- Example: \`Get-Process | Select-Object Name, CPU | ConvertTo-Json -Compress\`

To use the terminal tool, you MUST respond ONLY with a JSON block in this exact format:
\`\`\`json
{
  "tool": "terminal",
  "command": "<powershell script here>"
}
\`\`\`
Do not include any other text. Just the JSON block.

If you do not need to use a tool, answer normally with Markdown.

${settings.enableFullConversationHistory && ctx.conversationHistory && ctx.conversationHistory.length > 0 ? `Conversation History:\n${ctx.conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n\n')}\n\n` : (ctx.prevQuery && ctx.prevAnswer ? `Previous Request: ${ctx.prevQuery}\nPrevious Answer: ${ctx.prevAnswer}\n\n` : '')}User Request: ${query}`;
    }

    const answer = await queryLlm(
      systemPrompt,
      llmModel,
      apiKey || '',
      mapping?.provider,
      mapping?.baseUrl,
      ctx.imageBase64,
      (tokenText) => {
        // Stream the text to the UI as it generates
        if (ctx.callbacks.streamAnswer) {
          ctx.callbacks.streamAnswer(tokenText);
        }
      }
    );

    // Unified Tool Parser (ReAct & UI Ghost Mode)
    const extractJson = (text: string) => {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (!match) return null;
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    };

    const parsedData = extractJson(answer);

    if (parsedData) {
      // 1. Ghost Mode UI Actions (Array of actions)
      if (Array.isArray(parsedData) && parsedData.length > 0 && parsedData[0].action) {
        ctx.callbacks.setAnswer(`Executing UI Automation (${parsedData.length} steps)...\n\n${answer.replace(/```(?:json)?\s*[\s\S]*?\s*```/i, '')}`);
        await executeUiActions(parsedData);
        ctx.callbacks.setAnswer(`UI Automation complete.\n\n${answer.replace(/```(?:json)?\s*[\s\S]*?\s*```/i, '')}`);
        return { type: 'handled' };
      }

      // 2. Terminal Agent Actions (Single object)
      if (settings.enableTerminalMode && !Array.isArray(parsedData) && parsedData.tool === 'terminal' && parsedData.command) {
        ctx.callbacks.setAnswer(`Executing autonomous action...\n\n\`\`\`bash\n${parsedData.command}\n\`\`\``);
        try {
          const result = await invoke<string>('execute_terminal_command', { command: parsedData.command });
          const displayResult = result.trim() || 'Action completed successfully.';
          ctx.callbacks.setAnswer(`**Action Complete:**\n\`\`\`bash\n${displayResult}\n\`\`\``);
        } catch (e: any) {
          ctx.callbacks.setAnswer(`**Action Failed:**\n\`\`\`bash\n${e.toString()}\n\`\`\``);
        }
        return { type: 'handled' };
      }
    }

    ctx.callbacks.setAnswer(answer);
    return { type: 'handled' };
  }
};
