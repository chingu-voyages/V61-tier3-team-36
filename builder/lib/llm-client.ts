import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-sonnet-4-6";

export interface LLMClient {
  createMessage(opts: {
    systemPrompt: string;
    messages: Anthropic.MessageParam[];
    tools: Anthropic.Tool[];
    toolChoice: Anthropic.ToolChoiceAuto | Anthropic.ToolChoiceTool;
  }): Promise<Anthropic.Message>;
}

export function createLLMClient(apiKey: string): LLMClient {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API key must not be empty");
  }

  const anthropic = new Anthropic({ apiKey });

  return {
    async createMessage({ systemPrompt, messages, tools, toolChoice }) {
      return anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools,
        tool_choice: toolChoice,
      });
    },
  };
}