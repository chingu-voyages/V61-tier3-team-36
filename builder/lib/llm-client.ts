import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_OPENAI_MODEL = "gpt-4o";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-pro";

export interface LLMClient {
  createMessage(opts: {
    systemPrompt: string;
    messages: Anthropic.MessageParam[];
    tools: Anthropic.Tool[];
    toolChoice: Anthropic.ToolChoiceAuto | Anthropic.ToolChoiceTool;
  }): Promise<Anthropic.Message>;
}

type Provider = "anthropic" | "openai" | "gemini";

// Shared types for the OpenAI-compatible request pipeline
interface OpenAIMessage {
  role: string;
  content?: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Shared implementation for OpenAI and Gemini.
 * Both providers support the OpenAI-compatible Chat Completions API.
 */
async function createOpenAICompatibleMessage(
  apiKey: string,
  provider: "openai" | "gemini",
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  toolChoice: Anthropic.ToolChoiceAuto | Anthropic.ToolChoiceTool
): Promise<Anthropic.Message> {
  const mappedMessages: OpenAIMessage[] = [];
  if (systemPrompt) {
    mappedMessages.push({ role: "system", content: systemPrompt });
  }

  for (const msg of messages) {
    if (typeof msg.content === "string") {
      mappedMessages.push({ role: msg.role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      let textContent = "";
      const toolCalls: NonNullable<OpenAIMessage["tool_calls"]> = [];
      const toolResults: OpenAIMessage[] = [];

      for (const block of msg.content) {
        if (block.type === "text") {
          textContent += block.text;
        } else if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id,
            type: "function",
            function: {
              name: block.name,
              arguments: typeof block.input === "string" ? block.input : JSON.stringify(block.input)
            }
          });
        } else if (block.type === "tool_result") {
          toolResults.push({
            role: "tool",
            tool_call_id: block.tool_use_id,
            name: "update_interview", // Preserved from original implementation
            content: typeof block.content === "string" ? block.content : JSON.stringify(block.content)
          });
        }
      }

      if (toolResults.length > 0) {
        for (const res of toolResults) {
          mappedMessages.push(res);
        }
      } else {
        const mappedMsg: OpenAIMessage = { role: msg.role };
        if (textContent) {
          mappedMsg.content = textContent;
        } else {
          mappedMsg.content = null;
        }
        if (toolCalls.length > 0) {
          mappedMsg.tool_calls = toolCalls;
        }
        mappedMessages.push(mappedMsg);
      }
    }
  }

  const mappedTools = tools?.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema
    }
  }));

  let tool_choice: "auto" | { type: "function"; function: { name: string } } = "auto";
  if (toolChoice && toolChoice.type === "tool") {
    tool_choice = {
      type: "function",
      function: { name: toolChoice.name }
    };
  }

  // Determine endpoint and model based on provider
  const url = provider === "gemini" 
    ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    : "https://api.openai.com/v1/chat/completions";

  const model = provider === "gemini" ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENAI_MODEL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: mappedMessages,
      tools: mappedTools,
      tool_choice
    })
  });

  const data = await response.json();

  console.error("Gemini/OpenAI response:", data);

  if (!response.ok) {
  throw new Error(
    JSON.stringify(data, null, 2)
  );
  }
  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error(`${provider} returned an empty choices list`);
  }

  // Map response back to Anthropic's output schemas
  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    const content: Anthropic.ContentBlockParam[] = choice.message.tool_calls.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
      type: "tool_use" as const,
      id: tc.id,
      name: tc.function.name,
      input: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments
    }));

    if (choice.message.content) {
      content.unshift({ type: "text" as const, text: choice.message.content });
    }

    return {
      id: data.id,
      type: "message" as const,
      role: "assistant" as const,
      content,
      model: data.model,
      stop_reason: "tool_use" as const,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 }
    } as Anthropic.Message;
  }

  return {
    id: data.id,
    type: "message" as const,
    role: "assistant" as const,
    content: [{ type: "text" as const, text: choice.message.content || "" }],
    model: data.model,
    stop_reason: "end_turn" as const,
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 }
  } as Anthropic.Message;
}

/**
 * Creates a unified LLM Client supporting Anthropic, OpenAI, and Google Gemini.
 * Detects provider based on the provider argument or automatically parses from API key format.
 * Uses native fetch for OpenAI and Gemini requests to maintain a zero-dependency architecture.
 */
export function createLLMClient(apiKey: string, provider: Provider = "anthropic"): LLMClient {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API key must not be empty");
  }

  // Auto-detect provider if it is default but key indicates another provider
  let resolvedProvider = provider;
  if (provider === "anthropic") {
    if (apiKey.startsWith("AIza")) {
      resolvedProvider = "gemini";
    } else if (apiKey.startsWith("sk-") && !apiKey.startsWith("sk-ant-")) {
      resolvedProvider = "openai";
    }
  }

  if (resolvedProvider === "openai" || resolvedProvider === "gemini") {
    return {
      async createMessage({ systemPrompt, messages, tools, toolChoice }) {
        return createOpenAICompatibleMessage(
          apiKey,
          resolvedProvider,
          systemPrompt,
          messages,
          tools,
          toolChoice
        );
      }
    };
  }

  // Default to Anthropic SDK
  const anthropic = new Anthropic({ apiKey });

  return {
    async createMessage({ systemPrompt, messages, tools, toolChoice }) {
      return anthropic.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools,
        tool_choice: toolChoice
      });
    }
  };
}