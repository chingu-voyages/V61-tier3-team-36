import Anthropic from "@anthropic-ai/sdk";
import type { ConversationMessage } from "./conversation";
import type { LLMClient } from "./llm-client";
import { LLMClient } from "./llm-client";
import { SPEC_SECTIONS } from "./spec-sections";

const EMIT_SPEC_TOOL: Anthropic.Tool = {
  name: "emit_spec",
  description:
    "Emits the final project specification as Markdown plus structured sections.",
  description: "Emits the final specification document based on the completed interview transcript.",
  input_schema: {
    type: "object",
    properties: {
      markdown: {
        type: "string",
        description: "A complete human-readable Markdown specification.",
      },
      sections: {
        type: "object",
        description:
          "Machine-readable spec content keyed by the required section ids.",
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

export interface GeneratedSpec {
  markdown: string;
  sections: Record<string, unknown>;
}

function buildSystemPrompt() {
  const sectionGuidance = SPEC_SECTIONS.map(
    (section) =>
      `- ${section.label} (id: ${section.id}): ${section.description}`
  ).join("\n");

  return `You are an expert product specification writer.

Turn the stored interview transcript into a complete implementation-ready project specification.

Required sections:
${sectionGuidance}

Instructions:
- Use only information supported by the transcript.
- Keep open questions explicit instead of inventing answers.
- You MUST call the emit_spec tool.
- The sections object MUST be keyed by the required section ids.
- The markdown should be readable as a standalone PRD/spec.`;
export interface SpecOutput {
  markdown: string;
  sections: Record<string, string>;
}

export async function generateSpec(
  client: LLMClient,
  messages: readonly ConversationMessage[]
): Promise<GeneratedSpec> {
  const response = await client.createMessage({
    systemPrompt: buildSystemPrompt(),
    messages: [...messages],
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
    markdown?: unknown;
    sections?: unknown;
  };

  if (
    typeof toolInput.markdown !== "string" ||
    toolInput.markdown.trim() === "" ||
    !toolInput.sections ||
    typeof toolInput.sections !== "object" ||
    Array.isArray(toolInput.sections)
  ) {
    throw new Error(
      "Model returned malformed tool input. Expected 'markdown' and 'sections'."
    );
    markdown?: string;
    sections?: Record<string, string>;
  };

  if (!toolInput.markdown || !toolInput.sections) {
    throw new Error("Model returned malformed tool input. Expected 'markdown' and 'sections'.");
  }

  return {
    markdown: toolInput.markdown,
    sections: toolInput.sections as Record<string, unknown>,
  };
}
    sections: toolInput.sections,
  };
}
