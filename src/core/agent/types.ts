export interface AgentContext {
  query: string;
  mode: string;
  settings: any;
  appSuggestions: any[];
  activeAppIndex: number;
  isConfirmed?: boolean;
  imageBase64?: string;
  callbacks: {
    setAnswer: (a: string) => void;
    setInternalUrl: (url: string | null) => void;
    setPendingCommand: (cmd: string, mode: string, reason: string) => void;
    launchApp: (name: string, appId: string | null) => Promise<void>;
    clearState: () => void;
  };
}

export type ToolResultType = 'intercepted' | 'handled' | 'continue';

export interface ToolResult {
  type: ToolResultType;
  answer?: string;
  error?: string;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  
  /**
   * Determine if this tool should handle the query.
   * Return true to execute it. Return false to skip.
   */
  canHandle: (ctx: AgentContext) => boolean | Promise<boolean>;
  
  /**
   * Execute the tool.
   * If it returns 'intercepted', the pipeline stops and waits for user confirmation (e.g., security check).
   * If it returns 'handled', the pipeline stops successfully.
   * If it returns 'continue', the pipeline moves to the next tool.
   */
  execute: (ctx: AgentContext) => Promise<ToolResult>;
}
