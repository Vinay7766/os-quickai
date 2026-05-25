import { AgentTool, AgentContext, ToolResult } from './types';

export class ToolRegistry {
  private tools: AgentTool[] = [];

  register(tool: AgentTool) {
    this.tools.push(tool);
  }

  getTools() {
    return this.tools;
  }

  async processQuery(ctx: AgentContext): Promise<ToolResult> {
    for (const tool of this.tools) {
      const canHandle = await tool.canHandle(ctx);
      if (canHandle) {
        const result = await tool.execute(ctx);
        if (result.type === 'intercepted' || result.type === 'handled') {
          return result;
        }
        // If 'continue', proceed to the next tool
      }
    }

    return { type: 'continue' };
  }
}

export const globalToolRegistry = new ToolRegistry();
