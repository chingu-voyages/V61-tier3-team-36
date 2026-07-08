import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

export interface LLMClient {
  createMessage(opts: {
    systemPrompt: string;
    messages: Anthropic.MessageParam[];
    tools: Anthropic.Tool[];
    toolChoice: Anthropic.ToolChoiceAuto | Anthropic.ToolChoiceTool;
  }): Promise<Anthropic.Message>;
}

/**
 * Creates a unified LLM Client supporting both Anthropic and OpenAI.
 * Detects provider based on the provider argument or automatically parses from API key format.
 * Uses native fetch for OpenAI requests to maintain a zero-dependency architecture.
 */
export function createLLMClient(apiKey: string, provider: "anthropic" | "openai" = "anthropic"): LLMClient {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API key must not be empty");
  }

  // Auto-detect provider if it is default but key indicates OpenAI
  let resolvedProvider = provider;
  if (apiKey.startsWith("sk-") && !apiKey.startsWith("sk-ant-")) {
    resolvedProvider = "openai";
  }

  if (resolvedProvider === "openai") {
    return {
      async createMessage({ systemPrompt, messages, tools, toolChoice }) {
        // Map system prompt and conversation messages to OpenAI format
        const mappedMessages: any[] = [];
        if (systemPrompt) {
          mappedMessages.push({ role: "system", content: systemPrompt });
        }

        for (const msg of messages) {
          if (typeof msg.content === "string") {
            mappedMessages.push({ role: msg.role, content: msg.content });
          } else if (Array.isArray(msg.content)) {
            let textContent = "";
            const toolCalls: any[] = [];
            const toolResults: any[] = [];

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
                  name: "update_interview",
                  content: typeof block.content === "string" ? block.content : JSON.stringify(block.content)
                });
              }
            }

            if (toolResults.length > 0) {
              for (const res of toolResults) {
                mappedMessages.push(res);
              }
            } else {
              const mappedMsg: any = { role: msg.role };
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

        // Map tools
        const mappedTools = tools?.map((t) => ({
          type: "function" as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema
          }
        }));

        // Map tool choice
        let tool_choice: any = "auto";
        if (toolChoice && toolChoice.type === "tool") {
          tool_choice = {
            type: "function",
            function: { name: toolChoice.name }
          };
        }

        // Send native HTTP request to OpenAI completions endpoint
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: DEFAULT_OPENAI_MODEL,
            messages: mappedMessages,
            tools: mappedTools,
            tool_choice
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "OpenAI API request failed");
        }

        const choice = data.choices?.[0];
        if (!choice) {
          throw new Error("OpenAI returned an empty choices list");
        }

        // Map OpenAI's message response back to Anthropic's output schemas
        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
          const content: any[] = choice.message.tool_calls.map((tc: any) => ({
            type: "tool_use" as const,
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments)
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