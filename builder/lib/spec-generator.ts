import Anthropic from "@anthropic-ai/sdk";
import { LLMClient } from "./llm-client";
import { SPEC_SECTIONS } from "./spec-sections";

const EMIT_SPEC_TOOL: Anthropic.Tool = {
  name: "emit_spec",
  description: "Emits the final specification document based on the completed interview transcript.",
  input_schema: {
    type: "object",
    properties: {
      markdown: {
        type: "string",
        description: "The complete specification rendered as a Markdown document.",
      },
      sections: {
        type: "object",
        description: "A structured object with all seven spec sections keyed by section id.",
        properties: Object.fromEntries(
          SPEC_SECTIONS.map((s) => [s.id, { type: "string" }])
        ),
        required: SPEC_SECTIONS.map((s) => s.id),
      },
    },
    required: ["markdown", "sections"],
  },
};

export interface SpecOutput {
  markdown: string;
  sections: Record<string, string>;
}

export async function generateSpec(
  client: LLMClient,
  messages: Anthropic.MessageParam[]
): Promise<SpecOutput> {
  const response = await client.createMessage({
    systemPrompt:
      "You are an expert technical writer. Based on the completed interview transcript, generate a comprehensive specification document. Use the emit_spec tool to return both a Markdown document and a structured sections object.",
    messages,
    tools: [EMIT_SPEC_TOOL],
    toolChoice: { type: "tool", name: "emit_spec" },
  });

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === "emit_spec"
  );

  if (!toolUseBlock) {
    throw new Error("Model failed to return the structured tool call 'emit_spec'.");
  }

  const toolInput = toolUseBlock.input as {
    markdown?: string;
    sections?: Record<string, string>;
  };

  if (!toolInput.markdown || !toolInput.sections) {
    throw new Error("Model returned malformed tool input. Expected 'markdown' and 'sections'.");
  }

  return {
    markdown: toolInput.markdown,
    sections: toolInput.sections,
  };
}